import sys
import asyncio

# Hard-enforce Windows Proactor loop before any imports
if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from omweb.routers import status, run, files, config_rtr, mcp, setup

app = FastAPI(
    title="OpenManus Web API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(status.router, prefix="/api/status", tags=["Status"])
app.include_router(setup.router, prefix="/api/setup", tags=["Setup"])
app.include_router(run.router, prefix="/api/run", tags=["Run"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(config_rtr.router, prefix="/api/config", tags=["Config"])
app.include_router(mcp.router, prefix="/api/mcp", tags=["MCP"])

@app.get("/")
async def root():
    return {"status": "online", "dashboard": "OpenManus Web Dashboard"}