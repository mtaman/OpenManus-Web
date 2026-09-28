import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
WORKSPACE_DIR = PROJECT_ROOT / "workspace"
STORAGE_DIR = PROJECT_ROOT / "storage"
CHATS_DIR = STORAGE_DIR / "chats"
PROJECTS_DIR = STORAGE_DIR / "projects"

for d in [WORKSPACE_DIR, STORAGE_DIR, CHATS_DIR, PROJECTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class OpenPathRequest(BaseModel):
    path: str
    is_absolute: bool = False

def safe_resolve(target_path: str, base_dir: Path = PROJECT_ROOT) -> Path:
    target = (base_dir / target_path).resolve()
    try:
        target.relative_to(PROJECT_ROOT)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied: path outside project root")
    return target

def get_dir_size(path: Path) -> int:
    if not path.exists():
        return 0
    total = 0
    try:
        for entry in path.rglob("*"):
            if entry.is_file():
                total += entry.stat().st_size
    except Exception:
        pass
    return total

def detect_file_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in [".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif", ".ico"]:
        return "image"
    if ext in [".html", ".htm"]:
        return "html"
    if ext in [".md", ".markdown"]:
        return "markdown"
    if ext in [".json", ".csv", ".tsv"]:
        return "data"
    if ext in [".py", ".js", ".ts", ".tsx", ".jsx", ".css", ".java", ".cpp", ".c", ".rs", ".go", ".sql", ".sh", ".bat", ".ps1"]:
        return "code"
    return "file"

@router.get("/stats")
async def get_storage_stats():
    try:
        total, used, free = shutil.disk_usage(str(PROJECT_ROOT))
        total_gb = round(total / (1024 ** 3), 2)
        used_gb = round(used / (1024 ** 3), 2)
        free_gb = round(free / (1024 ** 3), 2)
        used_pct = round((used / total) * 100, 1) if total > 0 else 0

        chats_size = get_dir_size(CHATS_DIR)
        projects_size = get_dir_size(PROJECTS_DIR)
        workspace_size = get_dir_size(WORKSPACE_DIR)

        # Count both files and subdirectories
        chats_count = len(list(CHATS_DIR.iterdir())) if CHATS_DIR.exists() else 0
        projects_count = len(list(PROJECTS_DIR.iterdir())) if PROJECTS_DIR.exists() else 0

        return {
            "disk": {
                "total_gb": total_gb,
                "used_gb": used_gb,
                "free_gb": free_gb,
                "used_pct": used_pct,
            },
            "folders": {
                "chats": {"size": chats_size, "count": chats_count, "path": str(CHATS_DIR)},
                "projects": {"size": projects_size, "count": projects_count, "path": str(PROJECTS_DIR)},
                "workspace": {"size": workspace_size, "path": str(WORKSPACE_DIR)},
            },
            "storage_path": str(STORAGE_DIR),
            "root_path": str(PROJECT_ROOT)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/explorer")
async def get_storage_explorer(folder: str = Query("chats", pattern="^(chats|projects|workspace)$")):
    target_dir = CHATS_DIR if folder == "chats" else (PROJECTS_DIR if folder == "projects" else WORKSPACE_DIR)
    items = []
    if target_dir.exists():
        for entry in sorted(target_dir.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
            try:
                stat = entry.stat()
                items.append({
                    "name": entry.name,
                    "rel_path": str(entry.relative_to(PROJECT_ROOT)).replace("\\", "/"),
                    "is_dir": entry.is_dir(),
                    "size": get_dir_size(entry) if entry.is_dir() else stat.st_size,
                    "modified": int(stat.st_mtime),
                    "type": "folder" if entry.is_dir() else detect_file_type(entry.name),
                })
            except Exception:
                continue
    return {
        "folder": folder,
        "abs_path": str(target_dir),
        "items": items
    }

@router.post("/open-path")
async def open_in_windows_explorer(req: OpenPathRequest):
    try:
        if req.is_absolute:
            target = Path(req.path).resolve()
        else:
            target = safe_resolve(req.path)

        if not target.exists():
            if target.parent.exists():
                target = target.parent
            else:
                raise HTTPException(status_code=404, detail="Path does not exist on disk")

        if os.name == "nt":
            target_str = str(target)
            if target.is_dir():
                # Launch and bring to foreground via PowerShell COM Object
                ps_cmd = f'$p = Start-Process explorer.exe -ArgumentList "{target_str}" -PassThru; Start-Sleep -Milliseconds 150; (New-Object -ComObject WScript.Shell).AppActivate($p.Id)'
                subprocess.Popen(["powershell.exe", "-NoProfile", "-Command", ps_cmd])
            else:
                ps_cmd = f'$p = Start-Process explorer.exe -ArgumentList "/select,`"{target_str}`"" -PassThru; Start-Sleep -Milliseconds 150; (New-Object -ComObject WScript.Shell).AppActivate($p.Id)'
                subprocess.Popen(["powershell.exe", "-NoProfile", "-Command", ps_cmd])

            return {"status": "success", "message": f"Opened {target.name} in foreground"}
        else:
            return {"status": "error", "message": "OS is not Windows"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open explorer: {str(e)}")

@router.post("/clear-chats")
async def clear_chat_storage():
    deleted_count = 0
    if CHATS_DIR.exists():
        for item in CHATS_DIR.iterdir():
            try:
                if item.is_file() or item.is_symlink():
                    item.unlink()
                    deleted_count += 1
                elif item.is_dir():
                    shutil.rmtree(item)
                    deleted_count += 1
            except Exception as e:
                continue
    return {"status": "success", "deleted_count": deleted_count, "message": f"Cleared {deleted_count} items from chats storage"}