import json
from pathlib import Path
from typing import Dict, Any, List, Optional


class ExtensionRegistry:
    def __init__(self):
        self.builtin_dir = Path(__file__).resolve().parent / "builtins"
        self.builtin_dir.mkdir(parents=True, exist_ok=True)

        base_dir = Path(__file__).resolve().parent.parent.parent
        self.custom_dir = base_dir / "storage" / "store" / "extensions"
        self.custom_dir.mkdir(parents=True, exist_ok=True)

        self._migrate_legacy_extensions(base_dir / "storage" / "store" / "extensions.json")

    def _migrate_legacy_extensions(self, legacy_file: Path):
        if legacy_file.exists():
            try:
                data = json.loads(legacy_file.read_text(encoding="utf-8-sig"))
                if isinstance(data, list):
                    for ext in data:
                        ext_id = ext.get("id")
                        if ext_id and not (self.builtin_dir / f"{ext_id}.json").exists() and not (self.custom_dir / f"{ext_id}.json").exists():
                            (self.custom_dir / f"{ext_id}.json").write_text(
                                json.dumps(ext, indent=2, ensure_ascii=False), encoding="utf-8-sig"
                            )
            except Exception:
                pass

    def _load_ext_from_file(self, file_path: Path, is_builtin: bool) -> Optional[Dict[str, Any]]:
        try:
            data = json.loads(file_path.read_text(encoding="utf-8-sig"))
            if isinstance(data, dict) and data.get("id"):
                data["is_builtin"] = is_builtin
                data["read_only"] = is_builtin
                return data
        except Exception:
            pass
        return None

    def list_extensions(self) -> List[Dict[str, Any]]:
        """Dynamically scans both builtin and custom folders for all extension JSON manifests."""
        extensions = []
        seen = set()

        for f in sorted(self.builtin_dir.glob("*.json")):
            e = self._load_ext_from_file(f, is_builtin=True)
            if e and e["id"] not in seen:
                extensions.append(e)
                seen.add(e["id"])

        for f in sorted(self.custom_dir.glob("*.json")):
            e = self._load_ext_from_file(f, is_builtin=False)
            if e and e["id"] not in seen:
                extensions.append(e)
                seen.add(e["id"])

        return extensions

    def get_extension(self, ext_id: str) -> Optional[Dict[str, Any]]:
        b_file = self.builtin_dir / f"{ext_id}.json"
        if b_file.exists():
            return self._load_ext_from_file(b_file, is_builtin=True)
        c_file = self.custom_dir / f"{ext_id}.json"
        if c_file.exists():
            return self._load_ext_from_file(c_file, is_builtin=False)
        for e in self.list_extensions():
            if e["id"] == ext_id:
                return e
        return None


extension_registry = ExtensionRegistry()
