import json
from pathlib import Path
from typing import Dict, Any, List, Optional


class ToolRegistry:
    def __init__(self):
        self.builtin_dir = Path(__file__).resolve().parent / "builtins"
        self.builtin_dir.mkdir(parents=True, exist_ok=True)

        base_dir = Path(__file__).resolve().parent.parent.parent
        self.custom_dir = base_dir / "storage" / "store" / "tools"
        self.custom_dir.mkdir(parents=True, exist_ok=True)

    def _load_tool_from_file(self, file_path: Path, is_builtin: bool) -> Optional[Dict[str, Any]]:
        try:
            data = json.loads(file_path.read_text(encoding="utf-8-sig"))
            if isinstance(data, dict) and data.get("id"):
                data["is_builtin"] = is_builtin
                data["read_only"] = is_builtin
                return data
        except Exception:
            pass
        return None

    def list_tools(self) -> List[Dict[str, Any]]:
        """Dynamically scans both builtin and custom folders for all tool JSON manifests."""
        tools = []
        seen = set()

        for f in sorted(self.builtin_dir.glob("*.json")):
            t = self._load_tool_from_file(f, is_builtin=True)
            if t and t["id"] not in seen:
                tools.append(t)
                seen.add(t["id"])

        for f in sorted(self.custom_dir.glob("*.json")):
            t = self._load_tool_from_file(f, is_builtin=False)
            if t and t["id"] not in seen:
                tools.append(t)
                seen.add(t["id"])

        return tools

    def get_tool(self, tool_id: str) -> Optional[Dict[str, Any]]:
        b_file = self.builtin_dir / f"{tool_id}.json"
        if b_file.exists():
            return self._load_tool_from_file(b_file, is_builtin=True)
        c_file = self.custom_dir / f"{tool_id}.json"
        if c_file.exists():
            return self._load_tool_from_file(c_file, is_builtin=False)
        for t in self.list_tools():
            if t["id"] == tool_id:
                return t
        return None


tool_registry = ToolRegistry()
