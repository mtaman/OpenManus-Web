from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from omweb.agents.registry import agent_registry
from omweb.tools.registry import tool_registry
from omweb.extensions.registry import extension_registry

router = APIRouter()

class AgentUpsertRequest(BaseModel):
    name: str = Field(..., min_length=2)
    role: Optional[str] = "Specialist"
    icon: Optional[str] = "Sparkles"
    description: Optional[str] = ""
    system_prompt: str = Field(..., min_length=5)
    tools: List[str] = Field(default_factory=list)
    max_steps: Optional[int] = Field(default=30, ge=1, le=100)

@router.get("/agents")
async def list_all_agents():
    return {"status": "ok", "agents": agent_registry.list_agents()}

@router.get("/agents/{agent_id}")
async def get_agent_detail(agent_id: str):
    agent = agent_registry.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "ok", "agent": agent}

@router.post("/agents")
async def create_agent(req: AgentUpsertRequest):
    created = agent_registry.create_custom_agent(req.model_dump())
    return {"status": "ok", "agent": created}

@router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, req: AgentUpsertRequest):
    updated = agent_registry.update_custom_agent(agent_id, req.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="Agent not found or is immutable built-in")
    return {"status": "ok", "agent": updated}

@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    success = agent_registry.delete_custom_agent(agent_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete built-in agent or agent does not exist")
    return {"status": "ok", "message": f"Agent {agent_id} deleted successfully"}

@router.get("/tools")
async def list_all_tools():
    return {"status": "ok", "tools": tool_registry.list_tools()}

@router.get("/extensions")
async def list_all_extensions():
    return {"status": "ok", "extensions": extension_registry.list_extensions()}
