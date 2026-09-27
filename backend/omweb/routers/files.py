import os
import shutil
import mimetypes
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from omweb.config import get_storage_root
from omweb.project_manager import project_manager

router = APIRouter()


class FileSaveRequest(BaseModel):
    path: str
    content: str
    job_id: Optional[str] = None


def safe_resolve(subpath: str) -> Path:
    storage = get_storage_root().resolve()
    clean_subpath = subpath.lstrip("/\\")
    target = (storage / clean_subpath).resolve()

    # Direct match in storage
    if target.is_relative_to(storage) and target.exists() and target.is_file():
        return target

    # Search inside chat files if subpath is relative to a chat
    for root, dirs, files in os.walk(storage):
        if "files" in root:
            possible = Path(root) / clean_subpath
            if possible.exists() and possible.is_file():
                return possible.resolve()

    if not target.is_relative_to(storage):
        raise HTTPException(status_code=403, detail="Access denied: Path traversal detected")

    return target


@router.get("")
@router.get("/")
async def list_files():
    """List all artifacts and files across storage repository recursively."""
    storage = get_storage_root().resolve()
    storage.mkdir(parents=True, exist_ok=True)
    items = []

    for root, dirs, files in os.walk(storage):
        for f in files:
            if f.endswith(".tmp") or f.endswith(".bak"):
                continue

            p = Path(root) / f
            rel = p.relative_to(storage)
            stat = p.stat()
            ext = p.suffix.lower()

            file_type = "code"
            if ext in [".html", ".htm"]:
                file_type = "html"
            elif ext in [".md", ".markdown", ".txt"]:
                file_type = "markdown"
            elif ext in [".json", ".csv"]:
                file_type = "data"
            elif ext in [".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"]:
                file_type = "image"
            elif ext == ".css":
                file_type = "css"
            elif ext in [".js", ".ts"]:
                file_type = "javascript"

            items.append({
                "name": f,
                "path": str(rel).replace("\\", "/"),
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "type": file_type
            })

    return {"files": items, "workspace": str(storage)}


@router.get("/raw/{filepath:path}")
async def get_raw_file(filepath: str):
    """Serve any workspace artifact directly with strict MIME type headers."""
    target = safe_resolve(filepath)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    content_type, _ = mimetypes.guess_type(str(target))
    ext = target.suffix.lower()
    if ext == ".css":
        content_type = "text/css"
    elif ext in [".js", ".mjs"]:
        content_type = "application/javascript"
    elif ext in [".html", ".htm"]:
        content_type = "text/html"

    return FileResponse(
        target,
        media_type=content_type or "application/octet-stream"
    )


@router.get("/content")
@router.get("/content/")
@router.get("/content/{file_path:path}")
async def get_file_content(file_path: str = None, path: str = Query(None)):
    target_rel = file_path or path
    if not target_rel:
        raise HTTPException(status_code=400, detail="Missing file path")

    target = safe_resolve(target_rel)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        content = target.read_text(encoding="utf-8")
        return {"path": target_rel, "content": content}
    except Exception as e:
        return {"path": target_rel, "content": f"Binary or unreadable content: {str(e)}"}


@router.post("/content")
@router.post("/content/")
@router.put("/content")
@router.put("/content/")
async def save_file_content(payload: FileSaveRequest):
    """Save or update file content on disk safely."""
    if not payload.path:
        raise HTTPException(status_code=400, detail="Missing file path")

    clean_subpath = payload.path.lstrip("/\\")
    storage = get_storage_root().resolve()
    target = None

    # 1. If job_id is provided, resolve directly inside the active job's files folder
    if payload.job_id:
        chat = project_manager.get_chat(payload.job_id) or {}
        chat_id = chat.get("id", f"chat_{payload.job_id}")
        project_id = chat.get("project_id", "default_project")
        files_dir = project_manager.get_chat_files_dir(chat_id, project_id)
        files_dir.mkdir(parents=True, exist_ok=True)
        file_name = Path(clean_subpath).name
        candidate = (files_dir / file_name).resolve()
        if candidate.is_relative_to(files_dir):
            target = candidate

    # 2. Try locating existing file across storage via safe_resolve
    if target is None or not target.exists():
        try:
            resolved = safe_resolve(clean_subpath)
            if resolved.exists() and resolved.is_file():
                target = resolved
        except HTTPException:
            pass

    # 3. Fallback to storage root with path traversal security check
    if target is None:
        target = (storage / clean_subpath).resolve()
        if not target.is_relative_to(storage):
            raise HTTPException(status_code=403, detail="Access denied: Path traversal detected")

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(payload.content, encoding="utf-8")
        return {
            "status": "success",
            "path": payload.path,
            "resolved_path": str(target),
            "size": target.stat().st_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")