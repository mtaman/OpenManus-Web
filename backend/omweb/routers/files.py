from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from typing import Dict, Any

from omweb.fs_utils import (
    ensure_workspace,
    resolve_safe_path,
    build_file_tree,
    move_to_trash
)

router = APIRouter()

class FileSaveRequest(BaseModel):
    path: str
    content: str

@router.get("")
async def list_workspace_files():
    """Retrieve the full file tree of the workspace."""
    ws = ensure_workspace()
    tree = build_file_tree(ws)
    return {"workspace": str(ws), "files": tree}

@router.get("/content")
async def get_file_content(path: str = Query(..., description="Relative path in workspace")):
    """Read textual content of a file."""
    target = resolve_safe_path(path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        content = target.read_text(encoding="utf-8")
        return {"path": path, "content": content}
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Cannot read binary file as text")

@router.post("/content")
async def save_file_content(payload: FileSaveRequest):
    """Save updated text content to a file."""
    target = resolve_safe_path(payload.path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(payload.content, encoding="utf-8")
    return {"status": "saved", "path": payload.path, "size": target.stat().st_size}

@router.get("/download")
async def download_file(path: str = Query(..., description="Relative path in workspace")):
    """Download a file from the workspace."""
    target = resolve_safe_path(path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(target, filename=target.name)

@router.delete("/{file_path:path}")
async def delete_file(file_path: str):
    """Safely delete a file by moving it to .trash."""
    target = resolve_safe_path(file_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Item not found")

    trash_dest = move_to_trash(target)
    return {"status": "deleted", "moved_to_trash": str(trash_dest.name)}