"""
Files Router.
Provides secure endpoints for file tree exploration, file previews,
raw file downloads, and safe file deletion to trash.
"""

from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from omweb.fs_utils import (
    validate_safe_path,
    get_file_tree,
    read_file_preview,
    safe_delete_to_trash,
)

router = APIRouter()

# Default workspace root is the project workspace
WORKSPACE_ROOT = Path(r"D:\AI\OpenManus-Web")


@router.get("")
async def list_workspace_files() -> Dict[str, Any]:
    """Returns a recursive file tree of the workspace."""
    try:
        tree = get_file_tree(WORKSPACE_ROOT)
        return {"status": "ok", "workspace": str(WORKSPACE_ROOT), "tree": tree}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan workspace: {str(e)}")


@router.get("/preview")
async def preview_file(path: str = Query(..., description="Relative path to file")) -> Dict[str, Any]:
    """Returns safe preview content of a text or binary file."""
    try:
        safe_path = validate_safe_path(WORKSPACE_ROOT, path)
        preview_data = read_file_preview(safe_path)
        return {"status": "ok", "path": path, "data": preview_data}
    except ValueError as ve:
        raise HTTPException(status_code=403, detail=str(ve))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Requested file does not exist")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview error: {str(e)}")


@router.get("/download")
async def download_file(path: str = Query(..., description="Relative path to file")):
    """Downloads a raw file from the workspace."""
    try:
        safe_path = validate_safe_path(WORKSPACE_ROOT, path)
        if not safe_path.is_file():
            raise HTTPException(status_code=400, detail="Target path is not a regular file")
        return FileResponse(path=safe_path, filename=safe_path.name)
    except ValueError as ve:
        raise HTTPException(status_code=403, detail=str(ve))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")


@router.delete("")
async def delete_file(path: str = Query(..., description="Relative path to file or folder")) -> Dict[str, Any]:
    """Safely stages a file or folder into the .trash directory."""
    try:
        safe_path = validate_safe_path(WORKSPACE_ROOT, path)
        trashed_path = safe_delete_to_trash(safe_path, WORKSPACE_ROOT)
        return {"status": "trashed", "original": path, "trash_location": str(trashed_path)}
    except ValueError as ve:
        raise HTTPException(status_code=403, detail=str(ve))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")

