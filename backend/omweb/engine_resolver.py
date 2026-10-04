"""
PELDRUN Dual-Engine Resolver.
Detects, validates, and manages active agent engines supporting both:
1. PELDRUN Core (Primary / Native standalone Python package)
2. OpenManus (Legacy / Secondary repository-based engine)
"""

from __future__ import annotations

import json
import os
import sys
import importlib.util
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

CONFIG_FILE = Path(__file__).resolve().parent.parent / "engine_config.json"
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class EngineType(str, Enum):
    """Supported agent execution engine architectures."""
    CORE = "peldrun-core"
    LEGACY = "openmanus"


def is_valid_core_dir(target_path: Path) -> bool:
    """Validate if directory contains a standalone peldrun-core package source."""
    if not target_path or not target_path.exists() or not target_path.is_dir():
        return False
    has_init = (target_path / "peldrun" / "__init__.py").is_file()
    has_pyproject = (target_path / "pyproject.toml").is_file()
    return has_init or (has_pyproject and (target_path / "peldrun").is_dir())


def is_valid_legacy_dir(target_path: Path) -> bool:
    """Validate if directory contains legacy OpenManus source files."""
    if not target_path or not target_path.exists() or not target_path.is_dir():
        return False
    has_agent = (target_path / "app" / "agent" / "peldrun.py").is_file() or (target_path / "app" / "agent" / "manus.py").is_file()
    has_config = (target_path / "config" / "config.toml").is_file() or (target_path / "config" / "config.example.toml").is_file()
    return has_agent and has_config


def is_valid_peldrun_dir(target_path: Path) -> bool:
    """Backward-compatible validator accepting either engine directory layout."""
    return is_valid_core_dir(target_path) or is_valid_legacy_dir(target_path)


def is_core_engine_available() -> bool:
    """Check if peldrun-core package is installed in environment or resolvable locally."""
    try:
        spec = importlib.util.find_spec("peldrun")
        if spec is not None:
            return True
    except Exception:
        pass

    candidates = [
        Path(r"D:\AI\peldrun-core"),
        PROJECT_ROOT.parent / "peldrun-core",
        PROJECT_ROOT / "engine" / "peldrun-core",
    ]
    return any(is_valid_core_dir(c.resolve()) for c in candidates)


def is_legacy_engine_available() -> bool:
    """Check if legacy OpenManus engine is available locally."""
    candidates = [
        PROJECT_ROOT / "engine" / "peldrun",
        PROJECT_ROOT.parent / "peldrun",
        Path(r"D:\AI\peldrun"),
        Path.home() / "peldrun",
    ]
    return any(is_valid_legacy_dir(c.resolve()) for c in candidates)


def get_persisted_engine_config() -> Dict[str, Any]:
    """Retrieve full engine configuration payload."""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def get_active_engine_type() -> EngineType:
    """
    Determine the active engine type.
    Prioritizes explicit user configuration, defaulting intelligently to PELDRUN Core.
    """
    config = get_persisted_engine_config()
    saved_type = str(config.get("engine_type", "")).lower().strip()

    if saved_type in [EngineType.CORE.value, "core", "peldrun"]:
        if is_core_engine_available():
            return EngineType.CORE
    elif saved_type in [EngineType.LEGACY.value, "legacy", "manus"]:
        if is_legacy_engine_available():
            return EngineType.LEGACY

    # Intelligent default: Use peldrun-core if available, fallback to legacy
    if is_core_engine_available():
        return EngineType.CORE
    if is_legacy_engine_available():
        return EngineType.LEGACY

    return EngineType.CORE


def set_active_engine_type(engine_type: Union[EngineType, str]) -> None:
    """Persist active engine selection."""
    resolved = engine_type.value if isinstance(engine_type, EngineType) else str(engine_type)
    config = get_persisted_engine_config()
    config["engine_type"] = resolved

    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)


