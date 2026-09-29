import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["MPLBACKEND"] = "Agg"
os.environ["QT_QPA_PLATFORM"] = "offscreen"

import sys
import json
import asyncio
import traceback
from pathlib import Path
from typing import Any, Dict, Optional, Set, List

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

def apply_global_python_execute_patch():
    """Intercept PythonExecute globally in memory to enforce headless Agg backend and timeout."""
    try:
        import app.tool.python_execute as py_tool_mod
        if hasattr(py_tool_mod, "PythonExecute"):
            cls = py_tool_mod.PythonExecute
            orig_execute = cls.execute
            
            async def patched_execute(self, code: str = "", **kwargs):
                safe_header = (
                    "import os, sys\n"
                    "os.environ['MPLBACKEND'] = 'Agg'\n"
                    "try:\n"
                    "    import matplotlib\n"
                    "    matplotlib.use('Agg')\n"
                    "    import matplotlib.pyplot as plt\n"
                    "    plt.show = lambda *args, **kwargs: None\n"
                    "except Exception:\n"
                    "    pass\n\n"
                )
                wrapped_code = safe_header + code
                
                job_id = current_active_job_id.get("current", "")
                if job_id:
                    try:
                        chat = project_manager.get_chat(job_id) or {}
                        cid = chat.get("id", f"chat_{job_id}")
                        pid = chat.get("project_id", "default_project")
                        pdir = project_manager.get_chat_files_dir(cid, pid)
                        pdir.mkdir(parents=True, exist_ok=True)
                        os.chdir(str(pdir.resolve()))
                    except Exception as ex:
                        print(f"[BRIDGE WARNING] Could not chdir to deliverables: {ex}")

                try:
                    return await asyncio.wait_for(orig_execute(self, code=wrapped_code, **kwargs), timeout=60.0)
                except asyncio.TimeoutError:
                    return "Error: Python execution timed out after 60 seconds."
            
            cls.execute = patched_execute
            print("[BRIDGE] Successfully applied in-memory patch to PythonExecute.execute")
    except Exception as e:
        print(f"[BRIDGE WARNING] Could not patch PythonExecute module directly: {e}")

# Apply patches immediately on module load
apply_global_ask_human_patch()
apply_global_python_execute_patch()

