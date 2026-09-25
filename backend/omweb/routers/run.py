from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uuid
from typing import Dict, Any

from omweb.agent_bridge import run_agent_job
from omweb.sse_events import job_event_generator

router = APIRouter()

JOBS_DB: Dict[str, Any] = {}

class RunRequest(BaseModel):
    prompt: str = ""
    max_steps: int = 20

@router.post("")
async def start_job(payload: RunRequest, background_tasks: BackgroundTasks):
    job_id = f"job_{uuid.uuid4().hex[:12]}"

    JOBS_DB[job_id] = {
        "job_id": job_id,
        "prompt": payload.prompt,
        "status": "running",
    }

    # Dispatch agent execution in background task
    background_tasks.add_task(run_agent_job, job_id, payload.prompt, payload.max_steps)

    return {"job_id": job_id, "id": job_id, "status": "running"}

@router.get("/jobs")
async def list_jobs():
    return list(JOBS_DB.values())

@router.get("/jobs/{job_id}/stream")
async def stream_job_events(job_id: str, request: Request):
    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }

    async def event_publisher():
        async for chunk in job_event_generator(job_id, request):
            if "comment" in chunk:
                yield f": {chunk['comment']}\n\n"
            else:
                event_type = chunk.get("event", "message")
                data_str = chunk.get("data", "{}")
                yield f"event: {event_type}\ndata: {data_str}\n\n"

    return StreamingResponse(event_publisher(), media_type="text/event-stream", headers=headers)