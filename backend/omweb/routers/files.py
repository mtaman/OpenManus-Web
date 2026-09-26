import os
import shutil
import mimetypes
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from omweb.config import get_workspace_root

router = APIRouter()

def safe_resolve(subpath: str) -> Path:
    ws = get_workspace_root().resolve()
    clean_subpath = subpath.lstrip("/\\")
    target = (ws / clean_subpath).resolve()
    if not target.is_relative_to(ws):
        raise HTTPException(status_code=403, detail="Access denied: Path traversal detected")
    return target

@router.get("")
@router.get("/")
async def list_files():
    """List all artifacts and files in workspace recursively."""
    ws = get_workspace_root().resolve()
    ws.mkdir(parents=True, exist_ok=True)
    items = []
    for root, dirs, files in os.walk(ws):
        for f in files:
            p = Path(root) / f
            rel = p.relative_to(ws)
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
    return {"files": items, "workspace": str(ws)}

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