"""
Main FastAPI application entry point.
Configures CORS, lifespan hooks, and mounts routers.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from omweb.job_manager import job_manager
from omweb.routers import status, run, files, config_rtr, mcp


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and shutdown lifecycle."""
    # Startup: Load jobs from disk
    await job_manager.initialize()
    yield
    # Shutdown: Ensure persistent state is flushed
    await job_manager.persist_to_disk()


app = FastAPI(
    title="OpenManus Web API",
    version="1.0.0",
    description="Backend API for OpenManus Web Dashboard",
    lifespan=lifespan
)

# CORS setup for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3088", "http://127.0.0.1:3088"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(status.router, prefix="/api/status", tags=["Status"])
app.include_router(run.router, prefix="/api/run", tags=["Run"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(config_rtr.router, prefix="/api/config", tags=["Config"])
app.include_router(mcp.router, prefix="/api/mcp", tags=["MCP"])
