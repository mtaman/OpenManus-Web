from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional


class ExtensionRegistry:
    def __init__(self):
        self.builtin_dir = Path(__file__).resolve().parent / "builtins"
        self.builtin_dir.mkdir(parents=True, exist_ok=True)

        backend_dir = Path(__file__).resolve().parent.parent.parent
        self.custom_dir = backend_dir / "storage" / "store" / "extensions"
        self.custom_dir.mkdir(parents=True, exist_ok=True)

        legacy_file = backend_dir / "storage" / "extensions.json"
        if legacy_file.exists():
            self._migrate_legacy_extensions(legacy_file)

    def _migrate_legacy_extensions(self, legacy_file: Path):
        try:
            data = json.loads(legacy_file.read_text(encoding="utf-8"))
            items = data if isinstance(data, list) else data.get("extensions", [])
            for item in items:
                ext_id = item.get("id")
                if ext_id and not (self.custom_dir / f"{ext_id}.json").exists():
                    target = self.custom_dir / f"{ext_id}.json"
                    target.write_text(json.dumps(item, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

    def _load_ext_from_file(self, file_path: Path, is_builtin: bool) -> Optional[Dict[str, Any]]:
        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                return None
            data.setdefault("id", file_path.stem)
            data["is_builtin"] = is_builtin
            return data
        except Exception:
            return None

    def list_extensions(self) -> List[Dict[str, Any]]:
        results: Dict[str, Dict[str, Any]] = {}
        if self.builtin_dir.exists():
            for p in sorted(self.builtin_dir.glob("*.json")):
                ext = self._load_ext_from_file(p, is_builtin=True)
                if ext and "id" in ext:
                    results[ext["id"]] = ext
        if self.custom_dir.exists():
            for p in sorted(self.custom_dir.glob("*.json")):
                ext = self._load_ext_from_file(p, is_builtin=False)
                if ext and "id" in ext:
                    results[ext["id"]] = ext
        return list(results.values())

    def get_extension(self, ext_id: str) -> Optional[Dict[str, Any]]:
        custom_file = self.custom_dir / f"{ext_id}.json"
        if custom_file.exists():
            return self._load_ext_from_file(custom_file, is_builtin=False)
        builtin_file = self.builtin_dir / f"{ext_id}.json"
        if builtin_file.exists():
            return self._load_ext_from_file(builtin_file, is_builtin=True)
        return None

    def toggle_status(self, ext_id: str) -> Dict[str, Any]:
        ext = self.get_extension(ext_id)
        if not ext:
            return {"error": f"Extension '{ext_id}' not found"}

        new_status = "ready" if ext.get("status") == "active" else "active"
        ext["status"] = new_status
        ext["is_builtin"] = False

        target_file = self.custom_dir / f"{ext_id}.json"
        target_file.write_text(json.dumps(ext, indent=2, ensure_ascii=False), encoding="utf-8")
        return ext

    def get_active_mcp_servers(self) -> List[Dict[str, Any]]:
        return [
            e for e in self.list_extensions()
            if e.get("type") in ["mcp_server", "mcp"] and e.get("status") == "active"
        ]

    def save_extension(self, data: Dict[str, Any]) -> Dict[str, Any]:
        ext_id = data.get("id")
        if not ext_id:
            raise ValueError("Extension id is required")
        target_file = self.custom_dir / f"{ext_id}.json"
        target_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        return data

    def delete_extension(self, ext_id: str) -> bool:
        custom_file = self.custom_dir / f"{ext_id}.json"
        if custom_file.exists():
            custom_file.unlink()
            return True
        return False


extension_registry = ExtensionRegistry()