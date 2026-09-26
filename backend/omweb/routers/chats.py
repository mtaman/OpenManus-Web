from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from omweb.project_manager import project_manager

router = APIRouter()

class ChatCreateRequest(BaseModel):
    project_id: Optional[str] = "default_project"
    title: Optional[str] = "New Session"
    job_id: Optional[str] = ""
    prompt: Optional[str] = ""

@router.get("")
@router.get("/")
async def list_chats(project_id: Optional[str] = None):
    return {"chats": project_manager.list_chats(project_id=project_id)}

@router.get("/projects")
async def list_projects():
    return {"projects": project_manager.list_projects()}

@router.post("")
@router.post("/")
async def create_chat(req: ChatCreateRequest):
    import uuid
    chat_id = f"chat_{uuid.uuid4().hex[:10]}"
    chat = project_manager.save_chat_session(
        chat_id=chat_id,
        project_id=req.project_id or "default_project",
        title=req.title,
        job_id=req.job_id or "",
        prompt=req.prompt or "",
        events=[],
        result="",
        status="active"
    )
    return {"status": "ok", "chat": chat}

@router.delete("/all")
async def delete_all_chats():
    project_manager.delete_all_chats()
    return {"status": "ok", "message": "All chats deleted"}

@router.get("/{chat_id}")
async def get_chat_detail(chat_id: str):
    chat = project_manager.get_chat(chat_id)
    if not chat:
        all_chats = project_manager.list_chats()
        chat = next((c for c in all_chats if c.get("job_id") == chat_id), None)
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "ok", "chat": chat}

@router.delete("/{chat_id}")
async def delete_single_chat(chat_id: str):
    chat = project_manager.get_chat(chat_id)
    if not chat:
        all_chats = project_manager.list_chats()
        chat = next((c for c in all_chats if c.get("job_id") == chat_id), None)
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    actual_id = chat.get("id", chat_id)
    project_manager.delete_chat(actual_id)
    return {"status": "ok", "message": f"Chat {actual_id} deleted"}