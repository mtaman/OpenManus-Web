 

```markdown
# OpenManus Web Dashboard 🚀

> **Autonomous Agent Web Interface for OpenManus** — featuring split-view execution telemetry, live Server-Sent Events (SSE) streaming for thoughts and tool calls, zero-config onboarding resolver, and an isolated sandbox workspace manager.

---

## 🌟 Key Architecture & Capabilities

- **FastAPI 2.0 Backend (Port `8088`):** Fully instrumented asynchronous execution engine running in an isolated Python 3.12 virtual environment (`backend/.venv`). Injects the OpenManus core dynamically at runtime via single-point monkey patching on `Memory.add_message`.
- **Next.js 15 PWA Client (Port `3088`):** Split-view reactive user interface built with Next.js 15 (App Router), React 19, TypeScript, and Tailwind CSS. Features dark-canvas aesthetics, real-time live steps telemetry, and bilingual Arabic/English (RTL/LTR) support.
- **Dynamic Engine Resolver & Setup Wizard (`/setup`):** Eliminates hardcoded paths. Probes the host system automatically for existing OpenManus installations, supports custom external path validation, or installs an embedded engine inside `engine/openmanus` via one click.
- **Secure Sandbox Workspace Explorer (`/files` & Workspace Panel):** Real-time directory tree visualization, in-browser code editor with instant saving, direct file downloads, and path-traversal protection with soft-deletion recovery (`.trash/`).
- **Task History & State Replay (`/history`):** Atomic persistence of all runs inside `backend/jobs.json` with `.bak` safety fallbacks. Enables instant re-run capabilities and full retrospective execution inspection.

---

## 🏗️ Architectural Topology

```text
┌──────────────────────────────────────────────────────────────────┐
│                     BROWSER (localhost:3088)                     │
└───────────────────────────┬──────────────────────────────────────┘
                            │  HTTP + SSE
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│          FRONTEND — Next.js 15 (App Router) · React 19           │
│  ┌──────────┬──────────┬───────────┬──────────┬──────────────┐   │
│  │  /chat   │ /history │  /files   │ /settings│    /setup    │   │
│  └──────────┴──────────┴───────────┴──────────┴──────────────┘   │
└───────────────────────────┬──────────────────────────────────────┘
                            │  /api/* (proxy → Port 8088)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│          BACKEND — FastAPI 2.0 (Python 3.12 Isolated Venv)       │
│  ┌────────────┬────────────┬────────────┬──────────────────────┐ │
│  │ run_router │ files_rtr  │ setup_rtr  │ config_rtr / mcp     │ │
│  └────────────┴────────────┴────────────┴──────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  JobManager: Atomic persistence to jobs.json + replay queue│  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  EngineResolver: Dynamic path resolution & embedded setup  │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  AgentBridge: Instrumentation hook on Memory.add_message   │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────┬───────────────────────────────────────────────────┘
               │  sys.path.insert(0, resolved_engine_path)
               ▼
┌──────────────────────────────────────────────────────────────────┐
│        OpenManus Core Engine (External or Embedded)              │
│                     (READ-ONLY ACCESS)                           │
└──────────────────────────────────────────────────────────────────┘

```

---

## 📂 Project Directory Structure

```text
D:\AI\OpenManus-Web\
├─ README.md
├─ .gitignore
├─ start-all.ps1
├─ start-backend.ps1
├─ start-frontend.ps1
├─ engine\                             (Embedded engine directory - Git ignored)
│  └─ openmanus\
├─ backend\
│  ├─ .venv\                           (Python 3.12 virtual environment)
│  ├─ engine_config.json               (Active engine configuration - Git ignored)
│  ├─ jobs.json                        (Runtime job persistence - Git ignored)
│  ├─ jobs.json.bak
│  └─ omweb\
│     ├─ __init__.py
│     ├─ main.py
│     ├─ config.py
│     ├─ engine_resolver.py
│     ├─ fs_utils.py
│     ├─ job_manager.py
│     ├─ agent_bridge.py
│     ├─ sse_events.py
│     └─ routers\
│        ├─ __init__.py
│        ├─ status.py
│        ├─ run.py
│        ├─ files.py
│        ├─ setup.py
│        ├─ config_rtr.py
│        └─ mcp.py
└─ frontend\
   ├─ package.json
   ├─ next.config.mjs
   ├─ tailwind.config.ts
   ├─ tsconfig.json
   └─ src\
      ├─ app\
      │  ├─ layout.tsx
      │  ├─ page.tsx
      │  ├─ chat\page.tsx
      │  ├─ files\page.tsx
      │  ├─ history\page.tsx
      │  ├─ settings\page.tsx
      │  └─ setup\page.tsx
      ├─ components\
      │  ├─ chat\
      │  ├─ workspace\
      │  ├─ layout\
      │  └─ ui\
      ├─ hooks\
      ├─ lib\
      ├─ stores\
      └─ i18n\

```

---

## 🛠️ Quick Launch Guide

### Option 1: Unified Launch (Recommended)

Launch both backend and frontend servers in distinct windows with pre-flight checks:

```powershell
.\start-all.ps1

```

### Option 2: Individual Launch

Run the services independently across two separate PowerShell terminals:

**Terminal 1 — Backend:**

```powershell
.\start-backend.ps1

```

*Health check API:* `http://localhost:8088/api/status`

**Terminal 2 — Frontend:**

```powershell
.\start-frontend.ps1

```

*Dashboard Surface:* `http://localhost:3088`

---

## 🧭 First-Run Setup & Engine Resolution

1. Open your browser and navigate to: `http://localhost:3088/setup`
2. **Scenario A (Existing OpenManus):** If OpenManus is already installed on your machine, select it from the detected candidate list or input the absolute path and click **Validate & Link**.
3. **Scenario B (New Installation):** If you do not have OpenManus installed, click **Install Embedded Engine**. The system will automatically clone `FoundationAgents/OpenManus` into `engine/openmanus`, setup default configuration files, and initialize the sandbox environment.

---

## 🔒 Security Protocols

* **Path Traversal Guard:** Every file operation inside the workspace is verified via `Path.resolve()` and `is_relative_to(WORKSPACE_ROOT)` to eliminate unauthorized directory traversal.
* **Safe Deletion:** Deleting items from the UI moves them safely into a `.trash/` recovery folder rather than permanent unrecoverable removal.
* **Secret Isolation:** Environment keys, model credentials, `engine_config.json`, and runtime databases are strictly untracked via `.gitignore`.
* **Read-Only Core Protection:** The OpenManus engine directory is treated as an immutable external module injected into Python's `sys.path`.

---

## 📜 License

Developed under the OpenManus Web Dashboard initiative. Licensed under the MIT License.

```

---

