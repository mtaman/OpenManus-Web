import sys
import re
import asyncio
from typing import Dict, Any, Optional

from omweb.engine_resolver import inject_engine_to_syspath
from omweb.sse_events import dispatch_event, SSEEvent, SSEEventType
from omweb.config import WORKSPACE_ROOT

# Dynamically inject active engine root into sys.path
inject_engine_to_syspath()

def sanitize_code(code: str) -> str:
    """Strip markdown code block fences if injected by the LLM."""
    if not isinstance(code, str):
        return code
    cleaned = re.sub(r"^```[a-zA-Z]*\n", "", code.strip())
    cleaned = re.sub(r"\n```$", "", cleaned.strip())
    return cleaned

async def run_instrumented(job_id: str, prompt: str, max_steps: int = 20) -> None:
    from app.agent.manus import Manus
    from app.schema import Memory, Message

    step_counter = 1
    last_assistant_message = ""
    original_add_message = Memory.add_message

    def patched_add_message(self, message: Message):
        nonlocal step_counter, last_assistant_message
        result = original_add_message(self, message)

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            if message.content and message.role == "assistant":
                last_assistant_message = message.content
                asyncio.run_coroutine_threadsafe(
                    dispatch_event(
                        job_id,
                        SSEEvent(
                            type=SSEEventType.THOUGHT,
                            step=step_counter,
                            data={"thought": message.content},
                        ),
                    ),
                    loop,
                )

            if hasattr(message, "tool_calls") and message.tool_calls:
                for tc in message.tool_calls:
                    args = getattr(tc, "arguments", {}) or {}
                    if "code" in args and isinstance(args["code"], str):
                        args["code"] = sanitize_code(args["code"])

                    asyncio.run_coroutine_threadsafe(
                        dispatch_event(
                            job_id,
                            SSEEvent(
                                type=SSEEventType.TOOL_CALL,
                                step=step_counter,
                                data={
                                    "tool": getattr(tc, "name", "tool"),
                                    "toolCallId": getattr(tc, "id", None),
                                    "arguments": args,
                                },
                            ),
                        ),
                        loop,
                    )

            if message.role == "tool":
                asyncio.run_coroutine_threadsafe(
                    dispatch_event(
                        job_id,
                        SSEEvent(
                            type=SSEEventType.OBSERVATION,
                            step=step_counter,
                            data={
                                "toolCallId": getattr(message, "tool_call_id", None),
                                "output": message.content,
                            },
                        ),
                    ),
                    loop,
                )
                step_counter += 1

        return result

    Memory.add_message = patched_add_message

    try:
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.STATUS, step=1, data={"state": "running"}))
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.STEP_START, step=1, data={"step": 1}))

        agent = Manus(max_steps=max_steps)
        await agent.run(prompt)

        final_text = last_assistant_message if last_assistant_message else "Task completed successfully."
        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.FINAL,
                step=step_counter,
                data={"result": final_text},
            ),
        )
    except Exception as e:
        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.ERROR,
                step=step_counter,
                data={"message": str(e), "code": "execution_failed"},
            ),
        )
    finally:
        Memory.add_message = original_add_message

run_agent_job = run_instrumented