def get_persisted_engine_path() -> Optional[Path]:
    """Retrieve saved engine path from config file."""
    config = get_persisted_engine_config()
    custom_path = config.get("peldrun_path")
    if custom_path:
        p = Path(custom_path).resolve()
        if is_valid_peldrun_dir(p):
            return p
    return None


def detect_potential_engine_paths() -> List[Dict[str, Any]]:
    """Probe environment and filesystem for all existing PELDRUN Core and Legacy installations."""
    candidates = [
        Path(r"D:\AI\peldrun-core"),
        PROJECT_ROOT.parent / "peldrun-core",
        PROJECT_ROOT / "engine" / "peldrun",
        PROJECT_ROOT.parent / "peldrun",
        Path(r"D:\AI\peldrun"),
        Path.home() / "peldrun-core",
        Path.home() / "peldrun",
    ]
    results = []
    seen = set()

    for candidate in candidates:
        cand_resolved = candidate.resolve()
        path_str = str(cand_resolved)
        if path_str in seen:
            continue
        seen.add(path_str)

        is_core = is_valid_core_dir(cand_resolved)
        is_legacy = is_valid_legacy_dir(cand_resolved)
        is_valid = is_core or is_legacy

        engine_kind = EngineType.CORE.value if is_core else (EngineType.LEGACY.value if is_legacy else "unknown")

        results.append({
            "path": path_str,
            "is_valid": is_valid,
            "is_embedded": cand_resolved.is_relative_to(PROJECT_ROOT) if hasattr(cand_resolved, "is_relative_to") else False,
            "engine_type": engine_kind,
        })

    return results


def resolve_active_engine_path() -> Path:
    """Resolve active engine filesystem path with robust fallback hierarchy."""
    active_type = get_active_engine_type()
    persisted = get_persisted_engine_path()

    if persisted:
        if active_type == EngineType.CORE and is_valid_core_dir(persisted):
            return persisted
        if active_type == EngineType.LEGACY and is_valid_legacy_dir(persisted):
            return persisted

    if active_type == EngineType.CORE:
        core_fallback = Path(r"D:\AI\peldrun-core").resolve()
        if is_valid_core_dir(core_fallback):
            save_engine_path(core_fallback, engine_type=EngineType.CORE.value)
            return core_fallback

    # Legacy fallbacks
    legacy_candidates = [
        (PROJECT_ROOT / "engine" / "peldrun").resolve(),
        Path(r"D:\AI\peldrun").resolve(),
    ]
    for cand in legacy_candidates:
        if is_valid_legacy_dir(cand):
            save_engine_path(cand, engine_type=EngineType.LEGACY.value)
            return cand

    return (PROJECT_ROOT / "engine" / "peldrun").resolve()


def save_engine_path(engine_path: Path, engine_type: Optional[str] = None) -> None:
    """Persist active engine path and optional engine type to configuration file."""
    engine_path = engine_path.resolve()
    config = get_persisted_engine_config()
    config["peldrun_path"] = str(engine_path)
    if engine_type:
        config["engine_type"] = engine_type

    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)


def inject_engine_to_syspath() -> Path:
    """Safely inject the resolved engine path into sys.path when required."""
    engine_path = resolve_active_engine_path()
    engine_str = str(engine_path)

    if is_valid_peldrun_dir(engine_path) and engine_str not in sys.path:
        sys.path.insert(0, engine_str)

    return engine_path


def get_engine_status() -> Dict[str, Any]:
    """Provide detailed runtime engine health and dual-core availability metrics."""
    active_type = get_active_engine_type()
    core_ver = "unavailable"

    if is_core_engine_available():
        try:
            import peldrun
            core_ver = getattr(peldrun, "__version__", "0.1.0")
        except Exception:
            core_ver = "installed"

    return {
        "active_engine": active_type.value,
        "core_available": is_core_engine_available(),
        "core_version": core_ver,
        "legacy_available": is_legacy_engine_available(),
        "engine_path": str(resolve_active_engine_path()),
    }