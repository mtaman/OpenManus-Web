import json
import asyncio
from enum import Enum
from typing import Any, Dict, Optional, AsyncGenerator
from pydantic import BaseModel, Field

# Global, persistent event queues across the entire process
GLOBAL_JOB_QUEUES: Dict[str, asyncio.Queue] = {}

def get_or_create_queue(job_id: str) -> asyncio.Queue:
    if job_id not in GLOBAL_JOB_QUEUES:
        GLOBAL_JOB_QUEUES[job_id] = asyncio.Queue()
    return GLOBAL_JOB_QUEUES[job_id]

class SSEEventType(str, Enum):
    STEP_START = "step_start"
    THOUGHT = "thought"
    TOOL_CALL = "tool_call"
    OBSERVATION = "observation"
    STEP_END = "step_end"
    FINAL = "final"
    ERROR = "error"
    STATUS = "status"

class SSEEvent(BaseModel):
    type: SSEEventType
    step: int = 1
    data: Dict[str, Any] = Field(default_factory=dict)

    def to_sse_payload(self) -> Dict[str, Any]:
        return {
            "event": self.type.value,
            "data": self.model_dump_json()
        }

async def job_event_generator(job_id: str) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Streams SSE events for a specific job from the central queue safely.
    """
    queue = get_or_create_queue(job_id)

    while True:
        event = await queue.get()
        if isinstance(event, SSEEvent):
            yield event.to_sse_payload()
        elif isinstance(event, dict):
            yield {
                "event": event.get("event", "status"),
                "data": json.dumps(event.get("data", {}))
            }
        queue.task_done()

        # Stop stream on terminal states
        event_type = getattr(event, "type", None) or (event.get("event") if isinstance(event, dict) else None)
        if event_type in (SSEEventType.FINAL, SSEEventType.FINAL.value, SSEEventType.ERROR, SSEEventType.ERROR.value):
            break