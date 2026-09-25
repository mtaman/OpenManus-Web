from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import subprocess
import shutil

from omweb.engine_resolver import (
    get_persisted_engine_path,
    detect_potential_engine_paths,
    is_valid_openmanus_dir,
    save_engine_path,
    PROJECT_ROOT
)
from omweb.config import get_engine_status

router = APIRouter()

class LinkEngineRequest(BaseModel):
    engine_path: str

@router.get("/status")
async def setup_status():
    return get_engine_status()

@router.post("/detect")
async def detect_engines():
    return {"candidates": detect_potential_engine_paths()}

@router.post("/link")
async def link_engine(payload: LinkEngineRequest):
    target_path = Path(payload.engine_path).resolve()
    if not is_valid_openmanus_dir(target_path):
        raise HTTPException(status_code=400, detail="Invalid OpenManus directory: missing app/agent/manus.py or config files")
    save_engine_path(target_path)
    return {"status": "linked", "engine_path": str(target_path)}

@router.post("/install-embedded")
async def install_embedded():
    embedded_dir = (PROJECT_ROOT / "engine" / "openmanus").resolve()
    if is_valid_openmanus_dir(embedded_dir):
        save_engine_path(embedded_dir)
        return {"status": "already_installed", "engine_path": str(embedded_dir)}

    embedded_dir.parent.mkdir(parents=True, exist_ok=True)

    try:
        # Clone OpenManus core repo
        subprocess.run(
            ["git", "clone", "https://github.com/FoundationAgents/OpenManus.git", str(embedded_dir)],
            check=True,
            capture_output=True,
            text=True
        )

        # Copy example config if needed
        example_cfg = embedded_dir / "config" / "config.example.toml"
        target_cfg = embedded_dir / "config" / "config.toml"
        if example_cfg.exists() and not target_cfg.exists():
            shutil.copyfile(example_cfg, target_cfg)

        save_engine_path(embedded_dir)
        return {"status": "installed", "engine_path": str(embedded_dir)}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Git clone failed: {e.stderr}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))