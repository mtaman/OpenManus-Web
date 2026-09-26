from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from omweb.routers import status, run, files, config_rtr, mcp, setup, chats
from omweb.config import get_workspace_root

app = FastAPI(title="OpenManus Web API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(status.router, prefix="/api/status", tags=["Status"])
app.include_router(run.router, prefix="/api/run", tags=["Run"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(config_rtr.router, prefix="/api/config", tags=["Config"])
app.include_router(mcp.router, prefix="/api/mcp", tags=["MCP"])
app.include_router(setup.router, prefix="/api/setup", tags=["Setup"])
app.include_router(chats.router, prefix="/api/chats", tags=["Chats"])

@app.get("/")
async def root():
    return {"message": "OpenManus Web Backend is running"}