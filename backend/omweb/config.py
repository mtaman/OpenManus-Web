import os
import sys
from pathlib import Path
from typing import Dict, Any

from omweb.engine_resolver import (
    get_persisted_engine_path,
    is_valid_openmanus_dir,
    PROJECT_ROOT
)

# Anchor storage strictly within OpenManus-Web root
STORAGE_ROOT = (PROJECT_ROOT / "storage").resolve()
CHATS_DIR = STORAGE_ROOT / "chats"
PROJECTS_DIR = STORAGE_ROOT / "projects"

STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
CHATS_DIR.mkdir(parents=True, exist_ok=True)
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

def resolve_openmanus_root() -> Path:
    persisted = get_persisted_engine_path()
    if persisted and is_valid_openmanus_dir(persisted):
        return persisted

    env_path = os.getenv("OPENMANUS_ROOT")
    if env_path and is_valid_openmanus_dir(Path(env_path)):
        return Path(env_path).resolve()

    embedded_dir = (PROJECT_ROOT / "engine" / "openmanus").resolve()
    if is_valid_openmanus_dir(embedded_dir):
        return embedded_dir

    adjacent_dir = (PROJECT_ROOT.parent / "OpenManus").resolve()
    if is_valid_openmanus_dir(adjacent_dir):
        return adjacent_dir

    return adjacent_dir if adjacent_dir.exists() else PROJECT_ROOT

def get_workspace_root() -> Path:
    """Returns local storage root for user deliverables and workspaces."""
    return STORAGE_ROOT

def get_storage_root() -> Path:
    return STORAGE_ROOT

OPENMANUS_ROOT = resolve_openmanus_root()
WORKSPACE_ROOT = get_workspace_root()
BACKEND_DIR = Path(__file__).resolve().parent.parent

if str(OPENMANUS_ROOT) not in sys.path:
    sys.path.insert(0, str(OPENMANUS_ROOT))

def get_engine_status() -> Dict[str, Any]:
    curr = resolve_openmanus_root()
    is_valid = is_valid_openmanus_dir(curr)
    embedded_dir = (PROJECT_ROOT / "engine" / "openmanus").resolve()
    has_cfg = (curr / "config" / "config.toml").exists()
    return {
        "engine_path": str(curr),
        "is_valid": is_valid,
        "is_embedded": curr == embedded_dir,
        "has_config": has_cfg,
        "storage_root": str(STORAGE_ROOT),
        "workspace_exists": STORAGE_ROOT.exists()
    }
