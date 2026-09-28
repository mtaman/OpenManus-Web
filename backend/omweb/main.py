from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from omweb.routers import run, status, config_rtr, files, chats, mcp, setup, storage

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from omweb.agent_bridge import patch_ask_human
        patch_ask_human()
    except Exception:
        pass
    yield

app = FastAPI(title="OpenManus Web API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(run.router, prefix="/api/run", tags=["run"])
app.include_router(status.router, prefix="/api/status", tags=["status"])
app.include_router(config_rtr.router, prefix="/api/config", tags=["config"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(storage.router, prefix="/api/storage", tags=["storage"])
app.include_router(chats.router, prefix="/api/chats", tags=["chats"])
app.include_router(mcp.router, prefix="/api/mcp", tags=["mcp"])
app.include_router(setup.router, prefix="/api/setup", tags=["setup"])

@app.get("/health")
async def health():
    return {"status": "ok"}