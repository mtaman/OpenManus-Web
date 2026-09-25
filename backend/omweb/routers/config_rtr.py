import shutil
import time
import httpx
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

try:
    import tomllib
except ImportError:
    import toml as tomllib

import toml
from omweb.config import OPENMANUS_ROOT

router = APIRouter()

CONFIG_PATH = OPENMANUS_ROOT / "config" / "config.toml"
CONFIG_EXAMPLE_PATH = OPENMANUS_ROOT / "config" / "config.example.toml"
BACKUP_PATH = OPENMANUS_ROOT / "config" / "config.toml.bak"

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
                masked[key] = val[:4] + "••••••••" + val[-4:]
            elif isinstance(val, str) and val:
                masked[key] = "••••••••"
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
        elif isinstance(v, str) and "••••" in v:
            result[k] = old_dict.get(k, "")
        else:
            result[k] = v
    return result

@router.get("")
@router.get("/")
async def get_config():
    raw = read_raw_config()
    
    # Extract custom [llm.*] models
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

class TestLLMRequest(BaseModel):
    base_url: str
    api_key: str
    model: str
    api_type: Optional[str] = ""

@router.post("/test-llm")
async def test_llm_connection(payload: TestLLMRequest):
    api_key = payload.api_key
    if "••••" in api_key:
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

@router.post("/fetch-models")
async def fetch_available_models(payload: FetchModelsRequest):
    api_key = payload.api_key
    if api_key and "••••" in api_key:
        current = read_raw_config()
        api_key = current.get("llm", {}).get("api_key", "")

    base = payload.base_url.rstrip("/")
    url = base if base.endswith("/models") else f"{base}/models"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                model_ids = [m["id"] for m in data.get("data", []) if "id" in m]
                return {"ok": True, "models": model_ids}
    except Exception as e:
        return {"ok": False, "error": str(e), "models": []}
    return {"ok": False, "models": []}