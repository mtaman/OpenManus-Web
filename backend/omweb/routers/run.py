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
from omweb.agent_bridge import run_instrumented, human_answers, human_data
from omweb.project_manager import project_manager

router = APIRouter()

class RunRequest(BaseModel):
    prompt: str
    project_id: Optional[str] = "default_project"

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
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if hasattr(job, "to_dict"):
        return job.to_dict()
    elif hasattr(job, "model_dump"):
        return job.model_dump()
    elif isinstance(job, dict):
        return job
    return {
        "id": getattr(job, "id", job_id),
        "status": getattr(job, "status", "unknown"),
        "prompt": getattr(job, "prompt", ""),
        "events": getattr(job, "events", [])
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
    """Retrieve content strictly from this job's isolated files directory."""
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
    """Serve any asset strictly from this job's isolated workspace."""
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
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        collected_events = []
        def persist_state(status_str="running"):
            try:
                chat = project_manager.get_chat(job_id) or {}
                c_id = chat.get("id", f"chat_{job_id}")
                p_id = chat.get("project_id", "default_project")
                prompt_val = getattr(job, "prompt", chat.get("prompt", ""))
                
                project_manager.save_chat_session(
                    chat_id=c_id,
                    project_id=p_id,
                    title=prompt_val[:40] if prompt_val else job_id,
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
