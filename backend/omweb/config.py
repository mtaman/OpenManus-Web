import os
import sys
from pathlib import Path
from typing import Dict, Any

# Base backend directory: OpenManus-Web/backend
BACKEND_DIR = Path(__file__).resolve().parent.parent

# Base project root: OpenManus-Web
WEB_ROOT = BACKEND_DIR.parent

# Import dynamic engine resolution
from omweb.engine_resolver import (
    get_persisted_engine_path,
    detect_potential_engine_paths,
    is_valid_openmanus_dir,
    PROJECT_ROOT
)

def resolve_openmanus_root() -> Path:
    # 1. Check if user configured path via Setup Wizard
    persisted = get_persisted_engine_path()
    if persisted and is_valid_openmanus_dir(persisted):
        return persisted

    # 2. Check environment variable
    env_path = os.getenv("OPENMANUS_ROOT")
    if env_path and is_valid_openmanus_dir(Path(env_path)):
        return Path(env_path).resolve()

    # 3. Check detected candidates automatically
    candidates = detect_potential_engine_paths()
    for cand in candidates:
        cand_path = Path(cand["path"]) if isinstance(cand, dict) and "path" in cand else cand
        if isinstance(cand_path, Path) and is_valid_openmanus_dir(cand_path):
            return cand_path.resolve()

    # 4. Fallback to sibling or local embedded
    sibling = WEB_ROOT.parent / "OpenManus"
    if is_valid_openmanus_dir(sibling):
        return sibling.resolve()

    return (PROJECT_ROOT / "engine" / "openmanus").resolve()

OPENMANUS_ROOT = resolve_openmanus_root()
WORKSPACE_ROOT = OPENMANUS_ROOT / "workspace"
WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)

# Ensure OpenManus is on python sys.path
if str(OPENMANUS_ROOT) not in sys.path:
    sys.path.insert(0, str(OPENMANUS_ROOT))

def get_engine_status() -> Dict[str, Any]:
    """Status helper for setup wizard /api/setup/status."""
    curr = resolve_openmanus_root()
    is_valid = is_valid_openmanus_dir(curr)
    embedded_dir = (PROJECT_ROOT / "engine" / "openmanus").resolve()
    is_embedded = (curr == embedded_dir)
    has_cfg = (curr / "config" / "config.toml").is_file() or (curr / "config" / "config.example.toml").is_file()
    ws_exists = (curr / "workspace").is_dir()

    return {
        "engine_path": str(curr),
        "is_valid": is_valid,
        "is_embedded": is_embedded,
        "has_config": has_cfg,
        "workspace_exists": ws_exists
    }