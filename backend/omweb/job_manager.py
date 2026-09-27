import time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class Job(BaseModel):
    id: str
    status: str = "running"
    prompt: str = ""
    created_at: float = Field(default_factory=time.time)
    events: List[Dict[str, Any]] = Field(default_factory=list)
    result: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "status": self.status,
            "prompt": self.prompt,
            "created_at": self.created_at,
            "events": self.events,
            "result": self.result,
            "error": self.error
        }

class JobManager:
    def __init__(self):
        self._jobs: Dict[str, Job] = {}

    def create_job(self, job_id: str, prompt: str = "") -> Job:
        job = Job(id=job_id, prompt=prompt)
        self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def append_event(self, job_id: str, event: Dict[str, Any]) -> None:
        job = self._jobs.get(job_id)
        if job:
            job.events.append(event)

    def update_status(self, job_id: str, status: str, result: Optional[str] = None, error: Optional[str] = None) -> None:
        job = self._jobs.get(job_id)
        if job:
            job.status = status
            if result is not None:
                job.result = result
            if error is not None:
                job.error = error

    def complete_job(self, job_id: str, result: Optional[str] = None) -> None:
        """Marks the job as completed with the given result text."""
        self.update_status(job_id, status="completed", result=result)

    def fail_job(self, job_id: str, error: Optional[str] = None) -> None:
        """Marks the job as failed with the given error message."""
        self.update_status(job_id, status="failed", error=error)

    def list_jobs(self) -> List[Dict[str, Any]]:
        return [job.to_dict() for job in sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)]

job_manager = JobManager()