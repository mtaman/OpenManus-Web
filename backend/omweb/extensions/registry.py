import json
from pathlib import Path
from typing import Dict, Any, List

class ExtensionRegistry:
    def __init__(self):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.store_dir = base_dir / "storage" / "store"
        self.store_dir.mkdir(parents=True, exist_ok=True)
        self.ext_file = self.store_dir / "extensions.json"
        self._ensure_storage()

    def _ensure_storage(self):
        if not self.ext_file.exists():
            initial = [
                {
                    "id": "mcp_filesystem",
                    "name": "MCP Local Filesystem",
                    "type": "mcp_server",
                    "status": "active",
                    "command": "npx -y @modelcontextprotocol/server-filesystem",
                    "description": "Exposes local filesystem directories safely to agents."
                },
                {
                    "id": "mcp_github",
                    "name": "MCP GitHub Integration",
                    "type": "mcp_server",
                    "status": "ready",
                    "command": "npx -y @modelcontextprotocol/server-github",
                    "description": "Enables repository inspection, issues retrieval, and commit automation."
                }
            ]
            self.ext_file.write_text(json.dumps(initial, indent=2, ensure_ascii=False), encoding="utf-8")

    def list_extensions(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.ext_file.read_text(encoding="utf-8"))
        except Exception:
            return []

extension_registry = ExtensionRegistry()
