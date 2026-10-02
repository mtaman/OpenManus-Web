import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional


class AgentRegistry:
    def __init__(self):
        self.builtin_dir = Path(__file__).resolve().parent / "builtins"
        self.builtin_dir.mkdir(parents=True, exist_ok=True)

        base_dir = Path(__file__).resolve().parent.parent.parent
        self.custom_dir = base_dir / "storage" / "store" / "agents"
        self.custom_dir.mkdir(parents=True, exist_ok=True)

        self._migrate_legacy_agents(base_dir / "storage" / "store" / "agents.json")

    def _migrate_legacy_agents(self, legacy_file: Path):
        """Migrate any agents from legacy single agents.json file into individual files."""
        if legacy_file.exists():
            try:
                data = json.loads(legacy_file.read_text(encoding="utf-8-sig"))
                if isinstance(data, list):
                    for ag in data:
                        ag_id = ag.get("id")
                        if ag_id and not (self.custom_dir / f"{ag_id}.json").exists():
                            (self.custom_dir / f"{ag_id}.json").write_text(
                                json.dumps(ag, indent=2, ensure_ascii=False), encoding="utf-8-sig"
                            )
            except Exception:
                pass

    def _load_agent_from_file(self, file_path: Path, is_builtin: bool) -> Optional[Dict[str, Any]]:
        try:
            data = json.loads(file_path.read_text(encoding="utf-8-sig"))
            if isinstance(data, dict) and data.get("id"):
                data["is_builtin"] = is_builtin
                data["read_only"] = is_builtin
                return data
        except Exception:
            pass
        return None

    def list_agents(self) -> List[Dict[str, Any]]:
        """Dynamically scans both builtin and custom folders for all agent JSON manifests."""
        agents = []
        seen_ids = set()

        # 1. Built-in system agents (read-only)
        for f in sorted(self.builtin_dir.glob("*.json")):
            ag = self._load_agent_from_file(f, is_builtin=True)
            if ag and ag["id"] not in seen_ids:
                agents.append(ag)
                seen_ids.add(ag["id"])

        # 2. Custom store agents (user created or dropped into folder)
        for f in sorted(self.custom_dir.glob("*.json")):
            ag = self._load_agent_from_file(f, is_builtin=False)
            if ag and ag["id"] not in seen_ids:
                agents.append(ag)
                seen_ids.add(ag["id"])

        return agents

    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        # Check builtins first
        b_file = self.builtin_dir / f"{agent_id}.json"
        if b_file.exists():
            return self._load_agent_from_file(b_file, is_builtin=True)

        # Check custom store
        c_file = self.custom_dir / f"{agent_id}.json"
        if c_file.exists():
            return self._load_agent_from_file(c_file, is_builtin=False)

        # Fallback search across all dynamically listed
        for ag in self.list_agents():
            if ag["id"] == agent_id:
                return ag
        return self.get_agent("manus")

    def create_custom_agent(self, data: Dict[str, Any]) -> Dict[str, Any]:
        agent_id = data.get("id") or f"custom_{int(time.time())}"
        target_file = self.custom_dir / f"{agent_id}.json"

        new_agent = {
            "id": agent_id,
            "name": data.get("name", "Custom Agent"),
            "role": data.get("role", "Specialist"),
            "icon": data.get("icon", "Sparkles"),
            "description": data.get("description", ""),
            "system_prompt": data.get("system_prompt", ""),
            "tools": data.get("tools", ["bash", "python_execute", "file_saver"]),
            "max_steps": int(data.get("max_steps", 30)),
            "is_builtin": False,
            "read_only": False,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        target_file.write_text(json.dumps(new_agent, indent=2, ensure_ascii=False), encoding="utf-8-sig")
        return new_agent

    def update_custom_agent(self, agent_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        # Protection: Reject modifying builtins
        if (self.builtin_dir / f"{agent_id}.json").exists():
            return None

        target_file = self.custom_dir / f"{agent_id}.json"
        if not target_file.exists():
            return None

        try:
            curr = json.loads(target_file.read_text(encoding="utf-8-sig"))
            curr.update({
                "name": data.get("name", curr.get("name")),
                "role": data.get("role", curr.get("role")),
                "icon": data.get("icon", curr.get("icon")),
                "description": data.get("description", curr.get("description")),
                "system_prompt": data.get("system_prompt", curr.get("system_prompt")),
                "tools": data.get("tools", curr.get("tools")),
                "max_steps": int(data.get("max_steps", curr.get("max_steps", 30))),
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
            })
            target_file.write_text(json.dumps(curr, indent=2, ensure_ascii=False), encoding="utf-8-sig")
            curr["is_builtin"] = False
            curr["read_only"] = False
            return curr
        except Exception:
            return None

    def delete_custom_agent(self, agent_id: str) -> bool:
        # Protection: Cannot delete builtins
        if (self.builtin_dir / f"{agent_id}.json").exists():
            return False

        target_file = self.custom_dir / f"{agent_id}.json"
        if target_file.exists():
            try:
                target_file.unlink()
                return True
            except Exception:
                return False
        return False


agent_registry = AgentRegistry()
