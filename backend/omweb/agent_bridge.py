from __future__ import annotations
import os
import sys
import json
import asyncio
import traceback
import httpx
from pathlib import Path
from typing import Any, Dict, Optional, List, Union, Set

os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["MPLBACKEND"] = "Agg"
os.environ["QT_QPA_PLATFORM"] = "offscreen"

from omweb.sse_events import dispatch_event, SSEEvent, SSEEventType
from omweb.job_manager import job_manager
from omweb.project_manager import project_manager
from omweb.engine_resolver import resolve_active_engine_path

human_answers: Dict[str, asyncio.Event] = {}
human_data: Dict[str, str] = {}
active_tasks: Dict[str, asyncio.Task] = {}
current_active_job_id: Dict[str, str] = {}
job_scoped_artifacts: Dict[str, List[str]] = {}


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


def _err_card(
    title: str,
    description: str,
    hint: str = "",
    code: str = "",
) -> str:
    """Build a Markdown error card ready for the chat UI."""
    parts = [
        f"### ⚠️ {title}",
        "",
        description,
    ]
    if hint:
        parts += ["", f"> 💡 **Hint:** {hint}"]
    if code:
        parts += ["", "```", code, "```"]
    return "\n".join(parts)


def format_smart_error(err: Exception, model_name: str, provider_name: str) -> str:
    """Format known provider and model errors into actionable, user-friendly Markdown."""
    err_str = str(err)
    lower_err = err_str.lower()

    if "failed to load model" in lower_err or "failed to load" in lower_err:
        return _err_card(
            title=f"Model `{model_name}` is not loaded in LM Studio",
            description="The model is either not loaded in LM Studio or has exceeded the available memory limit.",
            hint="Open LM Studio, go to the Local Server section, and load the model manually.",
        )

    if "connection refused" in lower_err or "connecterror" in lower_err or "10061" in lower_err:
        if "1234" in err_str or "lmstudio" in provider_name.lower():
            return _err_card(
                title="Could not connect to the local LM Studio server",
                description="The LM Studio local server on **port 1234** is unreachable.",
                hint="Make sure the LM Studio application is running and the Local Server is enabled.",
            )
        if "11434" in err_str or "ollama" in provider_name.lower():
            return _err_card(
                title="Could not connect to the local Ollama server",
                description="The Ollama service on **port 11434** is unreachable.",
                hint="Make sure the Ollama service is running on your machine.",
            )

    if "context_length_exceeded" in lower_err or "maximum context length" in lower_err:
        return _err_card(
            title=f"Context length exceeded for model `{model_name}`",
            description="The conversation has exceeded the maximum context length of this model.",
            hint="Start a new conversation or reduce the size of the input.",
        )

    if "invalid_api_key" in lower_err or "incorrect api key" in lower_err or "401" in lower_err:
        return _err_card(
            title=f"API key authentication failed for provider `{provider_name}`",
            description="The API key was rejected by the provider.",
            hint="Verify the key is correct in Settings > Cloud Providers.",
        )

    return _err_card(
        title="Chat execution error",
        description=f"**Provider:** `{provider_name}` — **Model:** `{model_name}`",
        code=err_str,
    )


