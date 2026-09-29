import os
import json
import asyncio
import mimetypes
import uuid
import shutil
from pathlib import Path
from io import BytesIO
import zipfile
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from typing import Optional, List, Dict, Any, Tuple

from omweb.config import get_storage_root
from omweb.job_manager import job_manager
from omweb.sse_events import subscribe_events, SSEEventType
from omweb.agent_bridge import run_instrumented, run_direct_chat, active_tasks, human_answers, human_data
from omweb.project_manager import project_manager

router = APIRouter()

JOB_TO_CHAT_ID: Dict[str, str] = {}

class RunRequest(BaseModel):
    prompt: str
    project_id: Optional[str] = "default_project"
    max_steps: Optional[int] = 30
    chat_id: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    api_type: Optional[str] = None
    mode: Optional[str] = "agent"

class FileContentPayload(BaseModel):
    path: str
    content: str

class HumanResponsePayload(BaseModel):
    answer: str

def resolve_chat(identifier: str) -> Tuple[Optional[Dict[str, Any]], str]:
    if not identifier:
        return None, ""
    direct_chat = project_manager.get_chat(identifier)
    if direct_chat:
        return direct_chat, direct_chat.get("id", identifier)
    if identifier in JOB_TO_CHAT_ID:
        cid = JOB_TO_CHAT_ID[identifier]
        return project_manager.get_chat(cid), cid
    job = job_manager.get_job(identifier)
    if job and hasattr(job, "chat_id") and getattr(job, "chat_id"):
        cid = getattr(job, "chat_id")
        return project_manager.get_chat(cid), cid
    for c_item in project_manager.list_chats():
        cid = c_item.get("id")
        if cid:
            fc = project_manager.get_chat(cid)
            if fc:
                if fc.get("job_id") == identifier:
                    return fc, cid
                for turn in fc.get("turns", []):
                    if turn.get("job_id") == identifier:
                        return fc, cid
    fallback_id = identifier if identifier.startswith("chat_") else f"chat_{identifier}"
    return None, fallback_id

