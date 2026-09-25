import uuid
import asyncio
import time
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from omweb.sse_events import subscribe_events, dispatch_event, SSEEvent, SSEEventType
from omweb.agent_bridge import run_agent_job
from omweb.job_manager import job_manager
from omweb.config import WORKSPACE_ROOT
from omweb.fs_utils import TRASH_DIR_NAME

router = APIRouter()

class RunRequest(BaseModel):
    prompt: str
    max_steps: Optional[int] = 20

@router.post("")
async def create_run(payload: RunRequest, background_tasks: BackgroundTasks):
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    job_manager.create_job(job_id=job_id, prompt=payload.prompt)
    background_tasks.add_task(run_agent_job, job_id, payload.prompt, payload.max_steps or 20)
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

@router.get("/jobs/{job_id}/files")
async def get_job_files(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    ws = WORKSPACE_ROOT.resolve()
    if not ws.exists():
        return {"job_id": job_id, "files": []}

    job_start = job.created_at - 5.0
    job_end = (job.updated_at + 10.0) if job.status in ("completed", "failed") else time.time() + 3600

    task_files = []
    for item in ws.rglob("*"):
        if item.is_file() and TRASH_DIR_NAME not in item.parts:
            mtime = item.stat().st_mtime
            if job_start <= mtime <= job_end:
                rel_path = str(item.relative_to(ws)).replace("\\", "/")
                task_files.append({
                    "name": item.name,
                    "path": rel_path,
                    "isDir": False,
                    "size": item.stat().st_size,
                    "modified": int(mtime)
                })

    return {"job_id": job_id, "files": task_files}

@router.post("/jobs/{job_id}/rerun")
async def rerun_job(job_id: str, background_tasks: BackgroundTasks):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    new_job_id = f"job_{uuid.uuid4().hex[:12]}"
    job_manager.create_job(job_id=new_job_id, prompt=job.prompt)
    background_tasks.add_task(run_agent_job, new_job_id, job.prompt, 20)
    return {"job_id": new_job_id, "status": "pending", "original_job_id": job_id}

@router.get("/jobs/{job_id}/stream")
async def stream_job_events(job_id: str):
    async def event_generator():
        try:
            async for sse_event in subscribe_events(job_id):
                job_manager.append_event(job_id, {
                    "type": sse_event.type.value,
                    "step": sse_event.step,
                    "data": sse_event.data
                })

                if sse_event.type == SSEEventType.FINAL:
                    job_manager.complete_job(job_id, sse_event.data.get("result", ""))
                elif sse_event.type == SSEEventType.ERROR:
                    job_manager.fail_job(job_id, sse_event.data.get("message", "Error occurred"))

                payload = sse_event.to_json()
                yield f"event: {sse_event.type.value}\ndata: {payload}\n\n"
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream; charset=utf-8",
        }
    )