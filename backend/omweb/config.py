from pathlib import Path
from omweb.engine_resolver import resolve_active_engine_path, is_valid_openmanus_dir

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent

OPENMANUS_ROOT = resolve_active_engine_path()
OPENMANUS_CONFIG_PATH = OPENMANUS_ROOT / "config" / "config.toml"
WORKSPACE_ROOT = OPENMANUS_ROOT / "workspace"

def get_engine_status() -> dict:
    is_valid = is_valid_openmanus_dir(OPENMANUS_ROOT)
    return {
        "engine_path": str(OPENMANUS_ROOT),
        "is_valid": is_valid,
        "is_embedded": OPENMANUS_ROOT.is_relative_to(PROJECT_ROOT) if is_valid else False,
        "has_config": OPENMANUS_CONFIG_PATH.is_file(),
        "workspace_exists": WORKSPACE_ROOT.is_dir()
    }