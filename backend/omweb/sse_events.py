import asyncio
import json
from typing import Dict, Any, AsyncGenerator
from enum import Enum
from pydantic import BaseModel
from starlette.requests import Request

class SSEEventType(str, Enum):
    STATUS = "status"
    STEP_START = "step_start"
    THOUGHT = "thought"
    TOOL_CALL = "tool_call"
    OBSERVATION = "observation"
    STEP_END = "step_end"
    FINAL = "final"
    ERROR = "error"

class SSEEvent(BaseModel):
    type: SSEEventType
    step: int
    data: Dict[str, Any]

# Central in-memory event queues per job
GLOBAL_JOB_QUEUES: Dict[str, asyncio.Queue] = {}

def get_job_queue(job_id: str) -> asyncio.Queue:
    if job_id not in GLOBAL_JOB_QUEUES:
        GLOBAL_JOB_QUEUES[job_id] = asyncio.Queue()
    return GLOBAL_JOB_QUEUES[job_id]

async def dispatch_event(job_id: str, event: SSEEvent) -> None:
    queue = get_job_queue(job_id)
    await queue.put(event)

async def job_event_generator(job_id: str, request: Request = None) -> AsyncGenerator[Dict[str, Any], None]:
    queue = get_job_queue(job_id)
    try:
        while True:
            if request and await request.is_disconnected():
                break

            try:
                event: SSEEvent = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                # SSE comment heartbeat to keep connection alive
                yield {"comment": "keep-alive"}
                continue

            yield {
                "event": event.type.value,
                "data": json.dumps({"step": event.step, "data": event.data})
            }

            if event.type in (SSEEventType.FINAL, SSEEventType.ERROR):
                break
    finally:
        # Clean up queue when stream finishes
        if job_id in GLOBAL_JOB_QUEUES and queue.empty():
            GLOBAL_JOB_QUEUES.pop(job_id, None)