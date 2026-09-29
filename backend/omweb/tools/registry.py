from typing import Dict, Any, List

AVAILABLE_TOOLS: List[Dict[str, Any]] = [
    {
        "id": "bash",
        "name": "Bash Terminal",
        "category": "system",
        "description": "Executes shell and terminal commands inside the execution workspace.",
        "safety_level": "controlled",
        "parameters": {"command": "string"}
    },
    {
        "id": "python_execute",
        "name": "Python Sandbox",
        "category": "execution",
        "description": "Executes stateful Python scripts, calculations, and data processing.",
        "safety_level": "safe",
        "parameters": {"code": "string"}
    },
    {
        "id": "file_saver",
        "name": "File Deliverable Manager",
        "category": "storage",
        "description": "Creates, updates, and formats workspace deliverables and project assets.",
        "safety_level": "safe",
        "parameters": {"filename": "string", "content": "string"}
    },
    {
        "id": "web_search",
        "name": "Web Search",
        "category": "network",
        "description": "Searches online knowledge databases and indexes real-time results.",
        "safety_level": "read_only",
        "parameters": {"query": "string"}
    },
    {
        "id": "browser_use",
        "name": "Headless Browser Navigation",
        "category": "network",
        "description": "Navigates websites, clicks, interacts with DOM, and extracts web content.",
        "safety_level": "controlled",
        "parameters": {"url": "string", "action": "string"}
    },
    {
        "id": "ask_human",
        "name": "Human Feedback Inquirer",
        "category": "interaction",
        "description": "Pauses agent autonomy and requests clarification or decision from the user.",
        "safety_level": "safe",
        "parameters": {"question": "string"}
    }
]

class ToolRegistry:
    def list_tools(self) -> List[Dict[str, Any]]:
        return AVAILABLE_TOOLS

    def get_tool(self, tool_id: str) -> Dict[str, Any]:
        for t in AVAILABLE_TOOLS:
            if t["id"] == tool_id:
                return t
        return {"id": tool_id, "name": tool_id, "category": "custom", "description": "Custom registered tool"}

tool_registry = ToolRegistry()
