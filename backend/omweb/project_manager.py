import os
import json
import shutil
from datetime import datetime
from pathlib import Path
import uuid
from typing import Dict, Any, List, Optional

from omweb.config import STORAGE_ROOT, CHATS_DIR, PROJECTS_DIR

class ProjectManager:
    """
    Manages atomic storage for independent chats and multi-chat projects.
    Hierarchy:
      storage/
        index.json
        chats/<chat_id>/ (session.json, events.json, files/)
        projects/<project_id>/ (project.json, shared_files/, chats/<chat_id>/)
    """
    def __init__(self):
        self.storage_root = STORAGE_ROOT
        self.chats_dir = CHATS_DIR
        self.projects_dir = PROJECTS_DIR
        self.index_file = self.storage_root / "index.json"
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
        return {}

    def _write_json(self, path: Path, data: Any):
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        tmp_path.replace(path)

    # -------------------------------------------------------------
    # Path Resolvers
    # -------------------------------------------------------------
    def get_chat_dir(self, chat_id: str, project_id: Optional[str] = None) -> Path:
        if project_id and project_id != "default_project":
            return self.projects_dir / project_id / "chats" / chat_id
        return self.chats_dir / chat_id

    def get_chat_files_dir(self, chat_id: str, project_id: Optional[str] = None) -> Path:
        files_dir = self.get_chat_dir(chat_id, project_id) / "files"
        files_dir.mkdir(parents=True, exist_ok=True)
        return files_dir

    def get_project_dir(self, project_id: str) -> Path:
        return self.projects_dir / project_id

    # -------------------------------------------------------------
    # Project Operations
    # -------------------------------------------------------------
    def list_projects(self) -> List[dict]:
        index = self._read_json(self.index_file)
        return sorted(list(index.get("projects", {}).values()), key=lambda x: x.get("created_at", ""), reverse=True)

    def create_project(self, name: str, description: str = "") -> dict:
        proj_id = f"proj_{uuid.uuid4().hex[:10]}"
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        proj_dir = self.get_project_dir(proj_id)
        proj_dir.mkdir(parents=True, exist_ok=True)
        (proj_dir / "chats").mkdir(parents=True, exist_ok=True)
        (proj_dir / "shared_files").mkdir(parents=True, exist_ok=True)

        proj_meta = {
            "id": proj_id,
            "name": name,
            "description": description,
            "created_at": now,
            "updated_at": now
        }
        self._write_json(proj_dir / "project.json", proj_meta)

        # Update central manifest
        index = self._read_json(self.index_file)
        if "projects" not in index:
            index["projects"] = {}
        index["projects"][proj_id] = proj_meta
        self._write_json(self.index_file, index)
        return proj_meta

    def get_project(self, project_id: str) -> Optional[dict]:
        proj_file = self.get_project_dir(project_id) / "project.json"
        if proj_file.exists():
            return self._read_json(proj_file)
        index = self._read_json(self.index_file)
        return index.get("projects", {}).get(project_id)

    def delete_project(self, project_id: str):
        index = self._read_json(self.index_file)
        index.get("projects", {}).pop(project_id, None)

        # Remove associated chats from central registry
        chats = index.get("chats", {})
        to_del = [c_id for c_id, c in chats.items() if c.get("project_id") == project_id]
        for c_id in to_del:
            chats.pop(c_id, None)

        self._write_json(self.index_file, index)

        proj_dir = self.get_project_dir(project_id)
        if proj_dir.exists():
            shutil.rmtree(proj_dir, ignore_errors=True)

    # -------------------------------------------------------------
    # Chat Operations
    # -------------------------------------------------------------
    def list_chats(self, project_id: Optional[str] = None) -> List[dict]:
        index = self._read_json(self.index_file)
        chats = list(index.get("chats", {}).values())
        if project_id:
            chats = [c for c in chats if c.get("project_id") == project_id]
        return sorted(chats, key=lambda x: x.get("updated_at", x.get("created_at", "")), reverse=True)

    def save_chat_session(
        self,
        chat_id: str,
        project_id: Optional[str],
        title: str,
        job_id: str,
        prompt: str,
        events: list,
        result: str,
        status: str
    ) -> dict:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        is_project_chat = bool(project_id and project_id != "default_project")
        actual_project_id = project_id if is_project_chat else "default_project"

        chat_dir = self.get_chat_dir(chat_id, actual_project_id)
        chat_dir.mkdir(parents=True, exist_ok=True)
        files_dir = chat_dir / "files"
        files_dir.mkdir(parents=True, exist_ok=True)

        session_file = chat_dir / "session.json"
        events_file = chat_dir / "events.json"

        existing_session = self._read_json(session_file)
        created_at = existing_session.get("created_at", now)

        session_data = {
            "id": chat_id,
            "project_id": actual_project_id,
            "job_id": job_id,
            "title": title or prompt[:40] or "New Session",
            "prompt": prompt,
            "result": result,
            "status": status,
            "created_at": created_at,
            "updated_at": now,
            "files_path": str(files_dir.resolve())
        }

        self._write_json(session_file, session_data)
        if events:
            self._write_json(events_file, events)

        # Update fast registry
        index = self._read_json(self.index_file)
        if "chats" not in index:
            index["chats"] = {}
        index["chats"][chat_id] = session_data
        self._write_json(self.index_file, index)

        return session_data

    def get_chat(self, chat_id: str) -> Optional[dict]:
        index = self._read_json(self.index_file)
        chat_summary = index.get("chats", {}).get(chat_id)
        project_id = chat_summary.get("project_id") if chat_summary else None

        chat_dir = self.get_chat_dir(chat_id, project_id)
        session_file = chat_dir / "session.json"
        events_file = chat_dir / "events.json"

        if not session_file.exists():
            for c_id, meta in index.get("chats", {}).items():
                if meta.get("job_id") == chat_id:
                    return self.get_chat(c_id)
            return None

        session_data = self._read_json(session_file)
        session_data["events"] = self._read_json(events_file) if events_file.exists() else []
        return session_data

    def delete_chat(self, chat_id: str):
        index = self._read_json(self.index_file)
        chat_summary = index.get("chats", {}).pop(chat_id, None)
        self._write_json(self.index_file, index)

        project_id = chat_summary.get("project_id") if chat_summary else None
        chat_dir = self.get_chat_dir(chat_id, project_id)
        if chat_dir.exists():
            shutil.rmtree(chat_dir, ignore_errors=True)

    def delete_all_chats(self):
        index = self._read_json(self.index_file)
        index["chats"] = {}
        self._write_json(self.index_file, index)

        if self.chats_dir.exists():
            shutil.rmtree(self.chats_dir, ignore_errors=True)
            self.chats_dir.mkdir(parents=True, exist_ok=True)

        for proj_dir in self.projects_dir.glob("proj_*"):
            p_chats = proj_dir / "chats"
            if p_chats.exists():
                shutil.rmtree(p_chats, ignore_errors=True)
                p_chats.mkdir(parents=True, exist_ok=True)

project_manager = ProjectManager()
