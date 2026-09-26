from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
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
    """List all chat sessions, optionally filtered by project_id."""
    return {"chats": project_manager.list_chats(project_id=project_id)}

@router.post("")
@router.post("/")
async def create_chat(req: ChatCreateRequest):
    """Create or initialize a chat session record."""
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
    """Delete all chat sessions safely."""
    project_manager.delete_all_chats()
    return {"status": "ok", "message": "All chats deleted successfully"}

@router.get("/{chat_id}")
async def get_chat_detail(chat_id: str):
    """Retrieve full chat session details, including historical events, thoughts, and steps for replay."""
    chat = project_manager.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "ok", "chat": chat}

@router.delete("/{chat_id}")
async def delete_single_chat(chat_id: str):
    """Delete a specific chat session by ID."""
    chat = project_manager.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    project_manager.delete_chat(chat_id)
    return {"status": "ok", "message": f"Chat {chat_id} deleted"}
