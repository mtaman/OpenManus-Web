"""
Run router providing task submission, job inspection, and lifecycle cancellation.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Path as PathParam

from omweb.job_manager import job_manager
from omweb.models import Job, JobStatus, RunRequest

router = APIRouter()


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
