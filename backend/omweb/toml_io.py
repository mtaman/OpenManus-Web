"""
OpenManus Web Dashboard - Safe TOML Configuration Manager.
Handles atomic reads, atomic writes, backups, and secret masking.
"""

import sys
if sys.version_info >= (3, 11):
    import tomllib
else:
    import tomli as tomllib
import tomli_w
from pathlib import Path
import shutil
from typing import Any, Dict

MASK_VALUE = "••••••••"
SENSITIVE_KEYS = {"api_key", "token", "password", "secret", "access_key", "secret_key"}

def is_sensitive_key(key: str) -> bool:
    return any(s in key.lower() for s in SENSITIVE_KEYS)

def mask_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    masked = {}
    for k, v in data.items():
        if isinstance(v, dict):
            masked[k] = mask_dict(v)
        elif isinstance(k, str) and is_sensitive_key(k) and isinstance(v, str) and v.strip():
            masked[k] = MASK_VALUE
        else:
            masked[k] = v
    return masked

def unmask_merge(new_data: Dict[str, Any], old_data: Dict[str, Any]) -> Dict[str, Any]:
    """Preserves existing real secrets if user submits masked string or empty string."""
    merged = {}
    for k, v in new_data.items():
        old_val = old_data.get(k)
        if isinstance(v, dict) and isinstance(old_val, dict):
            merged[k] = unmask_merge(v, old_val)
        elif isinstance(k, str) and is_sensitive_key(k) and isinstance(v, str):
            if "••••" in v or "****" in v or "***" in v or (not v.strip() and old_val):
                merged[k] = old_val
            else:
                merged[k] = v.strip()
        else:
            merged[k] = v
    return merged

def read_raw_config(file_path: Path) -> Dict[str, Any]:
    file_path = Path(file_path).resolve()
    if not file_path.exists():
        return {}
    with open(file_path, "rb") as f:
        return tomllib.load(f)

def get_masked_config(file_path: Path) -> Dict[str, Any]:
    raw = read_raw_config(file_path)
    return mask_dict(raw)

def write_config_atomic(file_path: Path, new_data: Dict[str, Any]) -> None:
    file_path = Path(file_path).resolve()
    file_path.parent.mkdir(parents=True, exist_ok=True)

    old_data = read_raw_config(file_path)
    final_data = unmask_merge(new_data, old_data)

    if file_path.exists():
        backup_path = file_path.with_suffix(".toml.bak")
        shutil.copy2(file_path, backup_path)

    temp_path = file_path.with_suffix(".toml.tmp")
    with open(temp_path, "wb") as f:
        tomli_w.dump(final_data, f)

    temp_path.replace(file_path)
