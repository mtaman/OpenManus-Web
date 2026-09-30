import shutil
import time
import httpx
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

try:
    import tomllib
except ImportError:
    import toml as tomllib

import toml
from omweb.config import OPENMANUS_ROOT, STORAGE_ROOT

router = APIRouter()

CONFIG_PATH = OPENMANUS_ROOT / "config" / "config.toml"
CONFIG_EXAMPLE_PATH = OPENMANUS_ROOT / "config" / "config.example.toml"
BACKUP_PATH = OPENMANUS_ROOT / "config" / "config.toml.bak"
METADATA_CACHE = STORAGE_ROOT / "models_metadata.json"

def read_raw_config() -> dict:
    target = CONFIG_PATH if CONFIG_PATH.exists() else CONFIG_EXAMPLE_PATH
    if not target.exists():
        return {}
    try:
        with open(target, "rb") as f:
            return tomllib.load(f)
    except Exception as e:
        print(f"Error reading config: {e}")
        return {}

def write_raw_config(data: dict):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if CONFIG_PATH.exists():
        try:
            shutil.copy2(CONFIG_PATH, BACKUP_PATH)
        except Exception:
            pass

    clean_data = {}
    for k, v in data.items():
        if v is not None:
            clean_data[k] = v

    tmp_path = CONFIG_PATH.with_suffix(".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        toml.dump(clean_data, f)
    tmp_path.replace(CONFIG_PATH)

def mask_secrets(data: dict) -> dict:
    masked = {}
    for key, val in data.items():
        if isinstance(val, dict):
            masked[key] = mask_secrets(val)
        elif any(s in key.lower() for s in ["key", "password", "secret", "token"]):
            if isinstance(val, str) and len(val) > 8:
                masked[key] = val[:4] + "" + val[-4:]
            elif isinstance(val, str) and val:
                masked[key] = ""
            else:
                masked[key] = val
        else:
            masked[key] = val
    return masked

def merge_unmasked(new_dict: dict, old_dict: dict) -> dict:
    result = {}
    for k, v in new_dict.items():
        if isinstance(v, dict) and isinstance(old_dict.get(k), dict):
            result[k] = merge_unmasked(v, old_dict[k])
        elif isinstance(v, str) and "" in v:
            result[k] = old_dict.get(k, "")
        else:
            result[k] = v
    return result

def save_metadata_cache(new_meta: dict):
    data = {}
    if METADATA_CACHE.exists():
        try:
            with open(METADATA_CACHE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            pass
    data.update(new_meta)
    try:
        METADATA_CACHE.parent.mkdir(parents=True, exist_ok=True)
        with open(METADATA_CACHE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving metadata cache: {e}")

@router.get("")
@router.get("/")
async def get_config():
    raw = read_raw_config()
    custom_models = []
    if "llm" in raw and isinstance(raw["llm"], dict):
        for sub_key, sub_val in raw["llm"].items():
            if sub_key != "vision" and isinstance(sub_val, dict):
                custom_models.append({
                    "id": f"custom_{sub_key}",
                    "name": sub_key,
                    "model": sub_val.get("model", ""),
                    "base_url": sub_val.get("base_url", ""),
                    "api_key": sub_val.get("api_key", ""),
                    "max_tokens": sub_val.get("max_tokens", 8192),
                    "temperature": sub_val.get("temperature", 0.0),
                    "api_type": sub_val.get("api_type", "")
                })

    return {
        "config": mask_secrets(raw),
        "custom_models": mask_secrets({"models": custom_models}).get("models", []),
        "raw_path": str(CONFIG_PATH)
    }

@router.post("")
@router.post("/")
@router.put("")
@router.put("/")
async def save_config(payload: Dict[str, Any]):
    current = read_raw_config()
    merged = merge_unmasked(payload, current)
    write_raw_config(merged)
    return {"status": "saved", "config": mask_secrets(merged)}

@router.get("/models-metadata")
async def get_models_metadata():
    if METADATA_CACHE.exists():
        try:
            with open(METADATA_CACHE, "r", encoding="utf-8") as f:
                return {"ok": True, "metadata": json.load(f)}
        except Exception as e:
            return {"ok": False, "error": str(e), "metadata": {}}
    return {"ok": True, "metadata": {}}

class TestLLMRequest(BaseModel):
    base_url: str
    api_key: str
    model: str
    api_type: Optional[str] = ""

@router.post("/test-llm")
async def test_llm_connection(payload: TestLLMRequest):
    api_key = payload.api_key
    if "" in api_key:
        current = read_raw_config()
        api_key = current.get("llm", {}).get("api_key", "")

    base = payload.base_url.rstrip("/")
    test_url = base if base.endswith("/models") else f"{base}/models"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(test_url, headers=headers)
            elapsed_ms = round((time.time() - start_time) * 1000)
            return {
                "ok": resp.status_code in (200, 201),
                "status_code": resp.status_code,
                "latency_ms": elapsed_ms,
                "message": f"Responded with HTTP {resp.status_code} in {elapsed_ms}ms"
            }
    except Exception as e:
        return {"ok": False, "status_code": 0, "latency_ms": 0, "message": str(e)}

class FetchModelsRequest(BaseModel):
    base_url: str
    api_key: Optional[str] = ""
    provider_type: Optional[str] = ""
    provider_id: Optional[str] = ""

@router.post("/fetch-models")
async def fetch_available_models(payload: FetchModelsRequest):
    """Fetch live available model IDs & full Metadata conforming to strict provider-scoped APIs."""
    api_key = payload.api_key or ""
    if api_key and "" in api_key:
        current = read_raw_config()
        api_key = current.get("llm", {}).get("api_key", "")

    base = payload.base_url.strip().rstrip("/")
    p_id = (payload.provider_id or "").lower()
    p_type = (payload.provider_type or "").lower()
    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # 1. LM STUDIO PROTOCOL (/api/v1/models priority)
    if "lmstudio" in p_id or "lmstudio" in p_type or "1234" in base:
        clean_base = base.replace("/v1", "").rstrip("/")
        endpoints_to_try = [
            f"{clean_base}/api/v1/models",
            f"{clean_base}/api/v0/models",
            f"{base}/models" if not base.endswith("/models") else base
        ]

        for ep in endpoints_to_try:
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(ep, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_models = data.get("models") or data.get("data") or []
                        if raw_models:
                            model_ids = []
                            metadata = {}
                            for m in raw_models:
                                if isinstance(m, dict):
                                    mid = m.get("key") or m.get("id") or m.get("display_name")
                                    if not mid or any(x in str(mid).lower() for x in ["tts-", "whisper-", "embedding", "dall-e"]):
                                        continue
                                    mid_str = str(mid)
                                    model_ids.append(mid_str)

                                    q_data = m.get("quantization")
                                    quant_obj = q_data if isinstance(q_data, dict) else ({"name": q_data, "bits_per_weight": None} if q_data else None)
                                    caps = m.get("capabilities") or {}

                                    metadata[mid_str] = {
                                        "key": mid_str,
                                        "type": m.get("type", "llm"),
                                        "publisher": m.get("publisher"),
                                        "display_name": m.get("display_name", mid_str),
                                        "architecture": m.get("architecture"),
                                        "quantization": quant_obj,
                                        "size_bytes": m.get("size_bytes"),
                                        "params_string": m.get("params_string"),
                                        "max_context_length": m.get("max_context_length") or m.get("context_length"),
                                        "format": m.get("format"),
                                        "description": m.get("description"),
                                        "loaded_instances": m.get("loaded_instances") or [],
                                        "capabilities": {
                                            "vision": bool(caps.get("vision", False) or "vision" in mid_str.lower() or "vl" in mid_str.lower()),
                                            "trained_for_tool_use": bool(caps.get("trained_for_tool_use", False) or "instruct" in mid_str.lower() or "tool" in mid_str.lower() or "-it" in mid_str.lower() or "nemotron" in mid_str.lower())
                                        }
                                    }
                            save_metadata_cache(metadata)
                            return {"ok": True, "models": sorted(list(set(model_ids))), "models_metadata": metadata}
            except Exception:
                continue

    # 2. DEEPSEEK OFFICIAL PROTOCOL (Isolated from marketplace proxies)
    if "deepseek" in p_id or "deepseek.com" in base:
        if not api_key:
            return {"ok": False, "error": "DeepSeek API key required", "models": []}
        clean_ds_base = "https://api.deepseek.com" if "ppinfra" in base else base
        ds_url = f"{clean_ds_base}/models" if not clean_ds_base.endswith("/models") else clean_ds_base
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(ds_url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_list = data.get("data", []) or data.get("models", [])
                    model_ids = []
                    metadata = {}
                    for m in raw_list:
                        mid = m.get("id") if isinstance(m, dict) else str(m)
                        if mid and "deepseek" in str(mid).lower():
                            mid_str = str(mid)
                            model_ids.append(mid_str)
                            is_r1 = "reasoner" in mid_str.lower() or "r1" in mid_str.lower()
                            metadata[mid_str] = {
                                "key": mid_str,
                                "display_name": "DeepSeek R1 (Reasoner)" if is_r1 else "DeepSeek V3 (Chat)",
                                "type": "llm",
                                "publisher": "DeepSeek",
                                "max_context_length": 65536,
                                "capabilities": {
                                    "vision": False,
                                    "trained_for_tool_use": not is_r1
                                }
                            }
                    clean_models = sorted(list(set(model_ids))) or ["deepseek-chat", "deepseek-reasoner"]
                    save_metadata_cache(metadata)
                    return {"ok": True, "models": clean_models, "models_metadata": metadata}
                return {"ok": False, "error": f"DeepSeek API error {resp.status_code}", "models": []}
        except Exception as e:
            return {"ok": False, "error": f"DeepSeek connection error: {str(e)}", "models": []}

    # 3. ANTHROPIC CLAUDE PROTOCOL
    if "anthropic" in p_id or "anthropic" in p_type or "anthropic.com" in base:
        if not api_key:
            return {"ok": False, "error": "Anthropic API key required", "models": []}
        url = "https://api.anthropic.com/v1/models"
        headers_ant = {"x-api-key": api_key, "anthropic-version": "2023-06-01"}
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers_ant)
                if resp.status_code == 200:
                    data = resp.json()
                    model_ids = []
                    metadata = {}
                    for m in data.get("data", []):
                        if "id" in m:
                            mid = m["id"]
                            model_ids.append(mid)
                            metadata[mid] = {
                                "key": mid,
                                "display_name": m.get("display_name", mid),
                                "type": "llm",
                                "publisher": "Anthropic",
                                "max_context_length": 200000,
                                "capabilities": {"vision": True, "trained_for_tool_use": True}
                            }
                    save_metadata_cache(metadata)
                    return {"ok": True, "models": sorted(list(set(model_ids))), "models_metadata": metadata}
                return {"ok": False, "error": f"Anthropic error {resp.status_code}", "models": []}
        except Exception as e:
            return {"ok": False, "error": f"Anthropic connection error: {str(e)}", "models": []}

    # 4. GOOGLE GEMINI PROTOCOL
    if "gemini" in p_id or "google" in p_id or "googleapis.com" in base:
        if not api_key:
            return {"ok": False, "error": "Google API key required", "models": []}
        gemini_url = "https://generativelanguage.googleapis.com/v1beta/models"
        gemini_headers = {"x-goog-api-key": api_key}
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(f"{gemini_url}?key={api_key}", headers=gemini_headers)
                if resp.status_code == 200:
                    data = resp.json()
                    model_ids = []
                    metadata = {}
                    for m in data.get("models", []):
                        if "name" in m:
                            methods = m.get("supportedGenerationMethods", [])
                            if not methods or "generateContent" in methods:
                                mid = m["name"].replace("models/", "")
                                if not any(x in mid for x in ["embedding", "aqa", "imagen"]):
                                    model_ids.append(mid)
                                    metadata[mid] = {
                                        "key": mid,
                                        "display_name": m.get("displayName", mid),
                                        "type": "llm",
                                        "publisher": "Google",
                                        "max_context_length": m.get("inputTokenLimit") or 1048576,
                                        "description": m.get("description"),
                                        "capabilities": {"vision": True, "trained_for_tool_use": True}
                                    }
                    save_metadata_cache(metadata)
                    return {"ok": True, "models": sorted(list(set(model_ids))), "models_metadata": metadata}
        except Exception:
            pass

    # 5. OLLAMA PROTOCOL (/api/tags)
    if "ollama" in p_id or "ollama" in p_type or "11434" in base:
        tags_url = f"{base}/api/tags" if not base.endswith("/api/tags") else base
        if "/v1" in tags_url:
            tags_url = tags_url.replace("/v1", "") + "/api/tags"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(tags_url)
                if resp.status_code == 200:
                    data = resp.json()
                    models = []
                    metadata = {}
                    for m in data.get("models", []):
                        if "name" in m:
                            mid = m["name"]
                            models.append(mid)
                            d = m.get("details", {})
                            families = d.get("families") or []
                            ollama_ctx = 131072 if any(f in str(d.get("family", "")).lower() for f in ["llama3", "qwen2", "deepseek"]) else 32768

                            metadata[mid] = {
                                "key": mid,
                                "display_name": mid,
                                "type": "llm",
                                "format": d.get("format", "gguf"),
                                "architecture": d.get("family"),
                                "params_string": d.get("parameter_size"),
                                "max_context_length": ollama_ctx,
                                "size_bytes": m.get("size"),
                                "quantization": {"name": d.get("quantization_level"), "bits_per_weight": None} if d.get("quantization_level") else None,
                                "capabilities": {
                                    "vision": "vision" in families or "vision" in mid.lower() or "vl" in mid.lower(),
                                    "trained_for_tool_use": "tools" in families or "instruct" in mid.lower()
                                }
                            }
                    save_metadata_cache(metadata)
                    return {"ok": True, "models": sorted(list(set(models))), "models_metadata": metadata}
        except Exception:
            pass

    # 6. OPENAI & SCOPED OPENAI-COMPATIBLE (Strict Model Filtering)
    url = base if base.endswith("/models") else f"{base}/models"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                raw_list = data.get("data", []) or data.get("models", [])
                model_ids = []
                metadata = {}
                is_openrouter = "openrouter.ai" in base

                # Strict blacklist to eliminate marketplace clutter and non-chat models
                blocked_terms = [
                    "tts", "whisper", "embedding", "dall-e", "moderation",
                    "babbage", "davinci", "curie", "audio", "realtime", "transcription",
                    "flux", "sdxl", "stable-diffusion", "midjourney", "music"
                ]

                for m in raw_list:
                    if isinstance(m, dict):
                        mid = m.get("id") or m.get("name")
                        if not mid:
                            continue
                        mid_str = str(mid)

                        # Filter out non-chat models
                        if any(term in mid_str.lower() for term in blocked_terms):
                            continue

                        model_ids.append(mid_str)
                        ctx = m.get("context_length") or m.get("max_model_len") or m.get("context_window")
                        arch = None
                        is_vision = False
                        if isinstance(m.get("architecture"), dict):
                            arch = m["architecture"].get("instruct_type") or m["architecture"].get("tokenizer")
                            is_vision = "image" in str(m["architecture"].get("modality", "")).lower()

                        metadata[mid_str] = {
                            "key": mid_str,
                            "type": m.get("type", "llm"),
                            "display_name": m.get("name") or m.get("display_name", mid_str),
                            "publisher": "OpenRouter" if is_openrouter else m.get("owned_by"),
                            "max_context_length": ctx,
                            "architecture": arch,
                            "description": m.get("description"),
                            "capabilities": {
                                "vision": is_vision or "vision" in mid_str.lower() or "vl" in mid_str.lower() or "4o" in mid_str.lower(),
                                "trained_for_tool_use": "instruct" in mid_str.lower() or "tool" in mid_str.lower()
                            }
                        }
                    elif isinstance(m, str):
                        if not any(term in m.lower() for term in blocked_terms):
                            model_ids.append(m)

                save_metadata_cache(metadata)
                return {"ok": True, "models": sorted(list(set(model_ids))), "models_metadata": metadata}
            return {"ok": False, "error": f"HTTP {resp.status_code}", "models": []}
    except Exception as e:
        return {"ok": False, "error": f"Failed: {str(e)}", "models": []}
