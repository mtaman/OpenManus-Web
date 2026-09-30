from typing import Dict, Any, Optional
from app.tool.base import BaseTool

class DelegateSubtaskTool(BaseTool):
    name: str = "delegate_subtask"
    description: str = (
        "Delegates an isolated subtask to another Sovereign Agent persona "
        "(e.g., 'code_architect', 'data_scientist', 'deep_researcher') and returns their findings."
    )
    parameters: dict = {
        "type": "object",
        "properties": {
            "target_agent_id": {
                "type": "string",
                "description": "ID of the sovereign agent to delegate to"
            },
            "subtask_prompt": {
                "type": "string",
                "description": "Clear, detailed prompt for the delegated agent to execute"
            }
        },
        "required": ["target_agent_id", "subtask_prompt"]
    }

    async def execute(self, target_agent_id: str, subtask_prompt: str) -> str:
        return await delegate_subtask_to_agent(target_agent_id, subtask_prompt)


async def delegate_subtask_to_agent(target_agent_id: str, subtask_prompt: str) -> str:
    from omweb.agents.registry import agent_registry
    from app.agent.manus import Manus
    
    manifest = agent_registry.get_agent(target_agent_id)
    if not manifest:
        return f"Handover Error: Target agent '{target_agent_id}' does not exist in registry."

    sub_agent = Manus()
    allowed_tools = [t.lower() for t in manifest.get("tools", [])]
    allowed_tools.extend(["terminate", "ask_human"])

    if hasattr(sub_agent, "tools") and isinstance(sub_agent.tools, list):
        sub_agent.tools = [
            t for t in sub_agent.tools 
            if getattr(t, "name", t.__class__.__name__).lower() in allowed_tools
        ]

    sys_prompt = manifest.get("system_prompt", "").strip()
    if sys_prompt and hasattr(sub_agent, "system_prompt"):
        sub_agent.system_prompt = f"{sys_prompt}\n\n{sub_agent.system_prompt}"

    print(f"[HANDOVER] Delegating subtask to '{manifest['name']}' (ID: {target_agent_id})...")
    try:
        await sub_agent.run(subtask_prompt)
        return f"Handover Success: Subtask completed by {manifest['name']}."
    except Exception as e:
        return f"Handover Execution Exception: {str(e)}"
