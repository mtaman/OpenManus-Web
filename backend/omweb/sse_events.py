import json
import asyncio
from enum import Enum
from typing import Dict, Any, AsyncGenerator

class SSEEventType(str, Enum):
    STEP_START = "step_start"
    THOUGHT = "thought"
    TOOL_CALL = "tool_call"
    OBSERVATION = "observation"
    STEP_END = "step_end"
    FINAL = "final"
    ERROR = "error"
    PING = "ping"

class SSEEvent:
    def __init__(self, type: SSEEventType, step: int = 1, data: Any = None):
        self.type = type
        self.step = step
        self.data = data or {}

    def to_json(self) -> str:
        payload = {
            "type": self.type.value if hasattr(self.type, "value") else str(self.type),
            "step": self.step,
            "data": self.data
        }
        return json.dumps(payload, ensure_ascii=False)

    def encode(self) -> str:
        event_name = self.type.value if hasattr(self.type, "value") else str(self.type)
        return f"event: {event_name}\ndata: {self.to_json()}\n\n"

# In-memory job stream queues
_job_queues: Dict[str, list[asyncio.Queue]] = {}

def get_job_queues(job_id: str) -> list[asyncio.Queue]:
    if job_id not in _job_queues:
        _job_queues[job_id] = []
    return _job_queues[job_id]

async def dispatch_event(job_id: str, event: SSEEvent) -> None:
    queues = get_job_queues(job_id)
    encoded = event.encode()
    for q in queues:
        await q.put(encoded)

async def subscribe_events(job_id: str) -> AsyncGenerator[str, None]:
    q: asyncio.Queue = asyncio.Queue()
    queues = get_job_queues(job_id)
    queues.append(q)
    try:
        # Send initial ping to open stream immediately
        yield SSEEvent(type=SSEEventType.PING, step=0, data={"status": "connected"}).encode()
        while True:
            msg = await q.get()
            yield msg
            if "event: final" in msg or "event: error" in msg:
                break
    finally:
        if q in queues:
            queues.remove(q)