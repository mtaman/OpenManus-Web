import json
import asyncio
from typing import Dict, Any, List, Optional
from enum import Enum

class SSEEventType(str, Enum):
    PING = "ping"
    STEP_START = "step_start"
    THOUGHT = "thought"
    TOOL_CALL = "tool_call"
    OBSERVATION = "observation"
    STEP_END = "step_end"
    HUMAN_ASK = "human_ask"
    FINAL = "final"
    ERROR = "error"
    DONE = "done"

class SSEEvent:
    def __init__(self, type: SSEEventType, step: int = 1, data: Any = None):
        self.type = type
        self.step = step
        self.data = data if data is not None else {}

    def to_json(self) -> str:
        clean_data = self.data
        if self.type == SSEEventType.TOOL_CALL and isinstance(clean_data, dict):
            clean_data = dict(clean_data)
            args = clean_data.get("arguments") or clean_data.get("args")
            if isinstance(args, dict) and "file_text" in args:
                args = dict(args)
                text = str(args["file_text"])
                if len(text) > 200:
                    args["file_text"] = text[:120] + f"... [code preview truncated for UI stream, {len(text)} bytes]"
                clean_data["arguments"] = args
        payload = {
            "type": self.type.value if hasattr(self.type, "value") else str(self.type),
            "step": self.step,
            "data": clean_data
        }
        return json.dumps(payload, ensure_ascii=False)

    def encode(self) -> str:
        event_name = self.type.value if hasattr(self.type, "value") else str(self.type)
        json_data = self.to_json()
        return f"event: {event_name}\ndata: {json_data}\n\n"

_job_queues: Dict[str, List[asyncio.Queue]] = {}

def get_job_queues(job_id: str) -> List[asyncio.Queue]:
    if job_id not in _job_queues:
        _job_queues[job_id] = []
    return _job_queues[job_id]

async def dispatch_event(job_id: str, event: SSEEvent) -> None:
    queues = get_job_queues(job_id)
    encoded = event.encode()
    for q in queues:
        await q.put(encoded)

async def subscribe_events(job_id: str):
    q = asyncio.Queue()
    queues = get_job_queues(job_id)
    queues.append(q)
    try:
        yield SSEEvent(type=SSEEventType.PING, step=0, data={"status": "connected"}).encode()
        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=5.0)
                yield msg
                if "event: final" in msg or "event: error" in msg:
                    break
            except asyncio.TimeoutError:
                # Keep-alive heartbeat comment to prevent browser SSE timeout
                yield ": keep-alive\n\n"
    finally:
        if q in queues:
            queues.remove(q)


