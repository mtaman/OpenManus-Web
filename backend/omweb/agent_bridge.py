import sys
import asyncio
import traceback
from typing import Any, Dict
from omweb.sse_events import dispatch_event, SSEEvent, SSEEventType
from omweb.job_manager import job_manager

human_answers: Dict[str, asyncio.Event] = {}
human_data: Dict[str, str] = {}
active_tasks: Dict[str, asyncio.Task] = {}
current_active_job_id: Dict[str, str] = {}

def apply_global_ask_human_patch():
    """Intercept AskHuman.execute globally in memory to prevent terminal blocking."""
    try:
        import app.tool.ask_human as ask_human_module
        if hasattr(ask_human_module, "AskHuman"):
            cls = ask_human_module.AskHuman
            
            async def patched_execute(self, inquire: str = "", **kwargs):
                job_id = current_active_job_id.get("current", "")
                question = inquire or kwargs.get("question") or "Agent requires your feedback."
                print(f"[BRIDGE] Intercepted ask_human for job {job_id}: {question}")
                
                if job_id:
                    # Dispatch dedicated ask_human tool_call event to frontend
                    await dispatch_event(
                        job_id,
                        SSEEvent(
                            type=SSEEventType.TOOL_CALL,
                            step=1,
                            data={"name": "ask_human", "arguments": question}
                        )
                    )
                    
                    wait_event = asyncio.Event()
                    human_answers[job_id] = wait_event
                    
                    # PROPER ASYNCIO EVENT WAIT
                    try:
                        await asyncio.wait_for(wait_event.wait(), timeout=600.0)
                        user_reply = human_data.pop(job_id, "Approved.")
                    except asyncio.TimeoutError:
                        user_reply = "No user response provided within timeout."
                    finally:
                        human_answers.pop(job_id, None)
                        
                    print(f"[BRIDGE] Received human response: {user_reply}")
                    return f"User response: {user_reply}"
                return "Proceed with autonomous decision."
            
            cls.execute = patched_execute
            print("[BRIDGE] Successfully applied in-memory patch to AskHuman.execute")
    except Exception as e:
        print(f"[BRIDGE WARNING] Could not patch AskHuman: {e}")

# Apply patch immediately on module load
apply_global_ask_human_patch()

async def run_instrumented(job_id: str, prompt: str) -> None:
    print(f"\n[BRIDGE] Initializing agent for job: {job_id}")
    current_active_job_id["current"] = job_id
    
    try:
        from app.agent.manus import Manus
    except ImportError as e:
        print(f"[BRIDGE ERROR] Failed to import OpenManus core: {e}")
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.ERROR, step=0, data={"message": str(e)}))
        return

    await asyncio.sleep(0.3)
    await dispatch_event(job_id, SSEEvent(type=SSEEventType.STEP_START, step=1, data={"status": "running"}))

    agent = Manus()

    # Hook agent.step to capture every thought and progress event
    original_step = agent.step

    async def instrumented_step():
        curr_step = getattr(agent, "current_step", 1)
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.STEP_START, step=curr_step, data={"step": curr_step}))
        result = await original_step()
        
        # Stream thoughts
        if hasattr(agent, "memory") and hasattr(agent.memory, "messages"):
            for m in reversed(agent.memory.messages[-3:]):
                role = getattr(m, "role", "")
                content = getattr(m, "content", "")
                if role == "assistant" and content:
                    await dispatch_event(job_id, SSEEvent(type=SSEEventType.THOUGHT, step=curr_step, data={"thought": content}))
                    break
        return result

        # Real-time tool interception hook
    original_execute_tool = agent.execute_tool
    async def instrumented_execute_tool(command):
        tool_name = getattr(command.function, "name", "unknown") if hasattr(command, "function") else "unknown"
        raw_args = getattr(command.function, "arguments", "{}") if hasattr(command, "function") else "{}"
        curr_step = getattr(agent, "current_step", 1)
        
        # Dispatch tool_call event live before execution
        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.TOOL_CALL,
                step=curr_step,
                data={"name": tool_name, "arguments": raw_args}
            )
        )
        
        obs_output = await original_execute_tool(command)
        
        # Dispatch observation event live immediately after execution
        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.OBSERVATION,
                step=curr_step,
                data={"output": obs_output}
            )
        )
        return obs_output

    agent.execute_tool = instrumented_execute_tool
    agent.step = instrumented_step

    try:
        final_out = await agent.run(prompt)
        print(f"[BRIDGE] Execution completed successfully for job: {job_id}")
        result_text = str(final_out) if final_out else "Task completed successfully."
        job_manager.complete_job(job_id, result_text)
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.FINAL, step=getattr(agent, "current_step", 1), data={"result": result_text}))
    except asyncio.CancelledError:
        print(f"[BRIDGE] Job was aborted: {job_id}")
    except Exception as err:
        tb = traceback.format_exc()
        print(f"[BRIDGE ERROR] {err}\n{tb}")
        job_manager.fail_job(job_id, str(err))
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.ERROR, step=getattr(agent, "current_step", 1), data={"message": str(err)}))
    finally:
        human_answers.pop(job_id, None)
        human_data.pop(job_id, None)
        active_tasks.pop(job_id, None)
        if current_active_job_id.get("current") == job_id:
            current_active_job_id.pop("current", None)
