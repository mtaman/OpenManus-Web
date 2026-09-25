import os
import sys
import asyncio
from typing import Dict, Any, Optional

OPENMANUS_ROOT = r"D:\AI\OpenManus"
if OPENMANUS_ROOT not in sys.path:
    sys.path.insert(0, OPENMANUS_ROOT)

from omweb.job_manager import job_manager
from omweb.sse_events import SSEEventType, SSEEvent, get_or_create_queue

async def dispatch_event(job_id: str, event: SSEEvent):
    try:
        queue = get_or_create_queue(job_id)
        await queue.put(event)
    except Exception as e:
        print(f"[SSE Dispatch Error]: {e}")

async def run_agent_job(job_id: str, prompt: str, max_steps: int = 20, **kwargs):
    if hasattr(job_manager, "start_job"):
        await job_manager.start_job(job_id)
    elif hasattr(job_manager, "update_job_status"):
        await job_manager.update_job_status(job_id, "running")

    await dispatch_event(
        job_id,
        SSEEvent(
            type=SSEEventType.STEP_START,
            step=1,
            data={"status": "running", "prompt": prompt}
        )
    )

    last_assistant_thought = ""

    try:
        from app.agent.manus import Manus
        from app.schema import Message

        agent = Manus()
        if hasattr(agent, "max_steps"):
            agent.max_steps = max_steps

        # Monkey patch execute_tool to broadcast live tool events
        if hasattr(agent, "execute_tool"):
            original_exec = agent.execute_tool

            async def patched_exec(tool_call, *args, **kwargs):
                tool_name = getattr(tool_call, "name", "tool")
                tool_args = getattr(tool_call, "arguments", {})
                
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(dispatch_event(
                        job_id,
                        SSEEvent(
                            type=SSEEventType.TOOL_CALL,
                            step=getattr(agent, "current_step", 1),
                            data={"tool": tool_name, "arguments": tool_args}
                        )
                    ))
                except Exception:
                    pass

                result = await original_exec(tool_call, *args, **kwargs)

                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(dispatch_event(
                        job_id,
                        SSEEvent(
                            type=SSEEventType.OBSERVATION,
                            step=getattr(agent, "current_step", 1),
                            data={"tool": tool_name, "output": str(result)}
                        )
                    ))
                except Exception:
                    pass

                return result

            object.__setattr__(agent, "execute_tool", patched_exec)

        # Patch memory to track assistant thoughts
        if hasattr(agent.memory, "messages"):
            pass

        original_think = agent.think if hasattr(agent, "think") else None
        if original_think:
            async def patched_think():
                nonlocal last_assistant_thought
                thought_res = await original_think()
                # Inspect recent messages for assistant thought
                if hasattr(agent.memory, "messages") and agent.memory.messages:
                    for m in reversed(agent.memory.messages):
                        if getattr(m, "role", "") == "assistant" and getattr(m, "content", ""):
                            last_assistant_thought = str(m.content)
                            try:
                                loop = asyncio.get_running_loop()
                                loop.create_task(dispatch_event(
                                    job_id,
                                    SSEEvent(
                                        type=SSEEventType.THOUGHT,
                                        step=getattr(agent, "current_step", 1),
                                        data={"thought": last_assistant_thought}
                                    )
                                ))
                            except Exception:
                                pass
                            break
                return thought_res

            object.__setattr__(agent, "think", patched_think)

        result = await agent.run(prompt)

        final_content = ""
        # If result is just a terminate confirmation, extract real thought
        res_str = str(result) if result else ""
        if "completed with status" in res_str or not res_str.strip():
            final_content = last_assistant_thought if last_assistant_thought else res_str
        else:
            final_content = res_str

        if not final_content:
            final_content = "Task executed successfully."

        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.FINAL,
                step=getattr(agent, "current_step", 1),
                data={"result": final_content}
            )
        )

        if hasattr(job_manager, "complete_job"):
            await job_manager.complete_job(job_id, final_content)
        elif hasattr(job_manager, "update_job_status"):
            await job_manager.update_job_status(job_id, "completed", result=final_content)

    except Exception as e:
        error_msg = str(e)
        print(f"Agent execution failed: {error_msg}")
        
        if hasattr(job_manager, "fail_job"):
            await job_manager.fail_job(job_id, error_msg)
        elif hasattr(job_manager, "update_job_status"):
            await job_manager.update_job_status(job_id, "failed", error=error_msg)

        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.ERROR,
                step=1,
                data={"error": error_msg}
            )
        )