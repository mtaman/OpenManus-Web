import os
import sys
from pathlib import Path
from typing import Dict, Any

from omweb.engine_resolver import (
    get_persisted_engine_path,
    is_valid_openmanus_dir,
    PROJECT_ROOT
)

STORAGE_ROOT = (PROJECT_ROOT / "storage").resolve()
CHATS_DIR = STORAGE_ROOT / "chats"
PROJECTS_DIR = STORAGE_ROOT / "projects"
CONFIG_DIR = (PROJECT_ROOT / "config").resolve()

STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
CHATS_DIR.mkdir(parents=True, exist_ok=True)
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

def resolve_openmanus_root() -> Path:
    persisted = get_persisted_engine_path()
    if persisted and is_valid_openmanus_dir(persisted):
        return persisted

    adjacent_dir = (PROJECT_ROOT.parent / "OpenManus").resolve()
    if is_valid_openmanus_dir(adjacent_dir):
        return adjacent_dir

    return PROJECT_ROOT

OPENMANUS_ROOT = resolve_openmanus_root()
WORKSPACE_ROOT = STORAGE_ROOT
BACKEND_DIR = Path(__file__).resolve().parent.parent

# Register both project root, backend, and external engine in sys.path
for p in [str(PROJECT_ROOT), str(PROJECT_ROOT / "backend"), str(OPENMANUS_ROOT)]:
    if p not in sys.path:
        sys.path.insert(0, p)

def get_workspace_root() -> Path:
    return STORAGE_ROOT

def get_storage_root() -> Path:
    return STORAGE_ROOT

def get_engine_status() -> Dict[str, Any]:
    has_cfg = (PROJECT_ROOT / "config" / "config.toml").exists()
    return {
        "engine_path": str(OPENMANUS_ROOT),
        "is_valid": is_valid_openmanus_dir(OPENMANUS_ROOT),
        "is_embedded": False,
        "has_config": has_cfg,
        "storage_root": str(STORAGE_ROOT),
        "workspace_exists": STORAGE_ROOT.exists()
    }
