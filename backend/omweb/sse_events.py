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


_subscribers: Dict[str, List[asyncio.Queue]] = {}


def log_chat_event(job_id: str, event: Any) -> None:
    """Appends live agent steps, thoughts, and tool observations into the chat directory log file."""
    try:
        from omweb.routers.run import JOB_TO_CHAT_ID
        chat_id = JOB_TO_CHAT_ID.get(job_id, job_id)
        if not chat_id:
            return
        from omweb.project_manager import project_manager
        from datetime import datetime
        chat = project_manager.get_chat(chat_id)
        project_id = chat.get("project_id", "default_project") if chat else "default_project"
        chat_dir = project_manager.get_chat_dir(chat_id, project_id)
        chat_dir.mkdir(parents=True, exist_ok=True)
        log_file = chat_dir / "chat.log"

        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        etype = getattr(event, "type", "info")
        if hasattr(etype, "value"):
            etype = etype.value
        edata = getattr(event, "data", "")

        line = ""
        if isinstance(edata, dict):
            if "thought" in edata:
                line = f"[{ts}] [THOUGHT] {edata['thought']}"
            elif "tool_name" in edata or "name" in edata:
                tname = edata.get("tool_name") or edata.get("name")
                args = edata.get("arguments") or edata.get("args") or ""
                line = f"[{ts}] [TOOL_CALL] {tname}({args})"
            elif "observation" in edata:
                line = f"[{ts}] [OBSERVATION] {edata['observation']}"
            elif "content" in edata:
                line = f"[{ts}] [{str(etype).upper()}] {edata['content']}"
            else:
                line = f"[{ts}] [{str(etype).upper()}] {json.dumps(edata, ensure_ascii=False)}"
        else:
            line = f"[{ts}] [{str(etype).upper()}] {edata}"

        with open(log_file, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


async def subscribe_events(job_id: str):
    """Async generator yielding SSE events for run.py async for loop."""
    q: asyncio.Queue = asyncio.Queue()
    if job_id not in _subscribers:
        _subscribers[job_id] = []
    _subscribers[job_id].append(q)
    try:
        while True:
            event = await q.get()
            yield event
            if getattr(event, "type", None) in (SSEEventType.DONE, SSEEventType.ERROR):
                break
    finally:
        if job_id in _subscribers and q in _subscribers[job_id]:
            _subscribers[job_id].remove(q)
            if not _subscribers[job_id]:
                del _subscribers[job_id]


async def dispatch_event(job_id: str, event: SSEEvent) -> None:
    log_chat_event(job_id, event)
    queues = _subscribers.get(job_id, [])
    for q in queues:
        await q.put(event)


# Backward-compatibility alias
publish_event = dispatch_event