def inject_runtime_llm(agent: Any, active_llm: Dict[str, Any]):
    """Dynamically inject runtime LLM configuration into the agent instance."""
    model = active_llm.get("model")
    base_url = active_llm.get("base_url")
    api_key = active_llm.get("api_key") or "EMPTY"
    
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
    *args: Any,
    agent_id: Any = None,
    llm_override: Optional[Dict[str, Any]] = None,
    **kwargs: Any
) -> None:
    # Universal Parameter Resolver (Defensive against Positional Argument Drift)
    for arg in args:
        if isinstance(arg, dict) and llm_override is None:
            llm_override = arg
        elif isinstance(arg, str) and agent_id is None:
            agent_id = arg

    if not agent_id and isinstance(llm_override, dict):
        agent_id = llm_override.get("agent_id")

    if not agent_id or not isinstance(agent_id, str):
        agent_id = kwargs.get("agent_id") or "manus"
    # Universal Parameter Resolver (Defensive against Positional Argument Drift)
    for arg in args:
        if isinstance(arg, dict) and llm_override is None:
            llm_override = arg
        elif isinstance(arg, str) and agent_id is None:
            agent_id = arg

    if not agent_id and isinstance(llm_override, dict):
        agent_id = llm_override.get("agent_id")

    if not agent_id or not isinstance(agent_id, str):
        agent_id = kwargs.get("agent_id") or "manus"
    print(f"\n[BRIDGE] Initializing agent for job: {job_id}")
    current_active_job_id["current"] = job_id
    
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

    # Dynamic Sovereign Agent Resolution
    from omweb.agents.registry import agent_registry
    manifest = agent_registry.get_agent(agent_id)
    print(f"[BRIDGE] Activating agent '{manifest['name']}' (ID: {agent_id})")

    # Dynamic Sovereign Agent Resolution
    from omweb.agents.registry import agent_registry
    manifest = agent_registry.get_agent(agent_id)
    print(f"[BRIDGE] Activating agent '{manifest['name']}' (ID: {agent_id})")

    # Dynamic Sovereign Agent Resolution
    from omweb.agents.registry import agent_registry
    manifest = agent_registry.get_agent(agent_id)
    print(f"[BRIDGE] Activating agent '{manifest['name']}' (ID: {agent_id})")

    agent = Manus()

    # Scope tools according to manifest, always preserving vital core tools
    allowed_tools = [t.lower() for t in manifest.get("tools", [])]
    allowed_tools.extend(["terminate", "ask_human"])

    if hasattr(agent, "tools"):
        if isinstance(agent.tools, list):
            agent.tools = [
                t for t in agent.tools 
                if getattr(t, "name", t.__class__.__name__).lower() in allowed_tools
            ]
        elif hasattr(agent.tools, "tools") and isinstance(agent.tools.tools, list):
            agent.tools.tools = [
                t for t in agent.tools.tools 
                if getattr(t, "name", t.__class__.__name__).lower() in allowed_tools
            ]
        scoped_names = [getattr(t, "name", t.__class__.__name__) for t in (agent.tools if isinstance(agent.tools, list) else agent.tools.tools)]
        print(f"[BRIDGE] Tools scoped to: {scoped_names}")

    if manifest.get("max_steps"):
        agent.max_steps = manifest["max_steps"]

    sys_prompt = manifest.get("system_prompt", "").strip()
    if sys_prompt and hasattr(agent, "system_prompt"):
        try:
            agent.system_prompt = f"{sys_prompt}\n\n{agent.system_prompt}"
        except Exception:
            pass

    # Scope tools according to manifest, always preserving vital core tools
    allowed_tools = [t.lower() for t in manifest.get("tools", [])]
    allowed_tools.extend(["terminate", "ask_human"])

    if hasattr(agent, "tools"):
        if isinstance(agent.tools, list):
            agent.tools = [
                t for t in agent.tools 
                if getattr(t, "name", t.__class__.__name__).lower() in allowed_tools
            ]
        elif hasattr(agent.tools, "tools") and isinstance(agent.tools.tools, list):
            agent.tools.tools = [
                t for t in agent.tools.tools 
                if getattr(t, "name", t.__class__.__name__).lower() in allowed_tools
            ]
        scoped_names = [getattr(t, "name", t.__class__.__name__) for t in (agent.tools if isinstance(agent.tools, list) else agent.tools.tools)]
        print(f"[BRIDGE] Tools scoped to: {scoped_names}")

    if manifest.get("max_steps"):
        agent.max_steps = manifest["max_steps"]

    sys_prompt = manifest.get("system_prompt", "").strip()
    if sys_prompt and hasattr(agent, "system_prompt"):
        try:
            agent.system_prompt = f"{sys_prompt}\n\n{agent.system_prompt}"
        except Exception:
            pass

    # Scope tools according to manifest
    allowed_tools = manifest.get("tools", [])
    if hasattr(agent, "tools") and isinstance(agent.tools, list):
        if allowed_tools:
            agent.tools = [t for t in agent.tools if getattr(t, "name", "").lower() in allowed_tools or t.__class__.__name__.lower() in allowed_tools]
            print(f"[BRIDGE] Tools scoped to: {[getattr(t, 'name', t.__class__.__name__) for t in agent.tools]}")

    if manifest.get("max_steps"):
        agent.max_steps = manifest["max_steps"]
    inject_runtime_llm(agent, active_llm)

    chat = project_manager.get_chat(job_id) or {}
    chat_id = chat.get("id", f"chat_{job_id}")
    project_id = chat.get("project_id", "default_project")
    project_dir = project_manager.get_chat_files_dir(chat_id, project_id)
    project_dir.mkdir(parents=True, exist_ok=True)

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
        
        # Inject headless matplotlib protection and cwd jailing for python tools
        if tool_name in ["python_execute", "python"]:
            try:
                args_dict = json.loads(raw_args) if isinstance(raw_args, str) else dict(raw_args)
                orig_code = args_dict.get("code", "")
                if orig_code:
                    safe_head = (
                        "import os, sys\n"
                        f"try:\n"
                        f"    os.chdir(r'{str(project_dir.resolve())}')\n"
                        f"except Exception:\n"
                        f"    pass\n"
                        "os.environ['MPLBACKEND'] = 'Agg'\n"
                        "try:\n"
                        "    import matplotlib\n"
                        "    matplotlib.use('Agg')\n"
                        "    import matplotlib.pyplot as plt\n"
                        "    plt.show = lambda *args, **kwargs: None\n"
                        "except Exception:\n"
                        "    pass\n\n"
                    )
                    args_dict["code"] = safe_head + orig_code
                    if isinstance(raw_args, str):
                        command.function.arguments = json.dumps(args_dict)
                    else:
                        command.function.arguments = args_dict
            except Exception as patch_err:
                print(f"[BRIDGE WARNING] Could not inject headless wrapper: {patch_err}")

        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.TOOL_CALL,
                step=curr_step,
                data={"name": tool_name, "arguments": raw_args}
            )
        )
        
        # Snapshot files before tool execution
        files_before: Set[str] = set()
        if project_dir.exists():
            files_before = {p.name for p in project_dir.iterdir() if p.is_file()}

        try:
            if tool_name in ["python_execute", "python"]:
                obs_output = await asyncio.wait_for(original_execute_tool(command), timeout=60.0)
            else:
                obs_output = await original_execute_tool(command)
        except asyncio.TimeoutError:
            obs_output = "Error: Tool execution timed out after 60.0 seconds to prevent blocking."
        
        # Detect new deliverables and dispatch artifact notifications
        if project_dir.exists():
            files_after = {p.name for p in project_dir.iterdir() if p.is_file()}
            new_files = files_after - files_before
            for nf in new_files:
                print(f"[BRIDGE] New artifact generated: {nf}")
                await dispatch_event(
                    job_id,
                    SSEEvent(
                        type=SSEEventType.OBSERVATION,
                        step=curr_step,
                        data={
                            "artifact": nf,
                            "path": nf,
                            "chat_id": chat_id, "event": "artifact_created"
                        }
                    )
                )

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
        scoped_prompt = (
            f"[PROJECT WORKSPACE RULES]\n"
            f"1. Working Directory: Your active directory is already set to: {project_dir.resolve()}\n"
            f"2. File Deliverables: Save all generated figures, images, charts, and files using clean relative names (e.g. plt.savefig('square.png'), open('output.txt', 'w')). Do NOT construct long absolute paths.\n"
            f"3. Headless Visualization: This is a non-interactive server environment. NEVER call plt.show() or GUI blocking functions. Always save figures directly to file using plt.savefig('filename.png') and close them.\n"
            f"4. Live Sandbox: Web applications, UI mockups, and interactive demos should be saved as .html or .svg files so the user can preview them live in the Sandbox tab.\n\n"
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

async def run_direct_chat(
    job_id: str,
    prompt: str,
    llm_override: Optional[Dict[str, Any]] = None
) -> None:
    """Execute fast direct chat without launching autonomous agent loops or system tools."""
    print(f"\n[BRIDGE DIRECT CHAT] Initializing direct chat for job: {job_id}")
    current_active_job_id["current"] = job_id

    toml_cfg = read_active_toml_config()
    active_llm = dict(toml_cfg.get("llm", {}))
    if llm_override:
        for k, v in llm_override.items():
            if v:
                active_llm[k] = v

    provider_name = active_llm.get("provider_name") or active_llm.get("provider") or "Active Primary"
    model_name = active_llm.get("model") or "default"
    base_url = active_llm.get("base_url") or "http://127.0.0.1:1234/v1"
    api_key = active_llm.get("api_key") or "EMPTY"

    await asyncio.sleep(0.1)
    await dispatch_event(
        job_id,
        SSEEvent(
            type=SSEEventType.STEP_START,
            step=1,
            data={
                "status": "running",
                "model": model_name,
                "provider": provider_name,
                "mode": "chat"
            }
        )
    )

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)

        chat = project_manager.get_chat(job_id) or {}
        turns = chat.get("turns", [])

        messages = [
            {
                "role": "system",
                "content": "You are a helpful, direct, and conversational AI assistant. Respond directly, accurately, and naturally to the user."
            }
        ]

        for t in turns[-6:]:
            p = t.get("prompt")
            r = t.get("result")
            if p:
                messages.append({"role": "user", "content": p})
            if r:
                messages.append({"role": "assistant", "content": r})

        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            stream=False
        )

        result_text = ""
        if response.choices and len(response.choices) > 0:
            msg = response.choices[0].message
            result_text = getattr(msg, "content", "") or ""

        if not result_text:
            result_text = "I received your message, but no content was returned by the model."

        print(f"[BRIDGE DIRECT CHAT] Completed successfully for job: {job_id}")
        job_manager.complete_job(job_id, result_text)
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.FINAL, step=1, data={"result": result_text}))

    except asyncio.CancelledError:
        print(f"[BRIDGE DIRECT CHAT] Job was cancelled: {job_id}")
    except Exception as err:
        tb = traceback.format_exc()
        print(f"[BRIDGE DIRECT CHAT ERROR] {err}\n{tb}")
        job_manager.fail_job(job_id, str(err))
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.ERROR, step=1, data={"message": str(err)}))
    finally:
        human_answers.pop(job_id, None)
        human_data.pop(job_id, None)
        active_tasks.pop(job_id, None)
        if current_active_job_id.get("current") == job_id:
            current_active_job_id.pop("current", None)