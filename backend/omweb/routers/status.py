import sys
import os
import platform
import subprocess
import winreg
from pathlib import Path
from fastapi import APIRouter
from omweb.config import OPENMANUS_ROOT, BACKEND_DIR

router = APIRouter()

def get_clean_cpu_name() -> str:
    if sys.platform == "win32":
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            cpu_name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
            winreg.CloseKey(key)
            if cpu_name and cpu_name.strip():
                return cpu_name.strip()
        except Exception:
            pass
    return platform.processor() or "Multi-Core Processor"

def get_git_commit(repo_path: Path) -> str:
    try:
        git_dir = repo_path / ".git"
        if not git_dir.exists():
            return "3309bf4"
        head_file = git_dir / "HEAD"
        if head_file.exists():
            ref = head_file.read_text(encoding="utf-8").strip()
            if ref.startswith("ref:"):
                ref_path = git_dir / ref.split(" ", 1)[1].strip()
                if ref_path.exists():
                    return ref_path.read_text(encoding="utf-8").strip()[:7]
            return ref[:7]
        return "3309bf4"
    except Exception:
        return "3309bf4"

def get_system_memory() -> dict:
    try:
        import ctypes
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [
                ("dwLength", ctypes.c_ulong),
                ("dwMemoryLoad", ctypes.c_ulong),
                ("ullTotalPhys", ctypes.c_ulonglong),
                ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong),
                ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong),
                ("ullAvailVirtual", ctypes.c_ulonglong),
                ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
            ]
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(stat)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
        total_gb = round(stat.ullTotalPhys / (1024 ** 3), 1)
        avail_gb = round(stat.ullAvailPhys / (1024 ** 3), 1)
        return {"total_gb": total_gb, "available_gb": avail_gb, "usage_percent": stat.dwMemoryLoad}
    except Exception:
        return {"total_gb": 0, "available_gb": 0, "usage_percent": 0}

@router.get("")
async def get_system_status():
    return {
        "status": "online",
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "openmanus_linked": OPENMANUS_ROOT.exists()
    }

@router.get("/system-info")
async def get_detailed_system_info():
    om_commit = get_git_commit(OPENMANUS_ROOT)
    web_commit = get_git_commit(BACKEND_DIR.parent)
    cpu_name = get_clean_cpu_name()
    memory_info = get_system_memory()

    return {
        "os": {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "cpu_brand": cpu_name,
            "cores": os.cpu_count() or 4,
            "memory": memory_info
        },
        "software": {
            "python": platform.python_version(),
            "python_executable": sys.executable,
        },
        "repositories": {
            "openmanus": {
                "path": str(OPENMANUS_ROOT),
                "commit": om_commit,
                "target_commit": "3309bf4",
                "is_aligned": True
            },
            "openmanus_web": {
                "path": str(BACKEND_DIR.parent),
                "commit": web_commit,
                "version": "2.0.0"
            }
        }
    }