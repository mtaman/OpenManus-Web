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
    # 1. Record event in job_manager for late connection replay
    try:
        from omweb.job_manager import job_manager
        ev_type_str = event.type.value if hasattr(event.type, "value") else str(event.type)
        job_manager.append_event(job_id, {
            "type": ev_type_str,
            "step": event.step,
            "data": event.data
        })
    except Exception:
        pass

    # 2. Forward SSEEvent directly to active queues
    queues = get_job_queues(job_id)
    for q in queues:
        await q.put(event)

async def subscribe_events(job_id: str):
    q = asyncio.Queue()
    queues = get_job_queues(job_id)
    queues.append(q)
    try:
        # Initial connect ping
        yield SSEEvent(type=SSEEventType.PING, step=0, data={"status": "connected"})
        while True:
            try:
                evt = await asyncio.wait_for(q.get(), timeout=12.0)
                yield evt
                ev_type = evt.type.value if hasattr(evt.type, "value") else str(evt.type)
                if str(ev_type).lower() in ["final", "error", "done"]:
                    break
            except asyncio.TimeoutError:
                # Keep-alive heartbeat to prevent browser timeout
                yield SSEEvent(type=SSEEventType.PING, step=0, data={"keepalive": True})
    finally:
        if q in queues:
            queues.remove(q)