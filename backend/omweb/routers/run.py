"""
Run router providing task submission, job inspection, lifecycle cancellation,
and real-time SSE streaming.
"""

import asyncio
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Path as PathParam, BackgroundTasks
from sse_starlette.sse import EventSourceResponse

from omweb.agent_bridge import run_agent_job
from omweb.job_manager import job_manager
from omweb.models import Job, JobStatus, RunRequest
from omweb.sse_events import job_event_generator

router = APIRouter()


@router.post("", response_model=Job)
async def create_and_run_task(request: RunRequest, background_tasks: BackgroundTasks) -> Job:
    """
    Creates a new agent job and initiates async execution in the background.
    """
    job = await job_manager.create_job(
        prompt=request.prompt,
        metadata={
            "model_override": request.model_override,
            "max_steps": request.max_steps or 30
        }
    )

    # Dispatch background execution
    background_tasks.add_task(
        run_agent_job,
        job_id=job.id,
        prompt=request.prompt,
        max_steps=request.max_steps or 30
    )

    return job


@router.get("/jobs", response_model=List[Job])
async def get_all_jobs() -> List[Job]:
    """Retrieves all tracked jobs ordered by newest first."""
    return job_manager.list_jobs()


@router.get("/jobs/{job_id}", response_model=Job)
async def get_job_by_id(job_id: str = PathParam(..., description="Target Job ID")) -> Job:
    """Retrieves details and steps for a specific job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/jobs/{job_id}/stream")
async def stream_job_events(job_id: str = PathParam(..., description="Target Job ID")):
    """
    Streams live agent steps and state updates using Server-Sent Events (SSE).
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return EventSourceResponse(
        job_event_generator(job_id),
        media_type="text/event-stream"
    )


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str = PathParam(..., description="Target Job ID")) -> Dict[str, Any]:
    """Cancels an active or pending job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel a job with status: {job.status.value}")

    updated = await job_manager.update_status(job_id, JobStatus.CANCELLED, error_message="Cancelled by user")
    return {"status": "ok", "job_id": job_id, "job_status": updated.status.value if updated else "cancelled"}
