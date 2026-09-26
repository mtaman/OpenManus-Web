import uuid
import json
import asyncio
import time
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from omweb.sse_events import subscribe_events, dispatch_event, SSEEvent, SSEEventType
from omweb.agent_bridge import run_instrumented, human_answers, human_data, active_tasks
from omweb.job_manager import job_manager
from omweb.config import get_workspace_root, resolve_openmanus_root
from omweb.fs_utils import TRASH_DIR_NAME

router = APIRouter()

class RunRequest(BaseModel):
    prompt: str
    max_steps: Optional[int] = 20

class HumanAnswerRequest(BaseModel):
    answer: str

@router.post("")
@router.post("/")
async def create_run(payload: RunRequest, background_tasks: BackgroundTasks):
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    job_manager.create_job(job_id=job_id, prompt=payload.prompt)
    task = asyncio.create_task(run_instrumented(job_id, payload.prompt))
    active_tasks[job_id] = task
    return {"job_id": job_id, "status": "pending"}

@router.get("/jobs")
async def get_all_jobs():
    jobs = job_manager.list_jobs()
    return {"jobs": [j.model_dump() for j in jobs]}

@router.get("/jobs/{job_id}")
async def get_job_details(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.model_dump()

@router.post("/jobs/{job_id}/stop")
async def stop_job(job_id: str):
    if job_id in active_tasks:
        active_tasks[job_id].cancel()
        del active_tasks[job_id]
    await dispatch_event(job_id, SSEEvent(type=SSEEventType.ERROR, step=0, data={"message": "Job stopped by user"}))
    job_manager.fail_job(job_id, "Aborted by user.")
    return {"job_id": job_id, "status": "aborted"}

@router.post("/jobs/{job_id}/respond")
async def respond_to_human(job_id: str, payload: HumanAnswerRequest):
    human_data[job_id] = payload.answer
    if job_id in human_answers:
        human_answers[job_id].set()
        return {"job_id": job_id, "status": "answered"}
    return {"job_id": job_id, "status": "pending_or_expired"}

@router.get("/jobs/{job_id}/files")
async def get_job_files(job_id: str):
    """Retrieve output files produced in the active engine workspace strictly for this job."""
    ws = get_workspace_root().resolve()
    if not ws.exists():
        return {"job_id": job_id, "files": []}
    
    job = job_manager.get_job(job_id)
    ref_time = job.created_at if job else (time.time() - 3600.0)
    # Generous tolerance to prevent dropping files on Windows NTFS timestamps
    min_time = ref_time - 120.0
    
    task_files = []
    for item in ws.rglob("*"):
        if item.is_file() and TRASH_DIR_NAME not in item.parts:
            mtime = item.stat().st_mtime
            if mtime >= min_time:
                rel_path = str(item.relative_to(ws)).replace("\\", "/")
                task_files.append({
                    "name": item.name,
                    "path": rel_path,
                    "size": item.stat().st_size,
                    "modified": int(mtime)
                })
                
    task_files.sort(key=lambda x: x["modified"], reverse=True)
    return {"job_id": job_id, "files": task_files}

@router.get("/jobs/{job_id}/stream")
async def stream_job_events(job_id: str):
    return StreamingResponse(
        subscribe_events(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream; charset=utf-8",
        }
    )