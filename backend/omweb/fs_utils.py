"""
File System Security and Workspace Utilities.
Enforces path traversal protection, recursive tree generation, previews, and safe deletion.
"""

from datetime import datetime
import os
from pathlib import Path
import shutil
from typing import Any, Dict, List, Optional

IGNORED_DIRS = {".venv", "venv", "node_modules", ".git", "__pycache__", ".next", ".trash"}


def validate_safe_path(base_dir: Path, relative_path: str) -> Path:
    """
    Validates that the relative_path resolves strictly within base_dir.
    Raises ValueError if path traversal is detected.
    """
    base_resolved = Path(base_dir).resolve()
    target_resolved = (base_resolved / relative_path.lstrip("/\\")).resolve()

    if not target_resolved.is_relative_to(base_resolved):
        raise ValueError(f"Path traversal detected: {relative_path}")

    return target_resolved


def get_file_tree(base_dir: Path) -> List[Dict[str, Any]]:
    """
    Recursively builds a tree representation of the base directory.
    """
    base_path = Path(base_dir).resolve()
    if not base_path.exists() or not base_path.is_dir():
        return []

    tree: List[Dict[str, Any]] = []

    for entry in sorted(base_path.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower())):
        if entry.name in IGNORED_DIRS:
            continue

        item: Dict[str, Any] = {
            "name": entry.name,
            "path": str(entry.relative_to(base_path)).replace("\\", "/"),
            "is_dir": entry.is_dir(),
        }

        try:
            stat = entry.stat()
            item["size"] = stat.st_size
            item["modified_at"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
        except OSError:
            item["size"] = 0
            item["modified_at"] = None

        if entry.is_dir():
            item["children"] = get_file_tree(entry)

        tree.append(item)

    return tree


def read_file_preview(file_path: Path, max_bytes: int = 512000) -> Dict[str, Any]:
    """
    Reads file contents safely, handling binary vs text.
    """
    file_path = Path(file_path).resolve()
    if not file_path.exists() or not file_path.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    size = file_path.stat().st_size
    with open(file_path, "rb") as f:
        chunk = f.read(max_bytes)

    is_truncated = size > max_bytes
    try:
        text_content = chunk.decode("utf-8")
        return {
            "is_binary": False,
            "size": size,
            "truncated": is_truncated,
            "content": text_content,
        }
    except UnicodeDecodeError:
        return {
            "is_binary": True,
            "size": size,
            "truncated": is_truncated,
            "content": None,
        }


def safe_delete_to_trash(target_path: Path, base_dir: Path, trash_dir: Optional[Path] = None) -> Path:
    """
    Moves a file or directory into the trash folder instead of permanent deletion.
    """
    validated = validate_safe_path(base_dir, str(target_path.relative_to(base_dir)))
    if not validated.exists():
        raise FileNotFoundError(f"Cannot delete non-existent path: {validated}")

    if trash_dir is None:
        trash_dir = Path(base_dir) / ".trash"

    trash_dir = Path(trash_dir).resolve()
    trash_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest_name = f"{timestamp}_{validated.name}"
    destination = trash_dir / dest_name

    shutil.move(str(validated), str(destination))
    return destination
