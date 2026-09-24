"""
OpenManus Web Dashboard - Main Application Entrypoint
FastAPI server orchestrating OpenManus agents and serving Web API.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from omweb.routers import status, run, files, config_rtr, mcp


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize shared system state or recovery hooks
    yield
    # Shutdown: Clean up connections and active job workers


app = FastAPI(
    title="OpenManus Web Dashboard API",
    version="1.0.0",
    description="Sovereign Backend API supporting Manus.im-style capabilities over OpenManus",
    lifespan=lifespan,
)

# Enforce secure CORS policy for Next.js frontend
origins = [
    "http://localhost:3088",
    "http://127.0.0.1:3088",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular API routers
app.include_router(status.router, prefix="/api/status", tags=["Status"])
app.include_router(run.router, prefix="/api/run", tags=["Run"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(config_rtr.router, prefix="/api/config", tags=["Config"])
app.include_router(mcp.router, prefix="/api/mcp", tags=["MCP"])


@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse(
        content={
            "service": "OpenManus Web Dashboard API",
            "status": "online",
            "docs": "/docs",
        }
    )