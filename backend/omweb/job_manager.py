"""
JobManager singleton handling task lifecycle, event queues, and atomic persistence.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from omweb.models import Job, JobEvent, JobStatus, JobStep, StepType

logger = logging.getLogger("omweb.job_manager")

JOBS_FILE = Path(r"D:\AI\OpenManus-Web\backend\jobs.json")
JOBS_BAK_FILE = Path(r"D:\AI\OpenManus-Web\backend\jobs.json.bak")
JOBS_TMP_FILE = Path(r"D:\AI\OpenManus-Web\backend\jobs.json.tmp")
MAX_MEMORY_JOBS = 500


class JobManager:
    def __init__(self, storage_path: Path = JOBS_FILE):
        self.storage_path = storage_path
        self._jobs: Dict[str, Job] = {}
        self._queues: Dict[str, List[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def initialize(self) -> None:
        """Loads persistent jobs from disk on application startup."""
        await self.load_from_disk()

    async def load_from_disk(self) -> None:
        """Reads persisted jobs from disk into memory."""
        if not self.storage_path.exists():
            if JOBS_BAK_FILE.exists():
                logger.warning("Main jobs.json not found, recovering from backup...")
                target = JOBS_BAK_FILE
            else:
                self._jobs = {}
                return
        else:
            target = self.storage_path

        try:
            with open(target, "r", encoding="utf-8") as f:
                data = json.load(f)
                self._jobs = {k: Job.model_validate(v) for k, v in data.items()}
                logger.info(f"Loaded {len(self._jobs)} jobs from disk.")
        except Exception as e:
            logger.error(f"Failed to load jobs from disk: {e}")
            if target != JOBS_BAK_FILE and JOBS_BAK_FILE.exists():
                try:
                    with open(JOBS_BAK_FILE, "r", encoding="utf-8") as bf:
                        data = json.load(bf)
                        self._jobs = {k: Job.model_validate(v) for k, v in data.items()}
                        logger.info("Successfully recovered jobs from backup file.")
                except Exception as be:
                    logger.critical(f"Backup recovery also failed: {be}")
                    self._jobs = {}
            else:
                self._jobs = {}

    def _persist_to_disk_sync(self) -> None:
        """Synchronously and atomically persists memory state to disk."""
        data_to_save = {k: v.model_dump(mode="json") for k, v in self._jobs.items()}
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write to temporary file first
        with open(JOBS_TMP_FILE, "w", encoding="utf-8") as f:
            json.dump(data_to_save, f, indent=2, default=str)
            f.flush()

        # Backup existing file if present
        if self.storage_path.exists():
            try:
                self.storage_path.replace(JOBS_BAK_FILE)
            except Exception as e:
                logger.warning(f"Could not update backup file: {e}")

        # Atomic replace tmp to target
        JOBS_TMP_FILE.replace(self.storage_path)

    async def persist_to_disk(self) -> None:
        """Saves memory state to disk asynchronously."""
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._persist_to_disk_sync)

    async def create_job(self, prompt: str, metadata: Optional[Dict[str, Any]] = None) -> Job:
        """Creates a new job and queues it."""
        async with self._lock:
            # Enforce max in-memory jobs limit
            if len(self._jobs) >= MAX_MEMORY_JOBS:
                sorted_jobs = sorted(self._jobs.values(), key=lambda j: j.created_at)
                oldest_id = sorted_jobs[0].id
                del self._jobs[oldest_id]
                self._queues.pop(oldest_id, None)

            job_id = f"job_{uuid.uuid4().hex[:12]}"
            job = Job(
                id=job_id,
                prompt=prompt,
                status=JobStatus.PENDING,
                metadata=metadata or {}
            )
            self._jobs[job_id] = job
            self._queues[job_id] = []
            await self.persist_to_disk()
            return job

    def get_job(self, job_id: str) -> Optional[Job]:
        """Fetches a job by ID from memory."""
        return self._jobs.get(job_id)

    def list_jobs(self) -> List[Job]:
        """Lists all tracked jobs sorted by creation date descending."""
        return sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)

    async def update_status(self, job_id: str, status: JobStatus, error_message: Optional[str] = None) -> Optional[Job]:
        """Updates job status and completion timestamp."""
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None

            job.status = status
            job.updated_at = datetime.now(timezone.utc)
            if status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
                job.completed_at = datetime.now(timezone.utc)
            if error_message:
                job.error_message = error_message

            await self.broadcast_event(job_id, "status_change", {
                "status": status.value,
                "error_message": error_message
            })
            await self.persist_to_disk()
            return job

    async def add_step(self, job_id: str, step_type: StepType, content: Optional[str] = None, data: Optional[Dict[str, Any]] = None) -> Optional[JobStep]:
        """Appends a new execution step to a job."""
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None

            step = JobStep(
                step_id=f"step_{uuid.uuid4().hex[:8]}",
                step_type=step_type,
                content=content,
                data=data
            )
            job.steps.append(step)
            job.updated_at = datetime.now(timezone.utc)

            await self.broadcast_event(job_id, "step", step.model_dump(mode="json"))
            await self.persist_to_disk()
            return step

    def register_queue(self, job_id: str) -> asyncio.Queue:
        """Registers a new listener queue for SSE events on a job."""
        q: asyncio.Queue = asyncio.Queue()
        if job_id not in self._queues:
            self._queues[job_id] = []
        self._queues[job_id].append(q)
        return q

    def unregister_queue(self, job_id: str, q: asyncio.Queue) -> None:
        """Removes a listener queue for a job."""
        if job_id in self._queues and q in self._queues[job_id]:
            self._queues[job_id].remove(q)

    async def broadcast_event(self, job_id: str, event_type: str, payload: Dict[str, Any]) -> None:
        """Broadcasts an event to all active SSE queues for a specific job."""
        event = JobEvent(job_id=job_id, event_type=event_type, payload=payload)
        for q in self._queues.get(job_id, []):
            await q.put(event)


# Global Singleton Instance
job_manager = JobManager()
