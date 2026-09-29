import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

BUILTIN_AGENTS: List[Dict[str, Any]] = [
    {
        "id": "manus",
        "name": "Manus Generalist",
        "role": "General Autonomous Specialist",
        "icon": "Bot",
        "description": "Comprehensive autonomous agent equipped with terminal, python execution, file management, and browser automation.",
        "system_prompt": "You are Manus, an all-capable AI agent specialized in autonomous task planning, coding, file creation, and deep web navigation. Execute tasks methodically with precision.",
        "tools": ["bash", "python_execute", "web_search", "browser_use", "file_saver", "ask_human"],
        "max_steps": 30,
        "is_builtin": True,
        "created_at": "2026-09-01 00:00:00"
    },
    {
        "id": "code_architect",
        "name": "Code Architect",
        "role": "Senior Full-Stack Engineer",
        "icon": "Code2",
        "description": "Specialized in software development, architecture review, debugging, refactoring, and automated script creation.",
        "system_prompt": "You are a Senior Full-Stack Engineer and Architect. You strictly focus on writing clean, modular, robust code, testing implementation, and saving production-ready files in the workspace.",
        "tools": ["bash", "python_execute", "file_saver", "ask_human"],
        "max_steps": 30,
        "is_builtin": True,
        "created_at": "2026-09-01 00:00:00"
    },
    {
        "id": "deep_researcher",
        "name": "Deep Researcher",
        "role": "Intelligence & Synthesis Analyst",
        "icon": "Search",
        "description": "Deep-dives into online documentation, academic sources, technical specifications, and synthesizes structured markdown reports.",
        "system_prompt": "You are an elite Research Analyst. Your purpose is to scour web resources, cross-reference empirical facts, and compile exhaustive, objective reports with explicit citations.",
        "tools": ["web_search", "browser_use", "file_saver"],
        "max_steps": 25,
        "is_builtin": True,
        "created_at": "2026-09-01 00:00:00"
    },
    {
        "id": "data_scientist",
        "name": "Data Scientist",
        "role": "Analytics & Visualization Engineer",
        "icon": "BarChart3",
        "description": "Analyzes datasets, executes numeric Python pipelines, generates plots, statistical summaries, and tabular insights.",
        "system_prompt": "You are a Senior Data Scientist. You analyze datasets with Python libraries, calculate metrics, produce graphs, and deliver actionable data-driven conclusions.",
        "tools": ["python_execute", "bash", "file_saver"],
        "max_steps": 25,
        "is_builtin": True,
        "created_at": "2026-09-01 00:00:00"
    }
]

class AgentRegistry:
    def __init__(self):
        # Resolve sovereign storage path independently
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.store_dir = base_dir / "storage" / "store"
        self.store_dir.mkdir(parents=True, exist_ok=True)
        self.custom_file = self.store_dir / "agents.json"
        self._ensure_custom_storage()

    def _ensure_custom_storage(self):
        if not self.custom_file.exists():
            self.custom_file.write_text("[]", encoding="utf-8")

    def _load_custom_agents(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.custom_file.read_text(encoding="utf-8"))
        except Exception:
            return []

    def _save_custom_agents(self, agents: List[Dict[str, Any]]):
        self.custom_file.write_text(json.dumps(agents, indent=2, ensure_ascii=False), encoding="utf-8")

    def list_agents(self) -> List[Dict[str, Any]]:
        custom = self._load_custom_agents()
        return BUILTIN_AGENTS + custom

    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        for ag in self.list_agents():
            if ag["id"] == agent_id:
                return ag
        return BUILTIN_AGENTS[0]

    def create_custom_agent(self, data: Dict[str, Any]) -> Dict[str, Any]:
        custom = self._load_custom_agents()
        agent_id = data.get("id") or f"custom_{int(time.time())}"
        
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
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        custom.append(new_agent)
        self._save_custom_agents(custom)
        return new_agent

    def update_custom_agent(self, agent_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        custom = self._load_custom_agents()
        for idx, ag in enumerate(custom):
            if ag["id"] == agent_id:
                custom[idx].update({
                    "name": data.get("name", ag["name"]),
                    "role": data.get("role", ag["role"]),
                    "icon": data.get("icon", ag["icon"]),
                    "description": data.get("description", ag["description"]),
                    "system_prompt": data.get("system_prompt", ag["system_prompt"]),
                    "tools": data.get("tools", ag["tools"]),
                    "max_steps": int(data.get("max_steps", ag["max_steps"])),
                    "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
                })
                self._save_custom_agents(custom)
                return custom[idx]
        return None

    def delete_custom_agent(self, agent_id: str) -> bool:
        custom = self._load_custom_agents()
        initial_len = len(custom)
        custom = [ag for ag in custom if ag["id"] != agent_id]
        if len(custom) < initial_len:
            self._save_custom_agents(custom)
            return True
        return False

agent_registry = AgentRegistry()
