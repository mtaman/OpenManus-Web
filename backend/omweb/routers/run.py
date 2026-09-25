import uuid
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from sse_starlette.sse import EventSourceResponse

from omweb.sse_events import subscribe_events, dispatch_event, SSEEvent, SSEEventType
from omweb.agent_bridge import run_agent_job
from omweb.job_manager import job_manager

router = APIRouter()

class RunRequest(BaseModel):
    prompt: str
    max_steps: Optional[int] = 20

@router.post("")
async def create_run(payload: RunRequest, background_tasks: BackgroundTasks):
    """Create a new autonomous execution run."""
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    job_manager.create_job(job_id=job_id, prompt=payload.prompt)
    background_tasks.add_task(run_agent_job, job_id, payload.prompt, payload.max_steps or 20)
    return {"job_id": job_id, "status": "pending"}

@router.get("/jobs")
async def get_all_jobs():
    """Retrieve full history of jobs."""
    jobs = job_manager.list_jobs()
    return {"jobs": [j.model_dump() for j in jobs]}

@router.get("/jobs/{job_id}")
async def get_job_details(job_id: str):
    """Retrieve specific job details for state replay."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.model_dump()

@router.post("/jobs/{job_id}/rerun")
async def rerun_job(job_id: str, background_tasks: BackgroundTasks):
    """Re-run a historical job with the same prompt."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    new_job_id = f"job_{uuid.uuid4().hex[:12]}"
    job_manager.create_job(job_id=new_job_id, prompt=job.prompt)
    background_tasks.add_task(run_agent_job, new_job_id, job.prompt, 20)
    return {"job_id": new_job_id, "status": "pending", "original_job_id": job_id}

@router.get("/jobs/{job_id}/stream")
async def stream_job_events(job_id: str):
    """Stream live execution events via SSE."""
    async def event_generator():
        try:
            async for sse_event in subscribe_events(job_id):
                # Record to persistent job log
                job_manager.append_event(job_id, {
                    "type": sse_event.type.value,
                    "step": sse_event.step,
                    "data": sse_event.data
                })

                if sse_event.type == SSEEventType.FINAL:
                    job_manager.complete_job(job_id, sse_event.data.get("result", ""))
                elif sse_event.type == SSEEventType.ERROR:
                    job_manager.fail_job(job_id, sse_event.data.get("message", "Error occurred"))

                yield {
                    "event": sse_event.type.value,
                    "data": sse_event.to_json()
                }
        except asyncio.CancelledError:
            pass

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )