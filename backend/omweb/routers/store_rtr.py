"""
Store Router - Endpoints for agents, tool catalog, custom uploads, and lifecycle toggling.
"""

from __future__ import annotations
import json
from fastapi import APIRouter, HTTPException, UploadFile, File
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


@router.post("/agents/{agent_id}/toggle")
async def toggle_agent(agent_id: str):
    res = agent_registry.toggle_agent_status(agent_id)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return {"status": "ok", "agent": res}


@router.get("/tools")
async def list_all_tools():
    return {"status": "ok", "tools": tool_registry.list_tools()}


@router.post("/tools/{tool_id}/toggle")
async def toggle_tool(tool_id: str):
    res = tool_registry.toggle_tool_status(tool_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return {"status": "ok", "tool": res}


@router.post("/tools/upload")
async def upload_tool_file(file: UploadFile = File(...)):
    filename = file.filename or "custom_tool.py"
    if not (filename.endswith(".py") or filename.endswith(".json")):
        raise HTTPException(status_code=400, detail="Only .py script or .json manifest files are supported.")

    content = await file.read()
    res = tool_registry.save_custom_tool_file(filename, content)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return {"status": "ok", "tool": res}


@router.delete("/tools/{tool_id}")
async def delete_custom_tool(tool_id: str):
    success = tool_registry.delete_custom_tool(tool_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete built-in tool or file does not exist.")
    return {"status": "ok", "message": f"Tool {tool_id} deleted successfully"}


@router.get("/extensions")
async def list_all_extensions():
    return {"status": "ok", "extensions": extension_registry.list_extensions()}


@router.post("/extensions/upload")
async def upload_extension_json(file: UploadFile = File(...)):
    filename = file.filename or "mcp_extension.json"
    if not filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Extensions must be uploaded as JSON manifest files.")

    content = await file.read()
    try:
        data = json.loads(content.decode("utf-8"))
        saved = extension_registry.save_extension(data)
        return {"status": "ok", "extension": saved}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse extension JSON: {e}")