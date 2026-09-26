import os
import json
import asyncio
import mimetypes
from pathlib import Path
from io import BytesIO
import zipfile
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from typing import Optional

from omweb.job_manager import job_manager
from omweb.sse_events import subscribe_events, SSEEventType
from omweb.agent_bridge import run_instrumented
from omweb.project_manager import project_manager

router = APIRouter()

class RunRequest(BaseModel):
    prompt: str
    project_id: Optional[str] = "default_project"
    max_steps: Optional[int] = 30

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
    chat_id = f"chat_{uuid.uuid4().hex[:10]}"
    
    project_manager.save_chat_session(
        chat_id=chat_id,
        project_id=req.project_id or "default_project",
        title=prompt[:40],
        job_id=actual_job_id,
        prompt=prompt,
        events=[],
        result="",
        status="running"
    )

    background_tasks.add_task(run_instrumented, actual_job_id, prompt)
    return {"job_id": actual_job_id, "status": "running", "chat_id": chat_id}

@router.get("/jobs")
@router.get("/jobs/")
async def list_jobs():
    return {"jobs": job_manager.list_jobs()}

@router.get("/jobs/{job_id}")
async def get_job_detail(job_id: str):
    job = job_manager.get_job(job_id)
    chat = project_manager.get_chat(job_id) or {}

    stored_events = chat.get("events", [])
    memory_events = getattr(job, "events", []) if job else []
    effective_events = memory_events if memory_events else stored_events

    effective_prompt = (getattr(job, "prompt", "") if job else "") or chat.get("prompt", "")
    effective_status = (getattr(job, "status", "") if job else "") or chat.get("status", "completed")
    effective_result = (getattr(job, "result", None) if job else None) or chat.get("result", "")

    # Auto-extract final result if empty
    if not effective_result and effective_events:
        for ev in reversed(effective_events):
            ev_type = ev.get("type", "") if isinstance(ev, dict) else getattr(ev, "type", "")
            if str(ev_type).lower() == "final":
                data_part = ev.get("data", {}) if isinstance(ev, dict) else getattr(ev, "data", {})
                if isinstance(data_part, dict):
                    effective_result = data_part.get("result", "")
                elif isinstance(data_part, str):
                    effective_result = data_part
                break

    return {
        "id": job_id,
        "status": effective_status,
        "prompt": effective_prompt,
        "result": effective_result,
        "events": effective_events
    }

@router.get("/jobs/{job_id}/files")
async def get_job_files(job_id: str):
    chat = project_manager.get_chat(job_id) or {}
    chat_id = chat.get("id", f"chat_{job_id}")
    project_id = chat.get("project_id", "default_project")
    files_dir = project_manager.get_chat_files_dir(chat_id, project_id)

    if not files_dir.exists():
        return {"job_id": job_id, "files": []}

    job_files = []
    for root, dirs, files in os.walk(files_dir):
        for f in files:
            p = Path(root) / f
            rel = p.relative_to(files_dir)
            job_files.append({
                "name": f,
                "path": str(rel).replace("\\", "/"),
                "size": p.stat().st_size
            })
    return {"job_id": job_id, "chat_id": chat_id, "files": job_files}

@router.get("/jobs/{job_id}/content")
async def get_job_file_content(job_id: str, path: str = Query(...)):
    chat = project_manager.get_chat(job_id) or {}
    chat_id = chat.get("id", f"chat_{job_id}")
    project_id = chat.get("project_id", "default_project")
    files_dir = project_manager.get_chat_files_dir(chat_id, project_id)

    clean_rel = path.lstrip("/\\")
    target = (files_dir / clean_rel).resolve()
    if not target.is_relative_to(files_dir) or not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found in job deliverables")

    try:
        content = target.read_text(encoding="utf-8")
        return {"path": path, "content": content}
    except Exception as e:
        return {"path": path, "content": f"Binary content: {str(e)}"}

@router.get("/jobs/{job_id}/raw/{filepath:path}")
async def get_job_raw_file(job_id: str, filepath: str):
    chat = project_manager.get_chat(job_id) or {}
    chat_id = chat.get("id", f"chat_{job_id}")
    project_id = chat.get("project_id", "default_project")
    files_dir = project_manager.get_chat_files_dir(chat_id, project_id)

    clean_rel = filepath.lstrip("/\\")
    target = (files_dir / clean_rel).resolve()
    if not target.is_relative_to(files_dir) or not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found in job deliverables")

    content_type, _ = mimetypes.guess_type(str(target))
    ext = target.suffix.lower()
    if ext == ".css":
        content_type = "text/css"
    elif ext in [".js", ".mjs"]:
        content_type = "application/javascript"
    elif ext in [".html", ".htm"]:
        content_type = "text/html"

    return FileResponse(target, media_type=content_type or "application/octet-stream")

@router.get("/jobs/{job_id}/download-zip")
async def download_job_zip(job_id: str):
    chat = project_manager.get_chat(job_id) or {}
    chat_id = chat.get("id", f"chat_{job_id}")
    project_id = chat.get("project_id", "default_project")
    files_dir = project_manager.get_chat_files_dir(chat_id, project_id)

    if not files_dir.exists():
        raise HTTPException(status_code=404, detail="No files found for this job")

    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(files_dir):
            for f in files:
                fp = Path(root) / f
                arcname = fp.relative_to(files_dir)
                zip_file.write(fp, arcname=str(arcname))

    zip_buffer.seek(0)
    filename = f"{chat_id}_deliverables.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/jobs/{job_id}/stream")
async def stream_job_events(job_id: str):
    chat = project_manager.get_chat(job_id) or {}
    existing_status = chat.get("status", "running")
    existing_events = chat.get("events", [])

    async def event_generator():
        # If job is already completed, replay events and finish immediately without touching disk state
        if existing_status in ["completed", "failed"] and existing_events:
            for ev in existing_events:
                ev_type = ev.get("type", "thought") if isinstance(ev, dict) else "thought"
                ev_data = json.dumps(ev, ensure_ascii=False) if isinstance(ev, dict) else str(ev)
                yield {"event": str(ev_type), "data": ev_data}
            yield {"event": "done", "data": json.dumps({"status": existing_status})}
            return

        collected_events = list(existing_events)
        async for event in subscribe_events(job_id):
            if hasattr(event, "type"):
                ev_type = event.type.value if hasattr(event.type, "value") else str(event.type)
                ev_data = event.to_json() if hasattr(event, "to_json") else json.dumps(getattr(event, "data", {}), ensure_ascii=False)
                try: parsed = json.loads(ev_data)
                except: parsed = {"content": ev_data}
                
                if str(ev_type).lower() not in ["ping"]:
                    collected_events.append({"type": str(ev_type), "step": getattr(event, "step", 1), "data": parsed.get("data", parsed)})
                
                is_term = str(ev_type).lower() in ["final", "error", "done"]
                if is_term:
                    c_id = chat.get("id", f"chat_{job_id}")
                    p_id = chat.get("project_id", "default_project")
                    prompt_val = chat.get("prompt", "")
                    project_manager.save_chat_session(
                        chat_id=c_id,
                        project_id=p_id,
                        title=prompt_val[:40] if prompt_val else job_id,
                        job_id=job_id,
                        prompt=prompt_val,
                        events=collected_events,
                        result=parsed.get("data", {}).get("result", "") if isinstance(parsed.get("data"), dict) else "",
                        status="completed" if str(ev_type).lower() in ["final", "done"] else "failed"
                    )
                yield {"event": str(ev_type), "data": ev_data}
                if is_term:
                    break

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )