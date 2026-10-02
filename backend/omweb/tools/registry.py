"""
Sovereign Tool Registry - Handles discovery, upload validation, toggling, and hot-reloading.
"""

from __future__ import annotations
import os
import sys
import json
import inspect
import importlib.util
from pathlib import Path
from typing import Dict, Any, List, Optional

from omweb.tools.base import SovereignBaseTool


class ToolRegistry:
    def __init__(self):
        backend_dir = Path(__file__).resolve().parent.parent.parent
        self.custom_tools_dir = backend_dir / "storage" / "store" / "tools" / "custom"
        self.custom_tools_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = backend_dir / "storage" / "store" / "tools" / "tools_state.json"
        self._builtin_tools: Dict[str, Dict[str, Any]] = self._init_builtin_tools()

    def _init_builtin_tools(self) -> Dict[str, Dict[str, Any]]:
        return {
            "python_execute": {
                "id": "python_execute",
                "name": "Python Sandbox",
                "description": "Executes sandboxed Python scripts and code snippets in the active workspace.",
                "category": "execution",
                "safety_level": "safe",
                "is_builtin": True,
                "is_enabled": True
            },
            "bash": {
                "id": "bash",
                "name": "Bash Terminal",
                "description": "Executes terminal commands and shell routines in workspace directory.",
                "category": "system",
                "safety_level": "dangerous",
                "is_builtin": True,
                "is_enabled": True
            },
            "str_replace_editor": {
                "id": "str_replace_editor",
                "name": "File Editor",
                "description": "Reads, creates, and performs surgery string replacements on workspace files.",
                "category": "storage",
                "safety_level": "safe",
                "is_builtin": True,
                "is_enabled": True
            },
            "web_search": {
                "id": "web_search",
                "name": "Web Search",
                "description": "Queries Google and fallback search providers for up-to-date documentation.",
                "category": "network",
                "safety_level": "safe",
                "is_builtin": True,
                "is_enabled": True
            },
            "browser_use": {
                "id": "browser_use",
                "name": "Headless Browser Navigation",
                "description": "Navigates and scrapes web pages via remote browser connection.",
                "category": "network",
                "safety_level": "read_only",
                "is_builtin": True,
                "is_enabled": True
            },
            "ask_human": {
                "id": "ask_human",
                "name": "Human Feedback Inquirer",
                "description": "Pauses agent plan execution and requests interactive feedback from the human operator.",
                "category": "interaction",
                "safety_level": "safe",
                "is_builtin": True,
                "is_enabled": True
            }
        }

    def _load_states(self) -> Dict[str, bool]:
        if self.state_file.exists():
            try:
                return json.loads(self.state_file.read_text(encoding="utf-8"))
            except Exception:
                return {}
        return {}

    def _save_states(self, states: Dict[str, bool]) -> None:
        try:
            self.state_file.write_text(json.dumps(states, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"[TOOL REGISTRY ERROR] Could not save tool states: {e}")

    def list_tools(self) -> List[Dict[str, Any]]:
        states = self._load_states()
        results: Dict[str, Dict[str, Any]] = {}

        # 1. Built-in tools
        for tid, tmeta in self._builtin_tools.items():
            copied = dict(tmeta)
            copied["is_enabled"] = states.get(tid, True)
            copied["status"] = "active" if copied["is_enabled"] else "disabled"
            results[tid] = copied

        # 2. Custom Python and JSON uploaded tools
        if self.custom_tools_dir.exists():
            for p in self.custom_tools_dir.glob("*.*"):
                if p.suffix.lower() == ".json":
                    try:
                        data = json.loads(p.read_text(encoding="utf-8"))
                        tid = data.get("id") or p.stem
                        data["id"] = tid
                        data["is_builtin"] = False
                        data["is_enabled"] = states.get(tid, data.get("is_enabled", True))
                        data["status"] = "active" if data["is_enabled"] else "disabled"
                        data.setdefault("category", "custom")
                        data.setdefault("safety_level", "custom")
                        results[tid] = data
                    except Exception:
                        continue
                elif p.suffix.lower() == ".py":
                    tid = p.stem
                    results[tid] = {
                        "id": tid,
                        "name": tid.replace("_", " ").title(),
                        "description": f"Custom Python script tool loaded from '{p.name}'.",
                        "category": "custom",
                        "safety_level": "custom",
                        "is_builtin": False,
                        "is_enabled": states.get(tid, True),
                        "status": "active" if states.get(tid, True) else "disabled",
                        "file_path": str(p.resolve())
                    }

        return list(results.values())

    def toggle_tool_status(self, tool_id: str) -> Dict[str, Any]:
        tools = {t["id"]: t for t in self.list_tools()}
        if tool_id not in tools:
            return {"error": f"Tool '{tool_id}' not found"}

        states = self._load_states()
        current_state = states.get(tool_id, tools[tool_id].get("is_enabled", True))
        new_state = not current_state
        states[tool_id] = new_state
        self._save_states(states)

        tools[tool_id]["is_enabled"] = new_state
        tools[tool_id]["status"] = "active" if new_state else "disabled"
        return tools[tool_id]

    def save_custom_tool_file(self, filename: str, content: bytes) -> Dict[str, Any]:
        target_path = self.custom_tools_dir / filename
        target_path.write_bytes(content)
        tool_id = target_path.stem

        if filename.endswith(".py"):
            return {
                "id": tool_id,
                "name": tool_id.replace("_", " ").title(),
                "description": f"Custom Python tool registered from '{filename}'.",
                "category": "custom",
                "status": "active",
                "is_builtin": False
            }
        elif filename.endswith(".json"):
            try:
                data = json.loads(content.decode("utf-8"))
                data.setdefault("id", tool_id)
                data.setdefault("name", tool_id)
                data["is_builtin"] = False
                data["status"] = "active"
                return data
            except Exception as e:
                return {"id": tool_id, "error": f"Invalid JSON manifest: {e}"}

        return {"id": tool_id, "status": "active"}

    def delete_custom_tool(self, tool_id: str) -> bool:
        for p in self.custom_tools_dir.glob(f"{tool_id}.*"):
            try:
                p.unlink()
                return True
            except Exception:
                pass
        return False


tool_registry = ToolRegistry()