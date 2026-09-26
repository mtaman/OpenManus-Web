import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from omweb.config import get_settings

settings = get_settings()

class ProjectManager:
    def __init__(self):
        self.storage_dir = Path(settings.storage_dir).resolve()
        self.chats_dir = self.storage_dir / "chats"
        self.projects_dir = self.storage_dir / "projects"
        self.index_file = self.storage_dir / "index.json"
        self._ensure_storage_structure()

    def _ensure_storage_structure(self):
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.chats_dir.mkdir(parents=True, exist_ok=True)
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        (self.projects_dir / "default_project").mkdir(parents=True, exist_ok=True)
        if not self.index_file.exists():
            initial_index = {
                "version": "2.0.0",
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "projects": [
                    {
                        "id": "default_project",
                        "name": "Default Project",
                        "description": "General standalone tasks",
                        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                    }
                ],
                "chats": []
            }
            self.index_file.write_text(json.dumps(initial_index, indent=2, ensure_ascii=False), encoding="utf-8")

    def _read_index(self) -> Dict[str, Any]:
        try:
            return json.loads(self.index_file.read_text(encoding="utf-8"))
        except Exception:
            return {"projects": [], "chats": []}

    def _write_index(self, data: Dict[str, Any]):
        data["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        self.index_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def get_chat_dir(self, chat_id: str, project_id: str = "default_project") -> Path:
        if project_id and project_id != "default_project":
            return self.projects_dir / project_id / "chats" / chat_id
        return self.chats_dir / chat_id

    def get_chat_files_dir(self, chat_id: str, project_id: str = "default_project") -> Path:
        cdir = self.get_chat_dir(chat_id, project_id)
        fdir = cdir / "files"
        fdir.mkdir(parents=True, exist_ok=True)
        return fdir

    def save_chat_session(
        self,
        chat_id: str,
        project_id: str,
        title: str,
        job_id: str,
        prompt: str,
        events: List[Any],
        result: str = "",
        status: str = "running"
    ) -> Dict[str, Any]:
        chat_dir = self.get_chat_dir(chat_id, project_id)
        chat_dir.mkdir(parents=True, exist_ok=True)

        session_file = chat_dir / "session.json"
        events_file = chat_dir / "events.json"

        # Preserve existing events if incoming list is empty
        final_events = events
        if not final_events and events_file.exists():
            try:
                final_events = json.loads(events_file.read_text(encoding="utf-8"))
            except Exception:
                final_events = []

        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        created_at = now_str
        if session_file.exists():
            try:
                old = json.loads(session_file.read_text(encoding="utf-8"))
                created_at = old.get("created_at", now_str)
                if not result and old.get("result"):
                    result = old.get("result")
                # Do not revert a completed task to running
                if old.get("status") in ["completed", "failed"] and status == "running":
                    status = old.get("status")
            except Exception:
                pass

        session_data = {
            "id": chat_id,
            "project_id": project_id or "default_project",
            "job_id": job_id,
            "title": title or prompt[:40] or "New Session",
            "prompt": prompt,
            "status": status,
            "result": result,
            "created_at": created_at,
            "updated_at": now_str
        }

        session_file.write_text(json.dumps(session_data, indent=2, ensure_ascii=False), encoding="utf-8")
        events_file.write_text(json.dumps(final_events, indent=2, ensure_ascii=False), encoding="utf-8")

        # Update central index
        index = self._read_index()
        chats = index.get("chats", [])
        chats = [c for c in chats if c.get("id") != chat_id and c.get("job_id") != job_id]
        chats.insert(0, {
            "id": chat_id,
            "job_id": job_id,
            "project_id": project_id or "default_project",
            "title": session_data["title"],
            "prompt": prompt,
            "status": status,
            "created_at": created_at,
            "updated_at": now_str
        })
        index["chats"] = chats
        self._write_index(index)

        return session_data

    def get_chat(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Find chat by either chat_id or job_id"""
        index = self._read_index()
        target_meta = None
        for c in index.get("chats", []):
            if c.get("id") == identifier or c.get("job_id") == identifier:
                target_meta = c
                break

        chat_id = target_meta.get("id", identifier) if target_meta else identifier
        project_id = target_meta.get("project_id", "default_project") if target_meta else "default_project"

        # Search in default chats and project chats
        candidate_dirs = [
            self.chats_dir / chat_id,
            self.chats_dir / identifier,
        ]
        if target_meta and target_meta.get("project_id"):
            candidate_dirs.insert(0, self.projects_dir / target_meta["project_id"] / "chats" / chat_id)

        for cdir in candidate_dirs:
            sfile = cdir / "session.json"
            if sfile.exists():
                try:
                    sdata = json.loads(sfile.read_text(encoding="utf-8"))
                    efile = cdir / "events.json"
                    sdata["events"] = json.loads(efile.read_text(encoding="utf-8")) if efile.exists() else []
                    
                    # Auto-heal: If marked running but has final result or events indicate finished
                    if sdata.get("status") == "running" and sdata.get("result"):
                        sdata["status"] = "completed"
                    return sdata
                except Exception:
                    pass

        return target_meta

    def list_chats(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        index = self._read_index()
        chats = index.get("chats", [])
        if project_id:
            chats = [c for c in chats if c.get("project_id") == project_id]
        return chats

    def delete_chat(self, chat_id: str) -> bool:
        index = self._read_index()
        target = next((c for c in index.get("chats", []) if c.get("id") == chat_id or c.get("job_id") == chat_id), None)
        if not target:
            return False

        actual_id = target.get("id", chat_id)
        proj_id = target.get("project_id", "default_project")

        import shutil
        cdir = self.get_chat_dir(actual_id, proj_id)
        if cdir.exists():
            shutil.rmtree(cdir, ignore_errors=True)

        index["chats"] = [c for c in index.get("chats", []) if c.get("id") != actual_id and c.get("job_id") != actual_id]
        self._write_index(index)
        return True

    def list_projects(self) -> List[Dict[str, Any]]:
        return self._read_index().get("projects", [])

    def create_project(self, name: str, description: str = "") -> Dict[str, Any]:
        import uuid
        project_id = f"proj_{uuid.uuid4().hex[:8]}"
        pdir = self.projects_dir / project_id
        pdir.mkdir(parents=True, exist_ok=True)
        (pdir / "chats").mkdir(parents=True, exist_ok=True)
        (pdir / "assets").mkdir(parents=True, exist_ok=True)

        meta = {
            "id": project_id,
            "name": name,
            "description": description,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        (pdir / "project.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

        index = self._read_index()
        index.setdefault("projects", []).append(meta)
        self._write_index(index)
        return meta

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        for p in self.list_projects():
            if p.get("id") == project_id:
                return p
        return None

    def delete_project(self, project_id: str) -> bool:
        if project_id == "default_project":
            return False
        import shutil
        pdir = self.projects_dir / project_id
        if pdir.exists():
            shutil.rmtree(pdir, ignore_errors=True)

        index = self._read_index()
        index["projects"] = [p for p in index.get("projects", []) if p.get("id") != project_id]
        index["chats"] = [c for c in index.get("chats", []) if c.get("project_id") != project_id]
        self._write_index(index)
        return True

project_manager = ProjectManager()