import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional

from omweb.engine_resolver import (
    get_persisted_engine_path,
    is_valid_openmanus_dir,
    PROJECT_ROOT
)
# Removed 'DEFAULT_OPENMANUS_ROOT' as it does not exist in engine_resolver.py.

def resolve_openmanus_root() -> Path:
    # 1. Check if user configured path via Setup Wizard
    persisted = get_persisted_engine_path()
    if persisted and is_valid_openmanus_dir(persisted):
        return persisted

    # 2. Check environment variable
    env_path = os.getenv("OPENMANUS_ROOT")
    if env_path and is_valid_openmanus_dir(Path(env_path)):
        return Path(env_path).resolve()

    # 3. Check embedded engine in engine/openmanus
    embedded_dir = (PROJECT_ROOT / "engine" / "openmanus").resolve()
    if is_valid_openmanus_dir(embedded_dir):
        return embedded_dir

    # 4. Check adjacent OpenManus folder
    adjacent_dir = (PROJECT_ROOT.parent / "OpenManus").resolve()
    if is_valid_openmanus_dir(adjacent_dir):
        return adjacent_dir

    # 5. Default fallback to adjacent or project root
    return adjacent_dir if adjacent_dir.exists() else PROJECT_ROOT

def get_workspace_root() -> Path:
    """Dynamically resolve workspace directory based on current active engine."""
    root = resolve_openmanus_root()
    ws = root / "workspace"
    ws.mkdir(parents=True, exist_ok=True)
    return ws

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
    ws_exists = (curr / "workspace").exists()
    return {
        "engine_path": str(curr),
        "is_valid": is_valid,
        "is_embedded": curr == embedded_dir,
        "has_config": has_cfg,
        "workspace_exists": ws_exists
    }