import json
import time
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

BACKEND_DIR = Path(__file__).resolve().parent.parent
JOBS_FILE = BACKEND_DIR / "jobs.json"
JOBS_BAK_FILE = BACKEND_DIR / "jobs.json.bak"

class JobRecord(BaseModel):
    job_id: str
    prompt: str
    status: str = "running"
    created_at: float
    updated_at: float
    steps_count: int = 0
    final_result: Optional[str] = None
    error: Optional[str] = None
    events: List[Dict[str, Any]] = []

class JobManager:
    def __init__(self):
        self._jobs: Dict[str, JobRecord] = {}
        self._load_jobs()

    def _load_jobs(self) -> None:
        if JOBS_FILE.exists():
            try:
                with open(JOBS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        job = JobRecord(**item)
                        self._jobs[job.job_id] = job
            except Exception:
                if JOBS_BAK_FILE.exists():
                    try:
                        with open(JOBS_BAK_FILE, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            for item in data:
                                job = JobRecord(**item)
                                self._jobs[job.job_id] = job
                    except Exception:
                        self._jobs = {}

    def _persist(self) -> None:
        try:
            records = [job.model_dump() for job in self._jobs.values()]
            tmp_file = JOBS_FILE.with_suffix(".tmp")
            with open(tmp_file, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2, ensure_ascii=False)
            
            if JOBS_FILE.exists():
                shutil.copyfile(JOBS_FILE, JOBS_BAK_FILE)
            shutil.move(str(tmp_file), str(JOBS_FILE))
        except Exception as e:
            print(f"[JobManager] Persistence error: {e}")

    def create_job(self, job_id: str, prompt: str) -> JobRecord:
        now = time.time()
        job = JobRecord(
            job_id=job_id,
            prompt=prompt,
            status="running",
            created_at=now,
            updated_at=now,
            steps_count=1,
            events=[]
        )
        self._jobs[job_id] = job
        self._persist()
        return job

    def append_event(self, job_id: str, event_data: Dict[str, Any]) -> None:
        if job_id in self._jobs:
            job = self._jobs[job_id]
            job.events.append(event_data)
            job.updated_at = time.time()
            if event_data.get("type") == "step_start":
                job.steps_count = max(job.steps_count, event_data.get("step", 1))
            self._persist()

    def complete_job(self, job_id: str, final_result: str) -> None:
        if job_id in self._jobs:
            job = self._jobs[job_id]
            job.status = "completed"
            job.final_result = final_result
            job.updated_at = time.time()
            self._persist()

    def fail_job(self, job_id: str, error_message: str) -> None:
        if job_id in self._jobs:
            job = self._jobs[job_id]
            job.status = "failed"
            job.error = error_message
            job.updated_at = time.time()
            self._persist()

    def get_job(self, job_id: str) -> Optional[JobRecord]:
        return self._jobs.get(job_id)

    def list_jobs(self) -> List[JobRecord]:
        return sorted(list(self._jobs.values()), key=lambda j: j.created_at, reverse=True)

job_manager = JobManager()