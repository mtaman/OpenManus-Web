# OpenManus Web Dashboard — Architectural & Design Document

## 1. System Overview
OpenManus Web Dashboard is a sovereign, local-first web interface designed to control and monitor the OpenManus autonomous AI agent. It provides a real-time reactive interface inspired by Manus.im, offering complete visibility into internal thoughts, tool executions, browser automations, and workspace management.

### Key Characteristics:
- **Zero-Tampering OpenManus Integration**: Core OpenManus (`D:\AI\OpenManus`) remains 100% read-only at frozen commit `3309bf4`.
- **Full Bidirectional Live Streaming**: Real-time event propagation using Server-Sent Events (SSE).
- **Localized State Isolation**: File operations, configurations, and job histories are sandboxed locally under `D:\AI\OpenManus-Web\`.

---

## 2. System Architecture

┌─────────────────────────────────────────────────────────────┐
│               Frontend: Next.js 15 (Port 3088)              │
│  - App Router, React 19, Tailwind CSS v4, Zustand           │
│  - Interactive SSE Step Visualizer (LiveSteps)              │
│  - Dual Language i18n (Arabic RTL / English LTR)            │
└──────────────────────────────┬──────────────────────────────┘
│ HTTP / SSE (/api/* proxy)
▼
┌─────────────────────────────────────────────────────────────┐
│               Backend: FastAPI 2.0 (Port 8088)              │
│  - Isolated Python 3.12 Virtual Environment (.venv)         │
│  - Routers: /api/run, /api/files, /api/config, /api/status  │
│  - JobManager: Thread-safe memory cache + jobs.json         │
│  - AgentBridge: In-memory runtime instrumentation           │
└──────────────────────────────┬──────────────────────────────┘
│ sys.path import (READ-ONLY)
▼
┌─────────────────────────────────────────────────────────────┐
│           OpenManus Core (Commit 3309bf4 - Read Only)       │
│  - App / Agent / Memory layers                              │
└──────────────────────────────┬──────────────────────────────┘
│
┌──────────────┴──────────────┐
▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│     LM Studio (:1234)    │  │     Chrome CDP (:9222)   │
└──────────────────────────┘  └──────────────────────────┘


---

## 3. Core Subsystems

### 3.1 Agent Bridge & Non-Invasive Instrumentation
To stream agent reasoning without altering OpenManus source files, `omweb.agent_bridge` applies dynamic monkey-patching to the agent's memory recording method (`Memory.add_message`). Whenever the agent records a thought, a tool call, or an observation, the hook intercepts the message, wraps it in an AG-UI compatible format, and queues it to an asynchronous event bus linked to the client's SSE connection.

### 3.2 Job Management & Persistence
- Execution states are tracked using an in-memory dictionary for instant retrieval.
- Persistence is maintained atomically via `jobs.json` with an automatic backup `jobs.json.bak`.
- Status lifecycle transitions: `pending` ➔ `running` ➔ `completed` | `failed`.

### 3.3 Workspace File Security
The file manager implements defense-in-depth against path traversal:
- Absolute paths are strictly resolved via `pathlib.Path.resolve()`.
- Access is restricted using `is_relative_to(workspace_root)`.
- Destructive deletions are non-permanent; files are safely archived into `.trash/`.

### 3.4 Configuration Management
Configuration changes interact solely through `omweb.toml_io`:
- Direct manipulation of `config.toml` is prohibited.
- Sensitive values (API keys) are masked before transmission to the frontend (`••••••••`).
- Hot-reload connectivity checks support verifying local LLMs and Chrome CDP targets.

---

## 4. Port Allocations & Network Topology
- **Web Dashboard**: `http://localhost:3088`
- **FastAPI Engine**: `http://localhost:8088`
- **Local Inference (LM Studio)**: `http://localhost:1234`
- **Chrome Remote Debugging**: `http://localhost:9222`