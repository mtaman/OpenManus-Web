"""
Configuration Router.
Provides endpoints to inspect and update system configurations safely.
"""

from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, HTTPException
from omweb.toml_io import get_masked_config, write_config_atomic, read_raw_config

router = APIRouter()

# Default config path inside OpenManus-Web (or referenced external)
CONFIG_PATH = Path(r"D:\AI\OpenManus-Web\config.toml")
OPENMANUS_DEFAULT_CONFIG = Path(r"D:\AI\OpenManus\config\config.toml")


def resolve_active_config_path() -> Path:
    if CONFIG_PATH.exists():
        return CONFIG_PATH
    if OPENMANUS_DEFAULT_CONFIG.exists():
        return OPENMANUS_DEFAULT_CONFIG
    return CONFIG_PATH


@router.get("")
async def get_config() -> Dict[str, Any]:
    active_path = resolve_active_config_path()
    try:
        masked = get_masked_config(active_path)
        return {"status": "ok", "path": str(active_path), "config": masked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read configuration: {str(e)}")


@router.put("")
async def update_config(payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        write_config_atomic(CONFIG_PATH, payload)
        updated_masked = get_masked_config(CONFIG_PATH)
        return {"status": "updated", "path": str(CONFIG_PATH), "config": updated_masked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")

