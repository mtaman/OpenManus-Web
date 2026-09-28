import sys
import os
import json
import asyncio
import traceback
from pathlib import Path
from typing import Any, Dict, Optional

from omweb.sse_events import dispatch_event, SSEEvent, SSEEventType
from omweb.job_manager import job_manager
from omweb.project_manager import project_manager
from omweb.engine_resolver import resolve_active_engine_path

human_answers: Dict[str, asyncio.Event] = {}
human_data: Dict[str, str] = {}
active_tasks: Dict[str, asyncio.Task] = {}
current_active_job_id: Dict[str, str] = {}

def read_active_toml_config() -> Dict[str, Any]:
    """Read active config.toml from engine path directly from disk."""
    engine_path = resolve_active_engine_path()
    candidates = [
        engine_path / "config" / "config.toml",
        engine_path / "config.toml",
        Path(__file__).resolve().parent.parent / "config.toml",
        Path(r"D:\AI\OpenManus\config\config.toml")
    ]
    
    target_file = None
    for cand in candidates:
        if cand.is_file():
            target_file = cand
            break
            
    if not target_file:
        return {}

    try:
        try:
            import tomllib
            with open(target_file, "rb") as f:
                return tomllib.load(f)
        except ImportError:
            try:
                import tomli
                with open(target_file, "rb") as f:
                    return tomli.load(f)
            except ImportError:
                import toml
                with open(target_file, "r", encoding="utf-8") as f:
                    return toml.load(f)
    except Exception as e:
        print(f"[BRIDGE WARNING] Could not parse config.toml: {e}")
        return {}

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

def inject_runtime_llm(agent: Any, active_llm: Dict[str, Any]):
    """Dynamically inject runtime LLM configuration into the agent instance."""
    model = active_llm.get("model")
    base_url = active_llm.get("base_url")
    api_key = active_llm.get("api_key") or "EMPTY"
    api_type = active_llm.get("api_type", "")
    
    # 1. Update global app.config in memory if available
    try:
        import app.config as app_config_mod
        if hasattr(app_config_mod, "config"):
            cfg = getattr(app_config_mod, "config")
            if hasattr(cfg, "llm"):
                llm_attr = getattr(cfg, "llm")
                if isinstance(llm_attr, dict):
                    llm_attr.update(active_llm)
                else:
                    for k, v in active_llm.items():
                        if hasattr(llm_attr, k):
                            setattr(llm_attr, k, v)
    except Exception as ex:
        print(f"[BRIDGE] Notice: could not patch app.config directly: {ex}")

    # 2. Update agent instance attributes directly
    if hasattr(agent, "llm"):
        if model and hasattr(agent.llm, "model"):
            agent.llm.model = model
            
        if base_url:
            try:
                from openai import AsyncOpenAI
                agent.llm.client = AsyncOpenAI(
                    api_key=api_key,
                    base_url=base_url
                )
                print(f"[BRIDGE] Successfully injected runtime AsyncOpenAI client (model={model}, base_url={base_url})")
            except Exception as client_err:
                print(f"[BRIDGE WARNING] Could not rebuild AsyncOpenAI client: {client_err}")

async def run_instrumented(
    job_id: str, 
    prompt: str, 
    llm_override: Optional[Dict[str, Any]] = None
) -> None:
    print(f"\n[BRIDGE] Initializing agent for job: {job_id}")
    current_active_job_id["current"] = job_id
    
    # Resolve active LLM parameters: merge disk config with request override
    toml_cfg = read_active_toml_config()
    active_llm = dict(toml_cfg.get("llm", {}))
    if llm_override:
        for k, v in llm_override.items():
            if v:
                active_llm[k] = v

    provider_name = active_llm.get("provider_name") or active_llm.get("provider") or "Active Primary"
    model_name = active_llm.get("model") or "default"
    base_url = active_llm.get("base_url") or "http://127.0.0.1:1234/v1"
    
    print(f"[BRIDGE] Target LLM: [{provider_name}] Model: '{model_name}' | URL: '{base_url}'")
    
    try:
        from app.agent.manus import Manus
    except ImportError as e:
        print(f"[BRIDGE ERROR] Failed to import OpenManus core: {e}")
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.ERROR, step=0, data={"message": str(e)}))
        return

    await asyncio.sleep(0.3)
    await dispatch_event(
        job_id, 
        SSEEvent(
            type=SSEEventType.STEP_START, 
            step=1, 
            data={
                "status": "running",
                "model": model_name,
                "provider": provider_name
            }
        )
    )

    agent = Manus()
    
    # Inject active LLM configuration into the agent
    inject_runtime_llm(agent, active_llm)

    original_step = agent.step
    async def instrumented_step():
        curr_step = getattr(agent, "current_step", 1)
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.STEP_START, step=curr_step, data={"step": curr_step}))
        result = await original_step()
        
        if hasattr(agent, "memory") and hasattr(agent.memory, "messages"):
            for m in reversed(agent.memory.messages[-3:]):
                role = getattr(m, "role", "")
                content = getattr(m, "content", "")
                if role == "assistant" and content:
                    await dispatch_event(job_id, SSEEvent(type=SSEEventType.THOUGHT, step=curr_step, data={"thought": content}))
                    break
        return result

    original_execute_tool = agent.execute_tool
    async def instrumented_execute_tool(command):
        tool_name = getattr(command.function, "name", "unknown") if hasattr(command, "function") else "unknown"
        raw_args = getattr(command.function, "arguments", "{}") if hasattr(command, "function") else "{}"
        curr_step = getattr(agent, "current_step", 1)
        
        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.TOOL_CALL,
                step=curr_step,
                data={"name": tool_name, "arguments": raw_args}
            )
        )
        
        obs_output = await original_execute_tool(command)
        
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
        # Enforce isolated chat deliverables directory inside storage repository
        chat = project_manager.get_chat(job_id) or {}
        chat_id = chat.get("id", f"chat_{job_id}")
        project_id = chat.get("project_id", "default_project")
        project_dir = project_manager.get_chat_files_dir(chat_id, project_id)
        
        scoped_prompt = (
            f"[PROJECT CONTEXT]\n"
            f"You MUST create and save all project files and deliverables strictly inside this directory: "
            f"{project_dir.resolve()}\n\n"
            f"[USER PROMPT]\n"
            f"{prompt}"
        )
        final_out = await agent.run(scoped_prompt)
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
