# OpenManus Web Dashboard 🌐🤖

A sovereign, local-first web interface inspired by Manus.im, built directly on top of the [OpenManus](https://github.com/mannaandpoem/OpenManus) autonomous AI agent.

---

## 🏛️ Sovereign Architecture Highlights

- **Read-Only Agent Core**: Operates strictly alongside OpenManus (`commit 3309bf4`) without modifying any external source code.
- **Dynamic Instrumentation**: Real-time agent thought, tool execution, and observation streaming via `Memory.add_message` monkey-patching and Server-Sent Events (SSE).
- **Modern Responsive UI**: Built with Next.js 15, React 19, TypeScript, Tailwind CSS v4, and Lucide icons.
- **Bilingual & Accessible**: Full RTL/LTR support for Arabic and English out of the box.
- **Sandboxed Workspace**: Safe file explorer with preview, download, and non-destructive trash routing (`.trash/`).
- **Zero-Leakage Security**: Enforced API key masking and atomic updates to `config.toml` via `omweb.toml_io`.

---

## 🔌 Default Port Topology

| Service | Port / URL | Description |
|---|---|---|
| **Frontend Web UI** | `http://localhost:3088` | Next.js App Router Dashboard |
| **Backend Engine** | `http://localhost:8088` | FastAPI 2.0 REST & SSE Endpoints |
| **LM Studio (Optional)** | `http://localhost:1234` | Local LLM inference server |
| **Chrome CDP (Optional)** | `http://localhost:9222` | Remote browser debugging target |

---

## 🚀 Quick Start (One-Click Launchers)

### 1. Launch the Backend
Open a PowerShell terminal and execute:
```powershell
cd D:\AI\OpenManus-Web
.\start-backend.ps1
Starts FastAPI on port 8088 using the isolated virtual environment (backend\.venv).

2. Launch the Frontend
Open a second PowerShell terminal and execute:

PowerShell
cd D:\AI\OpenManus-Web
.\start-frontend.ps1
Starts Next.js on port 3088.

Open your browser and navigate to: http://localhost:3088

📁 Repository Directory Structure
D:\AI\OpenManus-Web\
├─ README.md                   # Project overview and quick start guide
├─ start-backend.ps1           # One-click backend startup script
├─ start-frontend.ps1          # One-click frontend startup script
├─ docs\
│  └─ DESIGN.md                # Sovereign architecture & security documentation
├─ backend\
│  ├─ .venv\                   # Isolated Python 3.12 virtual environment
│  ├─ jobs.json                # Thread-safe persistent execution archives
│  ├─ requirements-openmanus.txt
│  ├─ requirements-web.txt     # FastAPI, sse-starlette, tomli-w
│  └─ omweb\                   # Core backend application package
│     ├─ main.py               # FastAPI entry point
│     ├─ agent_bridge.py       # OpenManus memory monkey-patching
│     ├─ job_manager.py        # Atomic job queue and lifecycle tracking
│     ├─ toml_io.py            # Masked read/write layer for config.toml
│     └─ routers\              # API endpoints (/run, /files, /config, /status)
└─ frontend\
   ├─ src\
   │  ├─ app\                  # Next.js App Router views (/chat, /history, /files, /settings)
   │  ├─ components\           # UI modules (sidebar, header, live-steps, modals)
   │  ├─ hooks\                # Stream and data hooks (useJobStream)
   │  ├─ stores\               # Client state management (Zustand chat-store)
   │  └─ i18n\                 # Multi-language translations (Arabic & English)
   └─ package.json             # Frontend dependencies
🛡️ License & Sovereign Rights
Created and maintained by mtaman. Built for local autonomy and local-first AI agent operations.