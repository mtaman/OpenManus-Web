import os
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from omweb.config import WORKSPACE_ROOT

TRASH_DIR_NAME = ".trash"

def ensure_workspace() -> Path:
    """Ensure workspace directory exists and return resolved path."""
    WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)
    return WORKSPACE_ROOT.resolve()

def resolve_safe_path(relative_path: str) -> Path:
    """Resolve and strictly guard against Path Traversal."""
    ws = ensure_workspace()
    # Normalize path and strip leading slashes
    clean_rel = relative_path.lstrip("/\\")
    resolved = (ws / clean_rel).resolve()

    if not resolved.is_relative_to(ws):
        raise HTTPException(status_code=403, detail="Access denied: Path is outside workspace sandbox")

    return resolved

def build_file_tree(base_path: Path) -> List[Dict[str, Any]]:
    """Build a recursive directory tree dictionary."""
    tree = []
    if not base_path.exists():
        return tree

    for entry in sorted(base_path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        if entry.name == TRASH_DIR_NAME:
            continue

        rel_path = str(entry.relative_to(WORKSPACE_ROOT)).replace("\\", "/")
        item: Dict[str, Any] = {
            "name": entry.name,
            "path": rel_path,
            "isDir": entry.is_dir(),
        }

        if entry.is_dir():
            item["children"] = build_file_tree(entry)
        else:
            item["size"] = entry.stat().st_size
            item["extension"] = entry.suffix.lstrip(".").lower()
            item["modified"] = int(entry.stat().st_mtime)

        tree.append(item)

    return tree

def move_to_trash(target_path: Path) -> Path:
    """Safely move a file or folder to the .trash folder."""
    ws = ensure_workspace()
    trash_dir = ws / TRASH_DIR_NAME
    trash_dir.mkdir(parents=True, exist_ok=True)

    dest = trash_dir / target_path.name
    # Append counter if destination already exists in trash
    counter = 1
    while dest.exists():
        dest = trash_dir / f"{target_path.stem}_{counter}{target_path.suffix}"
        counter += 1

    shutil.move(str(target_path), str(dest))
    return dest