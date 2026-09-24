"""
MCP router - Model Context Protocol servers and tool registry.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def get_mcp_status():
    return {"servers": [], "tools": []}
