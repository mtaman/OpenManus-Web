import time
import shutil
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any
from pathlib import Path
from omweb.config import WORKSPACE_ROOT, TRASH_DIR
from omweb.fs_utils import list_directory_tree, safe_resolve_path

router = APIRouter(prefix="/api/files", tags=["files"])

@router.get("")
async def get_files(path: str = Query("", description="Relative path in workspace")) -> Dict[str, Any]:
    target_dir = safe_resolve_path(WORKSPACE_ROOT, path)
    if not target_dir.exists() or not target_dir.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")
    tree = list_directory_tree(target_dir, base_root=WORKSPACE_ROOT)
    return {
        "status": "success",
        "workspace": str(WORKSPACE_ROOT),
        "tree": tree,
        "files": tree
    }

@router.delete("")
async def trash_file(path: str = Query(..., description="Relative file path")) -> Dict[str, Any]:
    target = safe_resolve_path(WORKSPACE_ROOT, path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    dest = TRASH_DIR / f"{target.name}.{int(time.time())}"
    shutil.move(str(target), str(dest))
    return {"status": "success", "trash_location": str(dest)}