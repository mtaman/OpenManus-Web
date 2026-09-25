import os
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, PlainTextResponse
from omweb.config import WORKSPACE_ROOT

router = APIRouter()

def safe_resolve(subpath: str) -> Path:
    clean_subpath = subpath.lstrip("/\\")
    target = (WORKSPACE_ROOT / clean_subpath).resolve()
    if not target.is_relative_to(WORKSPACE_ROOT.resolve()):
        raise HTTPException(status_code=403, detail="Access denied: Path traversal detected")
    return target

@router.get("")
@router.get("/")
async def list_files():
    """List all artifacts and files in workspace."""
    WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)
    items = []
    for root, dirs, files in os.walk(WORKSPACE_ROOT):
        for f in files:
            p = Path(root) / f
            rel = p.relative_to(WORKSPACE_ROOT)
            stat = p.stat()
            ext = p.suffix.lower()
            file_type = "code"
            if ext in [".html", ".htm"]:
                file_type = "html"
            elif ext in [".md", ".markdown", ".txt"]:
                file_type = "markdown"
            elif ext in [".json", ".csv"]:
                file_type = "data"
            elif ext in [".png", ".jpg", ".jpeg", ".svg", ".webp"]:
                file_type = "image"

            items.append({
                "name": f,
                "path": str(rel).replace("\\", "/"),
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "type": file_type
            })
    return {"files": items, "workspace": str(WORKSPACE_ROOT)}

@router.get("/raw")
@router.get("/raw/")
@router.get("/raw/{file_path:path}")
async def get_raw_file(file_path: str = None, path: str = Query(None)):
    target_rel = file_path or path
    if not target_rel:
        raise HTTPException(status_code=400, detail="Missing file path")
    target = safe_resolve(target_rel)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Artifact file not found")
    
    ext = target.suffix.lower()
    if ext in [".html", ".htm"]:
        return FileResponse(target, media_type="text/html")
    elif ext in [".png", ".jpg", ".jpeg", ".svg", ".webp"]:
        return FileResponse(target)
    
    return FileResponse(target, media_type="text/plain")

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