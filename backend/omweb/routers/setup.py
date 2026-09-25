import os
import sys
import json
import asyncio
import importlib.util
from typing import Dict, List
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter()

REQUIRED_PACKAGES = [
    "fastapi", "uvicorn", "pydantic", "sse_starlette",
    "docker", "structlog", "boto3", "playwright", "httpx",
    "tiktoken", "openai", "tenacity", "loguru", "html2text",
    "PIL", "unidiff", "baidusearch"
]

def check_package(pkg_name: str) -> bool:
    try:
        return importlib.util.find_spec(pkg_name) is not None
    except Exception:
        return False

def check_core_files() -> bool:
    core_path = r"D:\AI\OpenManus\app\agent\manus.py"
    return os.path.exists(core_path)

@router.get("/status")
async def get_setup_status():
    pkg_status: Dict[str, bool] = {pkg: check_package(pkg) for pkg in REQUIRED_PACKAGES}
    missing = [pkg for pkg, installed in pkg_status.items() if not installed]
    core_ok = check_core_files()
    all_ready = (len(missing) == 0) and core_ok

    return {
        "ready": all_ready,
        "core_installed": core_ok,
        "packages": {
            "total": len(REQUIRED_PACKAGES),
            "installed": len(REQUIRED_PACKAGES) - len(missing),
            "missing": missing,
            "details": pkg_status
        }
    }

@router.get("/stream")
async def stream_installation():
    async def event_generator():
        yield {"event": "status", "data": json.dumps({"step": "init", "message": "Starting dependency synchronization..."})}
        await asyncio.sleep(0.5)

        python_exe = sys.executable
        packages_to_install = [
            "docker", "structlog", "boto3", "botocore", 
            "playwright", "aiofiles", "unidiff", "pillow", "baidusearch"
        ]

        proc = await asyncio.create_subprocess_exec(
            python_exe, "-m", "pip", "install", *packages_to_install,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT
        )

        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace").strip()
            if text:
                yield {"event": "log", "data": json.dumps({"output": text})}

        await proc.wait()

        if proc.returncode == 0:
            yield {"event": "status", "data": json.dumps({"step": "complete", "message": "Dependencies installed successfully!"})}
        else:
            yield {"event": "status", "data": json.dumps({"step": "error", "message": f"Installation failed with code {proc.returncode}"})}

    return EventSourceResponse(event_generator())