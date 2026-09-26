import os
import json
from datetime import datetime
from pathlib import Path
import uuid

class ProjectManager:
    def __init__(self, db_dir: str = "D:\\AI\\OpenManus\\workspace\\projects_db"):
        self.db_dir = Path(db_dir)
        self.db_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.db_dir / "index.json"
        self._init_index()

    def _init_index(self):
        if not self.index_file.exists():
            data = {"projects": {}, "chats": {}, "messages": {}}
            self._write_json(self.index_file, data)

    def _read_json(self, path: Path) -> dict:
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return {"projects": {}, "chats": {}, "messages": {}}

    def _write_json(self, path: Path, data: dict):
        tmp_path = path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        tmp_path.replace(path)

    def list_projects(self) -> list:
        data = self._read_json(self.index_file)
        return list(data.get("projects", {}).values())

    def create_project(self, name: str, description: str = "") -> dict:
        data = self._read_json(self.index_file)
        proj_id = f"proj_{uuid.uuid4().hex[:10]}"
        proj = {
            "id": proj_id,
            "name": name,
            "description": description,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        data["projects"][proj_id] = proj
        self._write_json(self.index_file, data)
        return proj

    def list_chats(self, project_id: str = None) -> list:
        data = self._read_json(self.index_file)
        chats = list(data.get("chats", {}).values())
        if project_id:
            chats = [c for c in chats if c.get("project_id") == project_id]
        return sorted(chats, key=lambda x: x.get("updated_at", ""), reverse=True)

    def save_chat_session(self, chat_id: str, project_id: str, title: str, job_id: str, prompt: str, events: list, result: str, status: str) -> dict:
        data = self._read_json(self.index_file)
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        chat = data.get("chats", {}).get(chat_id, {
            "id": chat_id,
            "project_id": project_id or "default_project",
            "created_at": now
        })
        
        chat.update({
            "title": title or prompt[:30],
            "job_id": job_id,
            "prompt": prompt,
            "events": events,
            "result": result,
            "status": status,
            "updated_at": now
        })
        
        data["chats"][chat_id] = chat
        self._write_json(self.index_file, data)
        return chat

    def get_chat(self, chat_id: str) -> dict:
        data = self._read_json(self.index_file)
        return data.get("chats", {}).get(chat_id, {})

    def delete_chat(self, chat_id: str):
        data = self._read_json(self.index_file)
        if chat_id in data.get("chats", {}):
            del data["chats"][chat_id]
            self._write_json(self.index_file, data)

    def delete_all_chats(self):
        data = self._read_json(self.index_file)
        data["chats"] = {}
        self._write_json(self.index_file, data)

project_manager = ProjectManager()