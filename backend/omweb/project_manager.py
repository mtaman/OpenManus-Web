import os
import json
from datetime import datetime
from pathlib import Path
import time
import uuid

class ProjectManager:
    def __init__(self, db_dir: str = "D:\\AI\\OpenManus\\workspace\\projects_db"):
        self.db_dir = Path(db_dir)
        self.db_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.db_dir / "index.json"
        self._init_index()

    def _init_index(self):
        if not self.index_file.exists():
            data = {"projects": {}, "chats": {}}
            self._write_json(self.index_file, data)

    def _read_json(self, path: Path) -> dict:
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return {"projects": {}, "chats": {}}

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
        project_id = f"proj_{uuid.uuid4().hex[:10]}"
        project = {
            "id": project_id,
            "name": name,
            "description": description,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        data["projects"][project_id] = project
        self._write_json(self.index_file, data)
        return project

    def delete_project(self, project_id: str):
        data = self._read_json(self.index_file)
        if project_id in data["projects"]:
            del data["projects"][project_id]
            chats = data.get("chats", {})
            to_del = [cid for cid, chat in chats.items() if chat.get("project_id") == project_id]
            for cid in to_del:
                del chats[cid]
            self._write_json(self.index_file, data)

    def list_chats(self, project_id: str = None) -> list:
        data = self._read_json(self.index_file)
        chats = list(data.get("chats", {}).values())
        if project_id:
            chats = [c for c in chats if c.get("project_id") == project_id]
        return sorted(chats, key=lambda x: x.get("updated_at", ""), reverse=True)

    def create_chat(self, project_id: str, title: str, job_id: str, prompt: str) -> dict:
        data = self._read_json(self.index_file)
        chat_id = f"chat_{uuid.uuid4().hex[:12]}"
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        chat = {
            "id": chat_id,
            "project_id": project_id,
            "title": title,
            "job_id": job_id,
            "prompt": prompt,
            "created_at": now,
            "updated_at": now,
            "status": "running"
        }
        data["chats"][chat_id] = chat
        self._write_json(self.index_file, data)
        return chat

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