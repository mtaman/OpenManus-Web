"""
Sovereign Base Tool Specification - OpenManus Web Core.
Independent base class for native, custom, and sandboxed execution tools.
Decoupled entirely from external runner frameworks.
"""

from __future__ import annotations
import inspect
from typing import Any, Dict, Optional, Callable
from pydantic import BaseModel, Field


class SovereignBaseTool(BaseModel):
    """
    Sovereign Base Tool foundation.
    Every core tool and user-uploaded tool must inherit from this specification.
    """
    name: str = Field(..., description="Unique machine-readable tool identifier.")
    description: str = Field(..., description="Actionable explanation of tool capabilities for LLM reasoning.")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="JSON Schema parameter specifications.")
    safety_level: str = Field(default="safe", description="Safety tier: safe | read_only | dangerous")
    category: str = Field(default="custom", description="Category: execution | system | storage | network | custom")
    is_enabled: bool = Field(default=True, description="Runtime enablement switch.")
    is_builtin: bool = Field(default=False, description="Whether tool belongs to protected core.")

    async def execute(self, **kwargs: Any) -> Any:
        """
        Execute tool logic asynchronously. Must be implemented by custom tools.
        """
        raise NotImplementedError(f"Tool '{self.name}' must implement an asynchronous execute() method.")

    def to_manifest(self) -> Dict[str, Any]:
        """Export serialized tool metadata for store catalog and LLM function calling schemas."""
        return {
            "id": self.name,
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "safety_level": self.safety_level,
            "category": self.category,
            "is_enabled": self.is_enabled,
            "is_builtin": self.is_builtin,
            "status": "active" if self.is_enabled else "disabled"
        }