from pathlib import Path
import sys

OPENMANUS_ROOT = Path(r"D:\AI\OpenManus")
if str(OPENMANUS_ROOT) not in sys.path:
    sys.path.insert(0, str(OPENMANUS_ROOT))

try:
    from app.config import config as om_config
    WORKSPACE_ROOT = Path(om_config.workspace_root).resolve()
except Exception:
    WORKSPACE_ROOT = (Path(r"D:\AI\OpenManus-Web") / "workspace").resolve()

WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)
TRASH_DIR = WORKSPACE_ROOT / ".trash"
TRASH_DIR.mkdir(parents=True, exist_ok=True)