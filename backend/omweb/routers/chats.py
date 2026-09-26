from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from omweb.project_manager import project_manager

router = APIRouter()

class CreateProjectRequest(BaseModel):
    name: str
    description: Optional[str] = ""

class CreateChatRequest(BaseModel):
    project_id: str
    title: str
    job_id: str
    prompt: str

@router.get("/projects")
async def get_projects():
    return {"projects": project_manager.list_projects()}

@router.post("/projects")
async def create_project(req: CreateProjectRequest):
    proj = project_manager.create_project(req.name, req.description)
    return {"status": "success", "project": proj}

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    project_manager.delete_project(project_id)
    return {"status": "success", "deleted_id": project_id}

@router.get("")
@router.get("/")
async def get_chats(project_id: Optional[str] = None):
    return {"chats": project_manager.list_chats(project_id)}

@router.post("")
@router.post("/")
async def create_chat(req: CreateChatRequest):
    chat = project_manager.create_chat(req.project_id, req.title, req.job_id, req.prompt)
    return {"status": "success", "chat": chat}

@router.delete("/all")
async def delete_all_chats():
    project_manager.delete_all_chats()
    return {"status": "success", "message": "All chats deleted successfully"}

@router.delete("/{chat_id}")
async def delete_chat(chat_id: str):
    project_manager.delete_chat(chat_id)
    return {"status": "success", "deleted_id": chat_id}