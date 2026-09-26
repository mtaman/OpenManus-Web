import os
import json
import asyncio
from pathlib import Path
from io import BytesIO
import zipfile
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from omweb.job_manager import job_manager
from omweb.config import get_workspace_root
from omweb.sse_events import subscribe_events, SSEEventType
from omweb.agent_bridge import run_instrumented, human_answers, human_data
from omweb.project_manager import project_manager

router = APIRouter()

class RunRequest(BaseModel):
    prompt: str

class FeedbackRequest(BaseModel):
    response: str

@router.post("")
@router.post("/")
async def start_run(req: RunRequest, background_tasks: BackgroundTasks):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    import uuid
    generated_job_id = f"job_{uuid.uuid4().hex[:12]}"
    try:
        job = job_manager.create_job(generated_job_id, prompt=prompt)
    except TypeError:
        job = job_manager.create_job(generated_job_id)
        if hasattr(job, "prompt"):
            job.prompt = prompt

    actual_job_id = getattr(job, "id", generated_job_id)
    background_tasks.add_task(run_instrumented, actual_job_id, prompt)
    
    chat_id = f"chat_{uuid.uuid4().hex[:10]}"
    try:
        project_manager.save_chat_session(
            chat_id=chat_id,
            project_id="default_project",
            title=prompt[:30],
            job_id=actual_job_id,
            prompt=prompt,
            events=[],
            result="",
            status="running"
        )
    except Exception:
        pass

    return {"job_id": actual_job_id, "status": getattr(job, "status", "running"), "chat_id": chat_id}

@router.get("/jobs")
@router.get("/jobs/")
async def list_jobs():
    return {"jobs": job_manager.list_jobs()}

@router.get("/jobs/{job_id}")
async def get_job_detail(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if hasattr(job, "to_dict"):
        return job.to_dict()
    elif isinstance(job, dict):
        return job
    return {
        "id": getattr(job, "id", job_id),
        "status": getattr(job, "status", "unknown"),
        "prompt": getattr(job, "prompt", ""),
        "events": getattr(job, "events", [])
    }

@router.get("/jobs/{job_id}/stream")
async def stream_job_events(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        collected_events = []
        def persist_state(status_str="running"):
            try:
                chats = project_manager.list_chats()
                target = next((c for c in chats if c.get("job_id") == job_id), None)
                c_id = target.get("id") if target else f"chat_{job_id}"
                p_id = target.get("project_id") if target else "default_project"
                prompt_val = getattr(job, "prompt", target.get("prompt", "") if target else "")
                
                project_manager.save_chat_session(
                    chat_id=c_id,
                    project_id=p_id,
                    title=prompt_val[:30] if prompt_val else job_id,
                    job_id=job_id,
                    prompt=prompt_val,
                    events=collected_events,
                    result="",
                    status=status_str
                )
            except Exception:
                pass

        for ev in getattr(job, "events", []):
            ev_type = getattr(ev, "type", "message")
            if hasattr(ev_type, "value"): ev_type = ev_type.value
            ev_data = ev.to_json() if hasattr(ev, "to_json") else json.dumps({"content": str(ev)}, ensure_ascii=False)
            collected_events.append({"type": str(ev_type), "data": json.loads(ev_data) if ev_data.startswith("{") else ev_data})
            yield {"event": str(ev_type), "data": ev_data}

        async for event in subscribe_events(job_id):
            if hasattr(event, "type"):
                ev_type = event.type.value if hasattr(event.type, "value") else str(event.type)
                ev_data = event.to_json() if hasattr(event, "to_json") else str(event.data)
                try: parsed = json.loads(ev_data)
                except: parsed = {"content": ev_data}
                collected_events.append({"type": str(ev_type), "data": parsed})
                is_term = str(ev_type).lower() in ["final", "error", "done"]
                persist_state("completed" if is_term else "running")
                yield {"event": str(ev_type), "data": ev_data}
                if is_term: break
            elif isinstance(event, str):
                collected_events.append({"type": "message", "data": event})
                persist_state("running")
                yield {"event": "message", "data": event}

        persist_state("completed")

    return EventSourceResponse(event_generator(), headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