async def check_lmstudio_model_readiness(base_url: str, model_name: str, api_key: str = "") -> Dict[str, Any]:
    """Query LM Studio live endpoint to verify if the model is currently loaded in memory."""
    clean_base = base_url.replace("/v1", "").rstrip("/")
    headers = {"Accept": "application/json"}
    if api_key and "••••" not in api_key and api_key != "EMPTY":
        headers["Authorization"] = f"Bearer {api_key}"

    endpoints = [
        f"{clean_base}/api/v1/models",
        f"{clean_base}/api/v0/models"
    ]

    for ep in endpoints:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                resp = await client.get(ep, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    models = data.get("models") or data.get("data") or []
                    for m in models:
                        mid = str(m.get("key") or m.get("id") or "")
                        if mid.lower() == model_name.lower() or model_name.lower() in mid.lower():
                            loaded_instances = m.get("loaded_instances") or []
                            is_loaded = len(loaded_instances) > 0
                            ctx_len = loaded_instances[0].get("config", {}).get("context_length") if is_loaded else None
                            return {
                                "found": True,
                                "is_loaded": is_loaded,
                                "context_length": ctx_len,
                                "unreachable": False
                            }
                    return {"found": False, "is_loaded": False, "unreachable": False}
        except Exception:
            continue

    return {"found": False, "is_loaded": False, "unreachable": True}


def scope_mcp_servers(agent: Any, manifest: Dict[str, Any]) -> None:
    """Isolates and bypasses MCP server initialization if not required."""
    allowed = [t.lower() for t in manifest.get("tools", [])]
    needs_mcp = any("browser" in t or "mcp" in t for t in allowed)

    if not needs_mcp and hasattr(agent, "initialize_mcp_servers"):
        async def dummy_init_mcp():
            return None
        agent.initialize_mcp_servers = dummy_init_mcp
        print(f"[BRIDGE] MCP Scoping: Bypassed MCP servers for agent '{manifest.get('name')}'")


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
    except Exception as e:
        print(f"[BRIDGE WARNING] Could not patch AskHuman: {e}")


def apply_global_python_execute_patch():
    """Enforce headless backend and execution timeout on PythonExecute."""
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
    except Exception as e:
        print(f"[BRIDGE WARNING] Could not patch PythonExecute module directly: {e}")


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
                print(f"[BRIDGE] Injected runtime AsyncOpenAI client (model={model}, base_url={base_url})")
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
    job_scoped_artifacts[job_id] = []

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

    if "1234" in base_url or "lmstudio" in provider_name.lower():
        readiness = await check_lmstudio_model_readiness(base_url, model_name, active_llm.get("api_key", ""))
        if readiness.get("unreachable"):
            err_msg = format_smart_error(Exception("Connection refused (Port 1234)"), model_name, provider_name)
            job_manager.fail_job(job_id, err_msg)
            await dispatch_event(job_id, SSEEvent(type=SSEEventType.ERROR, step=1, data={"message": err_msg, "model": model_name}))
            return

    try:
        from app.agent.manus import Manus
    except ImportError as e:
        print(f"[BRIDGE ERROR] Failed to import OpenManus core: {e}")
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.ERROR, step=0, data={"message": str(e), "model": model_name}))
        return

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
                "mode": "agent"
            }
        )
    )

    from omweb.agents.registry import agent_registry
    manifest = agent_registry.get_agent(agent_id)
    print(f"[BRIDGE] Activating agent '{manifest['name']}' (ID: {agent_id})")

    agent = Manus()
    scope_mcp_servers(agent, manifest)

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

    if manifest.get("max_steps"):
        agent.max_steps = manifest["max_steps"]

    sys_prompt = manifest.get("system_prompt", "").strip()
    if sys_prompt and hasattr(agent, "system_prompt"):
        try:
            agent.system_prompt = f"{sys_prompt}\n\n{agent.system_prompt}"
        except Exception:
            pass

    inject_runtime_llm(agent, active_llm)

    chat = project_manager.get_chat(job_id) or {}
    chat_id = chat.get("id", f"chat_{job_id}")
    project_id = chat.get("project_id", "default_project")
    project_dir = project_manager.get_chat_files_dir(chat_id, project_id)
    project_dir.mkdir(parents=True, exist_ok=True)

    files_baseline: Set[str] = {p.name for p in project_dir.iterdir() if p.is_file()} if project_dir.exists() else set()
    latest_meaningful_thought: str = ""

    original_step = agent.step

    async def instrumented_step():
        nonlocal latest_meaningful_thought
        curr_step = getattr(agent, "current_step", 1)
        await dispatch_event(job_id, SSEEvent(type=SSEEventType.STEP_START, step=curr_step, data={"step": curr_step, "model": model_name}))
        result = await original_step()

        if hasattr(agent, "memory") and hasattr(agent.memory, "messages"):
            for m in reversed(agent.memory.messages[-3:]):
                role = getattr(m, "role", "")
                content = getattr(m, "content", "")
                if role == "assistant" and content:
                    clean_c = content.strip()
                    if clean_c and not clean_c.startswith("terminate(") and not clean_c.startswith("```"):
                        latest_meaningful_thought = clean_c
                    await dispatch_event(job_id, SSEEvent(type=SSEEventType.THOUGHT, step=curr_step, data={"thought": content, "model": model_name}))
                    break
        return result

    original_execute_tool = agent.execute_tool

    async def instrumented_execute_tool(command):
        tool_name = getattr(command.function, "name", "unknown") if hasattr(command, "function") else "unknown"
        raw_args = getattr(command.function, "arguments", "{}") if hasattr(command, "function") else "{}"
        curr_step = getattr(agent, "current_step", 1)

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
                    command.function.arguments = json.dumps(args_dict) if isinstance(raw_args, str) else args_dict
            except Exception as patch_err:
                print(f"[BRIDGE WARNING] Could not inject headless wrapper: {patch_err}")

        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.TOOL_CALL,
                step=curr_step,
                data={"name": tool_name, "arguments": raw_args, "model": model_name}
            )
        )

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

        if project_dir.exists():
            files_after = {p.name for p in project_dir.iterdir() if p.is_file()}
            new_files = files_after - files_before
            for nf in new_files:
                print(f"[BRIDGE] New artifact generated in this turn: {nf}")
                if nf not in job_scoped_artifacts[job_id]:
                    job_scoped_artifacts[job_id].append(nf)
                await dispatch_event(
                    job_id,
                    SSEEvent(
                        type=SSEEventType.OBSERVATION,
                        step=curr_step,
                        data={
                            "artifact": nf,
                            "path": nf,
                            "chat_id": chat_id,
                            "event": "artifact_created",
                            "model": model_name
                        }
                    )
                )

        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.OBSERVATION,
                step=curr_step,
                data={"output": obs_output, "model": model_name}
            )
        )
        return obs_output

    agent.execute_tool = instrumented_execute_tool
    agent.step = instrumented_step

    try:
        scoped_prompt = (
            f"[PROJECT WORKSPACE RULES]\n"
            f"1. Working Directory: Your active directory is already set to: {project_dir.resolve()}\n"
            f"2. File Deliverables: Save all generated figures, images, charts, and files using clean relative names. Do NOT construct long absolute paths.\n"
            f"3. Headless Visualization: NEVER call plt.show(). Always save figures directly to file using plt.savefig('filename.png') and close them.\n"
            f"4. Live Sandbox: Web applications, UI mockups, and interactive demos should be saved as .html or .svg files.\n\n"
            f"[USER PROMPT]\n"
            f"{prompt}"
        )
        final_out = await agent.run(scoped_prompt)
        print(f"[BRIDGE] Execution completed successfully for job: {job_id}")

        # Check total newly generated files in this job
        if project_dir.exists():
            current_files = {p.name for p in project_dir.iterdir() if p.is_file()}
            for f_name in (current_files - files_baseline):
                if f_name not in job_scoped_artifacts[job_id]:
                    job_scoped_artifacts[job_id].append(f_name)

        new_turn_files = job_scoped_artifacts.get(job_id, [])

        # Construct beautiful Markdown final result
        if new_turn_files:
            file_bullets = "\n".join([f"- `{f}`" for f in new_turn_files])
            result_text = (
                f"### Deliverables Created Successfully\n\n"
                f"The requested project files have been built and saved in your workspace:\n\n"
                f"{file_bullets}\n\n"
                f"You can preview and interact with the application live in the **Preview** panel."
            )
        elif latest_meaningful_thought:
            result_text = latest_meaningful_thought
        else:
            raw_final = str(final_out) if final_out else ""
            for stop_tag in ["terminate(status=\"success\")", "terminate(status='success')", "</tool_call>"]:
                raw_final = raw_final.replace(stop_tag, "").strip()
            result_text = raw_final if raw_final else "Task completed successfully."

        job_manager.complete_job(job_id, result_text)
        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.FINAL,
                step=getattr(agent, "current_step", 1),
                data={
                    "result": result_text,
                    "model": model_name,
                    "produced_files": new_turn_files
                }
            )
        )
    except asyncio.CancelledError:
        print(f"[BRIDGE] Job was aborted: {job_id}")
    except Exception as err:
        tb = traceback.format_exc()
        print(f"[BRIDGE ERROR] {err}\n{tb}")
        err_msg = format_smart_error(err, model_name, provider_name)
        job_manager.fail_job(job_id, err_msg)
        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.ERROR,
                step=getattr(agent, "current_step", 1),
                data={"message": err_msg, "model": model_name}
            )
        )
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
    job_scoped_artifacts[job_id] = []

    toml_cfg = read_active_toml_config()
    active_llm = dict(toml_cfg.get("llm", {}))
    if llm_override:
        for k, v in llm_override.items():
            if v:
                active_llm[k] = v

    provider_name = active_llm.get("provider_name") or active_llm.get("provider") or "Active Primary"
    model_name = active_llm.get("model") or "default"
    base_url = active_llm.get("base_url") or "[http://127.0.0.1:1234/v1](http://127.0.0.1:1234/v1)"
    api_key = active_llm.get("api_key") or "EMPTY"

    if "1234" in base_url or "lmstudio" in provider_name.lower():
        readiness = await check_lmstudio_model_readiness(base_url, model_name, api_key)
        if readiness.get("unreachable"):
            err_msg = format_smart_error(Exception("Connection refused (Port 1234)"), model_name, provider_name)
            job_manager.fail_job(job_id, err_msg)
            await dispatch_event(job_id, SSEEvent(type=SSEEventType.ERROR, step=1, data={"message": err_msg, "model": model_name}))
            return

    await asyncio.sleep(0.05)
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
                "content": "You are a helpful, direct, and conversational AI assistant. Respond directly, accurately, and naturally to the user using Markdown."
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

        max_tokens = active_llm.get("max_tokens") or 8192
        if isinstance(max_tokens, str):
            try:
                max_tokens = int(max_tokens)
            except Exception:
                max_tokens = 8192

        response = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=max_tokens,
            temperature=float(active_llm.get("temperature", 0.7)),
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
        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.FINAL,
                step=1,
                data={
                    "result": result_text,
                    "model": model_name,
                    "mode": "chat",
                    "produced_files": []
                }
            )
        )

    except asyncio.CancelledError:
        print(f"[BRIDGE DIRECT CHAT] Job was cancelled: {job_id}")
    except Exception as err:
        tb = traceback.format_exc()
        print(f"[BRIDGE DIRECT CHAT ERROR] {err}\n{tb}")
        err_msg = format_smart_error(err, model_name, provider_name)
        job_manager.fail_job(job_id, err_msg)
        await dispatch_event(
            job_id,
            SSEEvent(
                type=SSEEventType.ERROR,
                step=1,
                data={"message": err_msg, "model": model_name}
            )
        )
    finally:
        human_answers.pop(job_id, None)
        human_data.pop(job_id, None)
        active_tasks.pop(job_id, None)
        if current_active_job_id.get("current") == job_id:
            current_active_job_id.pop("current", None)