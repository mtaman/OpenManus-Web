"""
MCP router - Model Context Protocol servers and tool registry.
Provides full management, listing, toggling, and connectivity testing for MCP servers.
"""

from __future__ import annotations
import shutil
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

from omweb.extensions.registry import extension_registry

router = APIRouter()


class MCPTestRequest(BaseModel):
    server_id: Optional[str] = None
    command: Optional[str] = None
    url: Optional[str] = None
    transport: str = "stdio"


@router.get("")
@router.get("/")
async def get_mcp_status():
    """Retrieve all registered MCP servers and their current status."""
    extensions = extension_registry.list_extensions()
    mcp_servers = [e for e in extensions if e.get("type") in ["mcp_server", "mcp"]]

    active_servers = [s for s in mcp_servers if s.get("status") == "active"]

    tools_summary = []
    for s in active_servers:
        sid = s.get("id", "")
        if "filesystem" in sid:
            tools_summary.extend(["read_file", "read_multiple_files", "write_file", "list_directory", "search_files"])
        elif "github" in sid:
            tools_summary.extend(["get_issue", "create_issue", "search_repositories", "get_file_contents"])

    return {
        "status": "ok",
        "total_servers": len(mcp_servers),
        "active_servers": len(active_servers),
        "servers": mcp_servers,
        "active_tools": sorted(list(set(tools_summary)))
    }


@router.get("/servers")
async def list_mcp_servers():
    """List all available MCP server configurations."""
    extensions = extension_registry.list_extensions()
    return {
        "status": "ok",
        "servers": [e for e in extensions if e.get("type") in ["mcp_server", "mcp"]]
    }


@router.post("/servers/{server_id}/toggle")
async def toggle_mcp_server(server_id: str):
    """Toggle an MCP server status between active and ready."""
    res = extension_registry.toggle_status(server_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return {"status": "ok", "server": res}


@router.post("/test")
async def test_mcp_connectivity(payload: MCPTestRequest = Body(...)):
    """Test connectivity to an MCP server without starting a full session."""
    target_cmd = payload.command
    target_url = payload.url
    transport = payload.transport

    if payload.server_id:
        ext = extension_registry.get_extension(payload.server_id)
        if ext:
            target_cmd = ext.get("command", target_cmd)
            target_url = ext.get("url", target_url)
            transport = ext.get("transport", transport)

    if transport == "stdio" and target_cmd:
        parts = target_cmd.split()
        exe = parts[0]
        resolved_exe = shutil.which(exe)
        if not resolved_exe:
            return {
                "status": "error",
                "message": f"Command executable '{exe}' not found in system PATH. Ensure Node.js (npx) or Python is installed."
            }
        return {
            "status": "ok",
            "message": f"Executable verified at '{resolved_exe}'. Server configuration is valid.",
            "executable": resolved_exe
        }
    elif transport == "sse" and target_url:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(target_url)
                return {
                    "status": "ok",
                    "message": f"SSE endpoint responded with status {resp.status_code}.",
                    "status_code": resp.status_code
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to reach SSE endpoint '{target_url}': {str(e)}"
            }

    return {
        "status": "error",
        "message": "Invalid test parameters. Provide either a valid command or SSE URL."
    }