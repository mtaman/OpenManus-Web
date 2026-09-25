import json
import os
import sys
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List

CONFIG_FILE = Path(__file__).resolve().parent.parent / "engine_config.json"
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

def is_valid_openmanus_dir(target_path: Path) -> bool:
    """Validate if directory contains OpenManus core files."""
    if not target_path or not target_path.exists() or not target_path.is_dir():
        return False
    has_agent = (target_path / "app" / "agent" / "manus.py").is_file()
    has_config = (target_path / "config" / "config.toml").is_file() or (target_path / "config" / "config.example.toml").is_file()
    return has_agent and has_config

def get_persisted_engine_path() -> Optional[Path]:
    """Retrieve saved engine path from config file."""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                custom_path = data.get("openmanus_path")
                if custom_path:
                    p = Path(custom_path).resolve()
                    if is_valid_openmanus_dir(p):
                        return p
        except Exception:
            pass
    return None

def detect_potential_engine_paths() -> List[Dict[str, Any]]:
    """Probe system for existing OpenManus installations."""
    candidates = [
        PROJECT_ROOT / "engine" / "openmanus",
        PROJECT_ROOT.parent / "OpenManus",
        Path(r"D:\AI\OpenManus"),
        Path.home() / "OpenManus",
    ]
    results = []
    seen = set()
    for candidate in candidates:
        cand_resolved = candidate.resolve()
        if str(cand_resolved) in seen:
            continue
        seen.add(str(cand_resolved))
        is_valid = is_valid_openmanus_dir(cand_resolved)
        results.append({
            "path": str(cand_resolved),
            "is_valid": is_valid,
            "is_embedded": cand_resolved.is_relative_to(PROJECT_ROOT)
        })
    return results

def resolve_active_engine_path() -> Path:
    """Resolve active OpenManus path with fallback order."""
    persisted = get_persisted_engine_path()
    if persisted:
        return persisted

    # Probe embedded engine
    embedded = (PROJECT_ROOT / "engine" / "openmanus").resolve()
    if is_valid_openmanus_dir(embedded):
        save_engine_path(embedded)
        return embedded

    # Probe known local directory fallback
    fallback = Path(r"D:\AI\OpenManus").resolve()
    if is_valid_openmanus_dir(fallback):
        save_engine_path(fallback)
        return fallback

    # Default placeholder path
    return embedded

def save_engine_path(engine_path: Path) -> None:
    """Persist active engine path to configuration file."""
    engine_path = engine_path.resolve()
    payload = {"openmanus_path": str(engine_path)}
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

def inject_engine_to_syspath() -> Path:
    """Safely inject the resolved OpenManus path into sys.path."""
    engine_path = resolve_active_engine_path()
    engine_str = str(engine_path)
    if is_valid_openmanus_dir(engine_path) and engine_str not in sys.path:
        sys.path.insert(0, engine_str)
    return engine_path