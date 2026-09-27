import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

storage_default = Path(__file__).resolve().parent.parent.parent / "storage"
try:
    import omweb.config as om_cfg
    if hasattr(om_cfg, "settings") and hasattr(om_cfg.settings, "storage_dir"):
        storage_root = Path(om_cfg.settings.storage_dir).resolve()
    elif hasattr(om_cfg, "STORAGE_DIR"):
        storage_root = Path(om_cfg.STORAGE_DIR).resolve()
    elif hasattr(om_cfg, "get_settings"):
        storage_root = Path(om_cfg.get_settings().storage_dir).resolve()
    else:
        storage_root = storage_default.resolve()
except Exception:
    storage_root = storage_default.resolve()

def _extract_id(item: Any) -> Optional[str]:
    """Safely extracts an identifier whether item is a dict or a string."""
    if isinstance(item, dict):
        return item.get("id") or item.get("job_id")
    elif isinstance(item, str) and item.strip():
        return item.strip()
    return None

class ProjectManager:
    def __init__(self):
        self.storage_dir = Path(storage_root).resolve()
        self.chats_dir = self.storage_dir / "chats"
        self.projects_dir = self.storage_dir / "projects"
        self.index_file = self.storage_dir / "index.json"
        self._ensure_storage_structure()
        self._auto_discover_sessions()

    def _ensure_storage_structure(self):
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.chats_dir.mkdir(parents=True, exist_ok=True)
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        (self.projects_dir / "default_project").mkdir(parents=True, exist_ok=True)
        if not self.index_file.exists():
            initial_data = {
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
            self._write_index(initial_data)

    def _read_index(self) -> Dict[str, Any]:
        try:
            if self.index_file.exists():
                data = json.loads(self.index_file.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    data.setdefault("projects", [])
                    data.setdefault("chats", [])
                    return data
        except Exception:
            pass
        return {
            "version": "2.0.0",
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "projects": [{"id": "default_project", "name": "Default Project", "description": "General standalone tasks"}],
            "chats": []
        }

    def _write_index(self, data: Dict[str, Any]):
        data["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        self.index_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _auto_discover_sessions(self):
        """Scans disk storage to recover any missing chats or projects, robust against str and dict formats."""
        index = self._read_index()

        # 1. Normalize existing projects
        normalized_projects = []
        existing_projects = set()
        for p in index.get("projects", []):
            pid = _extract_id(p)
            if not pid:
                continue
            existing_projects.add(pid)
            if isinstance(p, dict):
                normalized_projects.append(p)
            else:
                normalized_projects.append({
                    "id": pid,
                    "name": pid.replace("proj_", "Project ").title(),
                    "description": "Recovered workspace",
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                })

        if "default_project" not in existing_projects:
            normalized_projects.insert(0, {
                "id": "default_project",
                "name": "Default Project",
                "description": "General standalone tasks",
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            })
            existing_projects.add("default_project")

        # 2. Normalize existing chats
        normalized_chats = []
        existing_chats = set()
        for c in index.get("chats", []):
            cid = _extract_id(c)
            if not cid:
                continue
            existing_chats.add(cid)
            if isinstance(c, dict):
                normalized_chats.append(c)
            else:
                normalized_chats.append({
                    "id": cid,
                    "job_id": cid,
                    "project_id": "default_project",
                    "title": cid,
                    "prompt": "",
                    "status": "completed",
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                })

        updated = False

        # 3. Discover Projects from Disk
        if self.projects_dir.exists():
            for pdir in self.projects_dir.iterdir():
                if pdir.is_dir():
                    pid = pdir.name
                    if pid not in existing_projects:
                        meta_file = pdir / "project.json"
                        p_meta = {
                            "id": pid,
                            "name": pid.replace("proj_", "Project ").title(),
                            "description": "Recovered workspace",
                            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                        }
                        if meta_file.exists():
                            try:
                                p_meta = json.loads(meta_file.read_text(encoding="utf-8"))
                            except Exception:
                                pass
                        normalized_projects.append(p_meta)
                        existing_projects.add(pid)
                        updated = True

                    # Discover chats inside project
                    p_chats_dir = pdir / "chats"
                    if p_chats_dir.exists():
                        for cdir in p_chats_dir.iterdir():
                            if cdir.is_dir():
                                cid = cdir.name
                                if cid not in existing_chats:
                                    sfile = cdir / "session.json"
                                    s_meta = {
                                        "id": cid,
                                        "job_id": cid,
                                        "project_id": pid,
                                        "title": cid,
                                        "prompt": "",
                                        "status": "completed",
                                        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                                    }
                                    if sfile.exists():
                                        try:
                                            s_meta = json.loads(sfile.read_text(encoding="utf-8"))
                                            s_meta["project_id"] = pid
                                        except Exception:
                                            pass
                                    normalized_chats.append({
                                        "id": s_meta.get("id", cid),
                                        "job_id": s_meta.get("job_id", cid),
                                        "project_id": pid,
                                        "title": s_meta.get("title", cid),
                                        "prompt": s_meta.get("prompt", ""),
                                        "status": s_meta.get("status", "completed"),
                                        "created_at": s_meta.get("created_at", time.strftime("%Y-%m-%d %H:%M:%S"))
                                    })
                                    existing_chats.add(cid)
                                    updated = True

        # 4. Discover root standalone chats
        if self.chats_dir.exists():
            for cdir in self.chats_dir.iterdir():
                if cdir.is_dir():
                    cid = cdir.name
                    if cid not in existing_chats:
                        sfile = cdir / "session.json"
                        s_meta = {
                            "id": cid,
                            "job_id": cid,
                            "project_id": "default_project",
                            "title": cid,
                            "prompt": "",
                            "status": "completed",
                            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                        }
                        if sfile.exists():
                            try:
                                s_meta = json.loads(sfile.read_text(encoding="utf-8"))
                            except Exception:
                                pass
                        normalized_chats.append({
                            "id": s_meta.get("id", cid),
                            "job_id": s_meta.get("job_id", cid),
                            "project_id": "default_project",
                            "title": s_meta.get("title", cid),
                            "prompt": s_meta.get("prompt", ""),
                            "status": s_meta.get("status", "completed"),
                            "created_at": s_meta.get("created_at", time.strftime("%Y-%m-%d %H:%M:%S"))
                        })
                        existing_chats.add(cid)
                        updated = True

        index["projects"] = normalized_projects
        index["chats"] = normalized_chats
        self._write_index(index)

    def get_chat_dir(self, chat_id: str, project_id: str = "default_project") -> Path:
        if project_id and project_id != "default_project":
            return self.projects_dir / project_id / "chats" / chat_id
        return self.chats_dir / chat_id

    def get_chat_files_dir(self, chat_id: str, project_id: str = "default_project") -> Path:
        if project_id and project_id != "default_project":
            p_fdir = self.projects_dir / project_id / "chats" / chat_id / "files"
            if p_fdir.exists():
                return p_fdir
        c_fdir = self.chats_dir / chat_id / "files"
        if c_fdir.exists():
            return c_fdir

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
        existing = self.get_chat(job_id) or self.get_chat(chat_id)
        if existing:
            prev_pid = existing.get("project_id")
            if prev_pid and prev_pid != "default_project" and (not project_id or project_id == "default_project"):
                project_id = prev_pid

        resolved_project_id = project_id or "default_project"
        chat_dir = self.get_chat_dir(chat_id, resolved_project_id)
        chat_dir.mkdir(parents=True, exist_ok=True)

        session_file = chat_dir / "session.json"
        events_file = chat_dir / "events.json"

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
                if old.get("status") in ["completed", "failed"] and status == "running":
                    status = old.get("status")
            except Exception:
                pass

        session_data = {
            "id": chat_id,
            "project_id": resolved_project_id,
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

        index = self._read_index()
        chats = [c for c in index.get("chats", []) if _extract_id(c) not in [chat_id, job_id]]
        chats.insert(0, {
            "id": chat_id,
            "job_id": job_id,
            "project_id": resolved_project_id,
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
        index = self._read_index()
        target_meta = None
        for c in index.get("chats", []):
            cid = _extract_id(c)
            cjob = c.get("job_id") if isinstance(c, dict) else cid
            if cid == identifier or cjob == identifier:
                target_meta = c if isinstance(c, dict) else {"id": cid, "job_id": cid}
                break

        chat_id = target_meta.get("id", identifier) if target_meta else identifier
        project_id = target_meta.get("project_id", "default_project") if target_meta else "default_project"

        candidate_dirs = []
        if target_meta and target_meta.get("project_id"):
            candidate_dirs.append(self.projects_dir / target_meta["project_id"] / "chats" / chat_id)
        candidate_dirs.extend([
            self.chats_dir / chat_id,
            self.chats_dir / identifier,
        ])

        for cdir in candidate_dirs:
            sfile = cdir / "session.json"
            if sfile.exists():
                try:
                    sdata = json.loads(sfile.read_text(encoding="utf-8"))
                    efile = cdir / "events.json"
                    sdata["events"] = json.loads(efile.read_text(encoding="utf-8")) if efile.exists() else []
                    if sdata.get("status") == "running" and sdata.get("result"):
                        sdata["status"] = "completed"
                    return sdata
                except Exception:
                    pass

        return target_meta

    def list_chats(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        index = self._read_index()
        chats = []
        for c in index.get("chats", []):
            cid = _extract_id(c)
            if not cid:
                continue
            if isinstance(c, dict):
                chats.append(c)
            else:
                chats.append({
                    "id": cid,
                    "job_id": cid,
                    "project_id": "default_project",
                    "title": cid,
                    "prompt": "",
                    "status": "completed"
                })
        if project_id:
            chats = [c for c in chats if c.get("project_id") == project_id]
        return chats

    def delete_chat(self, chat_id: str) -> bool:
        index = self._read_index()
        target = None
        for c in index.get("chats", []):
            cid = _extract_id(c)
            cjob = c.get("job_id") if isinstance(c, dict) else cid
            if cid == chat_id or cjob == chat_id:
                target = c if isinstance(c, dict) else {"id": cid, "project_id": "default_project"}
                break

        if not target:
            return False

        actual_id = target.get("id", chat_id)
        proj_id = target.get("project_id", "default_project")

        import shutil
        cdir = self.get_chat_dir(actual_id, proj_id)
        if cdir.exists():
            shutil.rmtree(cdir, ignore_errors=True)
        rdir = self.chats_dir / actual_id
        if rdir.exists():
            shutil.rmtree(rdir, ignore_errors=True)

        index["chats"] = [c for c in index.get("chats", []) if _extract_id(c) not in [actual_id, chat_id]]
        self._write_index(index)
        return True

    def list_projects(self) -> List[Dict[str, Any]]:
        index = self._read_index()
        projects = []
        for p in index.get("projects", []):
            pid = _extract_id(p)
            if not pid:
                continue
            if isinstance(p, dict):
                projects.append(p)
            else:
                projects.append({
                    "id": pid,
                    "name": pid.replace("proj_", "Project ").title(),
                    "description": ""
                })
        return projects

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
        index["projects"] = [p for p in index.get("projects", []) if _extract_id(p) != project_id]
        index["chats"] = [c for c in index.get("chats", []) if isinstance(c, dict) and c.get("project_id") != project_id]
        self._write_index(index)
        return True

project_manager = ProjectManager()