@router.post("")
@router.post("/")
async def start_run(req: RunRequest, background_tasks: BackgroundTasks):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    exec_mode = "agent"
    raw_mode = getattr(req, "mode", None)
    if isinstance(raw_mode, str) and raw_mode.strip():
        m_val = raw_mode.strip().lower()
        if m_val in ["agent", "chat"]:
            exec_mode = m_val

    generated_job_id = f"job_{uuid.uuid4().hex[:12]}"
    try:
        job = job_manager.create_job(generated_job_id, prompt=prompt)
    except TypeError:
        job = job_manager.create_job(generated_job_id)
        if hasattr(job, "prompt"):
            job.prompt = prompt

    actual_job_id = getattr(job, "id", generated_job_id)

    llm_override: Dict[str, Any] = {}
    if req.model:
        llm_override["model"] = req.model.strip()
    if req.provider:
        llm_override["provider"] = req.provider.strip()
    if req.base_url:
        llm_override["base_url"] = req.base_url.strip()
    if req.api_key is not None:
        llm_override["api_key"] = req.api_key.strip()
    if req.api_type:
        llm_override["api_type"] = req.api_type.strip()

    existing_chat = None
    if req.chat_id:
        existing_chat, _ = resolve_chat(req.chat_id)

    if existing_chat:
        chat_id = existing_chat.get("id", req.chat_id)
        project_id = existing_chat.get("project_id", req.project_id or "default_project")
        title = existing_chat.get("title") or prompt[:40]
        turns = list(existing_chat.get("turns", []))

        prev_p = existing_chat.get("prompt", "")
        prev_r = existing_chat.get("result", "")
        prev_ev = existing_chat.get("events", [])
        prev_jid = existing_chat.get("job_id", "")
        if prev_p and (prev_r or prev_ev):
            if not turns or turns[-1].get("job_id") != prev_jid:
                turns.append({
                    "job_id": prev_jid,
                    "prompt": prev_p,
                    "result": prev_r,
                    "events": prev_ev,
                    "status": existing_chat.get("status", "completed"),
                    "created_at": existing_chat.get("updated_at") or existing_chat.get("created_at")
                })

        agent_prompt = prompt
        if prev_r:
            clean_prev = prev_r[:350].replace("\n", " ").strip()
            agent_prompt = f"[Context: In the previous turn, the user requested: '{prev_p}'. Result: '{clean_prev}']. Follow-up task: {prompt}"
    else:
        chat_id = req.chat_id.strip() if req.chat_id and req.chat_id.strip() else f"chat_{uuid.uuid4().hex[:10]}"
        project_id = req.project_id or "default_project"
        title = prompt[:40]
        turns = []
        agent_prompt = prompt

    files_dir = project_manager.get_chat_files_dir(chat_id, project_id)
    files_dir.mkdir(parents=True, exist_ok=True)

    JOB_TO_CHAT_ID[actual_job_id] = chat_id
    try:
        setattr(job, "chat_id", chat_id)
    except Exception:
        pass

    project_manager.save_chat_session(
        chat_id=chat_id,
        project_id=project_id,
        title=title,
        job_id=actual_job_id,
        prompt=prompt,
        events=[],
        result="",
        status="running"
    )

    try:
        session_file = project_manager.get_chat_dir(chat_id, project_id) / "session.json"
        if session_file.exists():
            s_data = json.loads(session_file.read_text(encoding="utf-8"))
            s_data["turns"] = turns
            if llm_override:
                s_data["model"] = llm_override.get("model")
                s_data["provider"] = llm_override.get("provider")
            session_file.write_text(json.dumps(s_data, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass

    if exec_mode == "chat":
        background_tasks.add_task(run_direct_chat, actual_job_id, prompt, llm_override)
    else:
        background_tasks.add_task(run_instrumented, actual_job_id, agent_prompt, llm_override)

    return {
        "job_id": actual_job_id,
        "status": "running",
        "chat_id": chat_id,
        "mode": exec_mode,
        "model": llm_override.get("model"),
        "provider": llm_override.get("provider")
    }

@router.get("/jobs")
@router.get("/jobs/")
async def list_jobs():
    return {"jobs": job_manager.list_jobs()}

@router.get("/jobs/{job_id}")
async def get_job_detail(job_id: str):
    job = job_manager.get_job(job_id)
    chat, chat_id = resolve_chat(job_id)
    chat = chat or {}

    stored_events = chat.get("events", [])
    memory_events = getattr(job, "events", []) if job else []
    effective_events = memory_events if memory_events else stored_events

    effective_prompt = (getattr(job, "prompt", "") if job else "") or chat.get("prompt", "")
    effective_status = (getattr(job, "status", "") if job else "") or chat.get("status", "completed")
    effective_result = (getattr(job, "result", None) if job else None) or chat.get("result", "")

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
        "chat_id": chat_id,
        "status": effective_status,
        "prompt": effective_prompt,
        "result": effective_result,
        "events": effective_events,
        "turns": chat.get("turns", []),
        "created_at": chat.get("created_at")
    }

@router.post("/jobs/{job_id}/stop")
async def stop_job(job_id: str):
    task = active_tasks.get(job_id)
    if task and not task.done():
        task.cancel()
    job_manager.fail_job(job_id, "Job stopped by user.")
    return {"status": "cancelled", "job_id": job_id}

@router.post("/jobs/{job_id}/respond")
async def respond_job(job_id: str, payload: HumanResponsePayload):
    human_data[job_id] = payload.answer
    event = human_answers.get(job_id)
    if event:
        event.set()
    return {"status": "ok", "job_id": job_id}

@router.get("/jobs/{job_id}/files")
async def get_job_files(job_id: str):
    _, chat_id = resolve_chat(job_id)
    chat = project_manager.get_chat(chat_id) or {}
    project_id = chat.get("project_id", "default_project")
    files_dir = project_manager.get_chat_files_dir(chat_id, project_id)

    if not files_dir.exists():
        return {"job_id": job_id, "chat_id": chat_id, "files": []}

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
    _, chat_id = resolve_chat(job_id)
    chat = project_manager.get_chat(chat_id) or {}
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

@router.post("/jobs/{job_id}/content")
async def save_job_file_content(job_id: str, payload: FileContentPayload):
    _, chat_id = resolve_chat(job_id)
    chat = project_manager.get_chat(chat_id) or {}
    project_id = chat.get("project_id", "default_project")
    files_dir = project_manager.get_chat_files_dir(chat_id, project_id)

    clean_rel = payload.path.lstrip("/\\")
    target = (files_dir / clean_rel).resolve()
    if not target.is_relative_to(files_dir):
        raise HTTPException(status_code=400, detail="Invalid file destination path")

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(payload.content, encoding="utf-8")
        return {"status": "ok", "path": payload.path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")

@router.get("/jobs/{job_id}/raw/{filepath:path}")
async def get_job_raw_file(job_id: str, filepath: str):
    _, chat_id = resolve_chat(job_id)
    chat = project_manager.get_chat(chat_id) or {}
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
    elif ext == ".png":
        content_type = "image/png"
    elif ext in [".jpg", ".jpeg"]:
        content_type = "image/jpeg"
    elif ext == ".webp":
        content_type = "image/webp"
    elif ext == ".svg":
        content_type = "image/svg+xml"
    elif ext == ".pdf":
        content_type = "application/pdf"
    elif ext == ".mp4":
        content_type = "video/mp4"
    elif ext == ".webm":
        content_type = "video/webm"
    elif ext in [".mov", ".quicktime"]:
        content_type = "video/quicktime"

    return FileResponse(target, media_type=content_type or "application/octet-stream")

@router.get("/jobs/{job_id}/download-zip")
async def download_job_zip(job_id: str):
    _, chat_id = resolve_chat(job_id)
    chat = project_manager.get_chat(chat_id) or {}
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
    chat, chat_id = resolve_chat(job_id)
    chat = chat or {}

    job_mem_status = getattr(job, "status", None)

    if job and job_mem_status in ["completed", "failed"]:
        memory_events = getattr(job, "events", [])
        async def replay_generator():
            for ev in memory_events:
                ev_type = ev.get("type", "thought") if isinstance(ev, dict) else "thought"
                ev_data = json.dumps(ev, ensure_ascii=False) if isinstance(ev, dict) else str(ev)
                yield {"event": str(ev_type), "data": ev_data}
            yield {"event": "done", "data": json.dumps({"status": job_mem_status})}
        return EventSourceResponse(replay_generator())

    collected_events = []
    current_step = 1

    async def event_generator():
        nonlocal current_step
        async for event in subscribe_events(job_id):
            ev_type = event.type.value if hasattr(event.type, "value") else str(event.type)
            ev_step = getattr(event, "step", None)
            if ev_step:
                current_step = ev_step

            if hasattr(event, "to_json"):
                try:
                    raw_dict = json.loads(event.to_json())
                except Exception:
                    raw_dict = {"data": getattr(event, "data", {})}
            else:
                raw_dict = {"data": getattr(event, "data", {})}

            raw_dict["type"] = str(ev_type)
            raw_dict["step"] = current_step
            ev_data_str = json.dumps(raw_dict, ensure_ascii=False)

            if str(ev_type).lower() not in ["ping"]:
                collected_events.append({
                    "type": str(ev_type),
                    "step": current_step,
                    "data": raw_dict.get("data", {})
                })

            is_term = str(ev_type).lower() in ["final", "error", "done"]
            if is_term:
                res_data = raw_dict.get("data", {})
                final_res = res_data.get("result", "") if isinstance(res_data, dict) else str(res_data)

                if not final_res or final_res == "{}":
                    for e in reversed(collected_events):
                        if e.get("type") == "thought":
                            t_val = e.get("data", {}).get("thought")
                            if t_val:
                                final_res = t_val
                                break

                p_id = chat.get("project_id", "default_project")
                prompt_val = getattr(job, "prompt", None) or chat.get("prompt", "")
                final_status = "completed" if str(ev_type).lower() in ["final", "done"] else "failed"

                project_manager.save_chat_session(
                    chat_id=chat_id,
                    project_id=p_id,
                    title=prompt_val[:40] if prompt_val else chat_id,
                    job_id=job_id,
                    prompt=prompt_val,
                    events=collected_events,
                    result=final_res,
                    status=final_status
                )

                try:
                    s_file = project_manager.get_chat_dir(chat_id, p_id) / "session.json"
                    if s_file.exists():
                        c_json = json.loads(s_file.read_text(encoding="utf-8"))
                        c_json["turns"] = chat.get("turns", [])
                        s_file.write_text(json.dumps(c_json, indent=2, ensure_ascii=False), encoding="utf-8")
                except Exception:
                    pass

            yield {"event": str(ev_type), "data": ev_data_str}
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
