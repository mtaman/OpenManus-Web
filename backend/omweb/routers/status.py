"""
Status and Health Diagnostic Router.
Checks local environment dependencies: Python runtime, OpenManus source, LM Studio, and Chrome CDP.
"""

import sys
from pathlib import Path
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

OPENMANUS_PATH = Path(r"D:\AI\OpenManus")
LM_STUDIO_URL = "http://127.0.0.1:1234/v1/models"
CHROME_CDP_URL = "http://127.0.0.1:9222/json/version"


class ServiceCheck(BaseModel):
    status: str
    details: str


class SystemStatusResponse(BaseModel):
    overall_status: str
    python: ServiceCheck
    openmanus: ServiceCheck
    lm_studio: ServiceCheck
    chrome_cdp: ServiceCheck


async def check_http_service(url: str, service_name: str) -> ServiceCheck:
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return ServiceCheck(status="healthy", details=f"{service_name} reachable")
            return ServiceCheck(status="unhealthy", details=f"HTTP {resp.status_code}")
    except Exception:
        return ServiceCheck(status="offline", details=f"Cannot connect to {service_name}")


@router.get("", response_model=SystemStatusResponse)
async def get_system_status():
    # 1. Python check
    py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    py_status = "healthy" if (sys.version_info.major == 3 and sys.version_info.minor >= 12) else "warning"
    py_check = ServiceCheck(status=py_status, details=f"Python {py_ver}")

    # 2. OpenManus path check (Read-only validation)
    if OPENMANUS_PATH.exists() and (OPENMANUS_PATH / "app").exists():
        om_check = ServiceCheck(status="healthy", details=f"Mounted at {OPENMANUS_PATH}")
    else:
        om_check = ServiceCheck(status="unhealthy", details=f"Path not found: {OPENMANUS_PATH}")

    # 3. External HTTP checks
    lm_check = await check_http_service(LM_STUDIO_URL, "LM Studio (:1234)")
    chrome_check = await check_http_service(CHROME_CDP_URL, "Chrome CDP (:9222)")

    # Overall calculation
    is_core_healthy = (py_check.status == "healthy") and (om_check.status == "healthy")
    overall = "healthy" if is_core_healthy else "degraded"

    return SystemStatusResponse(
        overall_status=overall,
        python=py_check,
        openmanus=om_check,
        lm_studio=lm_check,
        chrome_cdp=chrome_check,
    )
