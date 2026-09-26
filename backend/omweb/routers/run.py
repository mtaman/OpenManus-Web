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

router = APIRouter()


class RunRequest(BaseModel):
    prompt: str


class FeedbackRequest(BaseModel):
    response: str


@router.post("")
@router.post("/")
async def start_run(req: RunRequest, background_tasks: BackgroundTasks):
    """Start an agent run asynchronously and return immediate job ID."""
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
    return {"job_id": actual_job_id, "status": getattr(job, "status", "running")}


@router.get("/jobs")
@router.get("/jobs/")
async def list_jobs():
    """List all registered jobs."""
    return {"jobs": job_manager.list_jobs()}


@router.get("/jobs/{job_id}")
async def get_job_detail(job_id: str):
    """Retrieve full status, steps, and thoughts for a single job safely."""
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


@router.get("/jobs/{job_id}/files")
async def get_job_files(job_id: str):
    """Retrieve output files produced strictly for this job/project."""
    ws = get_workspace_root().resolve()
    project_dir = ws / "projects" / job_id
    search_root = project_dir if project_dir.exists() else ws

    if not search_root.exists():
        return {"job_id": job_id, "files": []}

    job_files = []
    for root, dirs, files in os.walk(search_root):
        if search_root == ws and "projects" in root:
            continue
        for f in files:
            # Exclude session meta file from UI build deliverables
            if f == "session_meta.json":
                continue
            p = Path(root) / f
            rel = p.relative_to(search_root)
            job_files.append({
                "name": f,
                "path": str(rel).replace("\\", "/"),
                "size": p.stat().st_size
            })

    return {"job_id": job_id, "files": job_files}


@router.get("/jobs/{job_id}/download-zip")
async def download_job_zip(job_id: str):
    """Compress and stream all artifacts of this job as a ZIP archive."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    files_res = await get_job_files(job_id)
    file_items = files_res.get("files", [])
    if not file_items:
        raise HTTPException(status_code=400, detail="No generated files found for this job")

    ws = get_workspace_root().resolve()
    project_dir = ws / "projects" / job_id
    search_root = project_dir if project_dir.exists() else ws

    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for f in file_items:
            disk_path = search_root / f["path"]
            if disk_path.is_file():
                zip_file.write(disk_path, arcname=f["name"])

    zip_buffer.seek(0)
    filename = f"openmanus_{job_id}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/jobs/{job_id}/feedback")
async def provide_feedback(job_id: str, req: FeedbackRequest):
    """Supply user response to AskHuman interruption."""
    if job_id in human_answers:
        human_data[job_id] = req.response
        human_answers[job_id].set()
        return {"status": "ok", "message": "Feedback sent to agent"}
    raise HTTPException(status_code=400, detail="Job is not waiting for user feedback")


@router.get("/jobs/{job_id}/stream")
async def stream_job_events(job_id: str):
    """Stream real-time SSE events for this job with zero-buffering headers."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        # Replay past events safely with robust JSON serialization
        for ev in job.events:
            ev_type = getattr(ev, "type", "message")
            if hasattr(ev_type, "value"):
                ev_type = ev_type.value
            if hasattr(ev, "to_json"):
                ev_data = ev.to_json()
            elif isinstance(ev, dict):
                ev_data = json.dumps(ev, ensure_ascii=False)
            else:
                ev_data = json.dumps({"content": str(ev)}, ensure_ascii=False)
            yield {"event": str(ev_type), "data": ev_data}

        # Stream live events safely with zero latency
        async for event in subscribe_events(job_id):
            if hasattr(event, "type"):
                ev_type = event.type.value if hasattr(event.type, "value") else str(event.type)
                ev_data = event.to_json() if hasattr(event, "to_json") else str(event.data)
                yield {"event": str(ev_type), "data": ev_data}
                if str(ev_type).lower() in ["final", "error", "done"]:
                    break
            elif isinstance(event, str):
                lines = event.strip().split("\n")
                evt_name = "message"
                data_payload = ""
                for line in lines:
                    if line.startswith("event:"):
                        evt_name = line.replace("event:", "").strip()
                    elif line.startswith("data:"):
                        data_payload = line.replace("data:", "").strip()
                if not data_payload:
                    data_payload = event
                yield {"event": evt_name, "data": data_payload}
                if evt_name.lower() in ["final", "error", "done"]:
                    break

        # Save session metadata into the job project directory
        try:
            ws = get_workspace_root().resolve()
            project_dir = ws / "projects" / job_id
            if project_dir.exists():
                session_path = project_dir / "session_meta.json"
                with open(session_path, "w", encoding="utf-8") as sf:
                    json.dump(job.to_dict(), sf, ensure_ascii=False, indent=2)
        except Exception:
            pass

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )