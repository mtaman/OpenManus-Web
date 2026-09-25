import json
import asyncio
from enum import Enum
from typing import Dict, Any, Optional, AsyncGenerator
from pydantic import BaseModel

class SSEEventType(str, Enum):
    STATUS = "status"
    STEP_START = "step_start"
    THOUGHT = "thought"
    TOOL_CALL = "tool_call"
    OBSERVATION = "observation"
    STEP_END = "step_end"
    FINAL = "final"
    ERROR = "error"
    DONE = "done"

class SSEEvent(BaseModel):
    type: SSEEventType
    step: int = 1
    data: Dict[str, Any] = {}

    def to_json(self) -> str:
        payload = {
            "type": self.type.value,
            "step": self.step,
            "data": self.data
        }
        return json.dumps(payload, ensure_ascii=False)

# Global event stream dispatch registry
_job_queues: Dict[str, asyncio.Queue] = {}
_lock = asyncio.Lock()

async def get_or_create_queue(job_id: str) -> asyncio.Queue:
    async with _lock:
        if job_id not in _job_queues:
            _job_queues[job_id] = asyncio.Queue()
        return _job_queues[job_id]

async def dispatch_event(job_id: str, event: SSEEvent) -> None:
    queue = await get_or_create_queue(job_id)
    await queue.put(event)

async def subscribe_events(job_id: str) -> AsyncGenerator[SSEEvent, None]:
    queue = await get_or_create_queue(job_id)
    while True:
        event: SSEEvent = await queue.get()
        yield event
        queue.task_done()
        if event.type in (SSEEventType.FINAL, SSEEventType.ERROR, SSEEventType.DONE):
            break