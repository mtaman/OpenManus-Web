# Architecture and Design Specification

**Project:** OpenManus Web Dashboard  
**Status:** Sovereign Local Architecture  
**Root Path:** `D:\AI\OpenManus-Web\`

---

## 1. System Overview & Data Flow

The OpenManus Web Dashboard is designed as an isolated, modern web interface mimicking Manus.im capabilities on top of OpenManus. The system decouples the frontend client, backend API/orchestration engine, and the external execution core.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER (localhost:3088)                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │  HTTP API + SSE Streams
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND: Next.js 15 (App Router)                    │
│  - State Management: Zustand (Client UI) + TanStack Query (Data/Server)│
│  - UI: Tailwind CSS v4 + shadcn/ui components                          │
│  - Localization: react-i18next (Arabic RTL / English LTR)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │  Reverse Proxy / Direct (:8088)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    BACKEND: FastAPI 2.0 (Python 3.12)                  │
│  - Isolated Virtual Environment: backend/.venv                         │
│  - Routers:                                                            │
│      * /api/status     (System & Dependency Health Checks)             │
│      * /api/run        (Job Execution, Streaming & Controls)           │
│      * /api/files      (Workspace File Management & Path Traversal Guard│
│      * /api/config     (Safe TOML I/O & Masked Settings)               │
│      * /api/mcp        (Model Context Protocol Status/Tool Registry)   │
│  - Core Services:                                                      │
│      * JobManager      (In-memory lifecycle + atomic jobs.json writes) │
│      * AgentBridge     (Dynamic monkey-patching of Memory.add_message) │
│      * SSEEvents       (AG-UI-compatible event streaming generator)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │  sys.path.insert(0, r"D:\AI\OpenManus")
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             EXTERNAL CORE: D:\AI\OpenManus (STRICT READ-ONLY)          │
│  - Pinned Commit: 3309bf4                                              │
│  - Non-invasive execution via AgentBridge                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │   LM Studio (:1234)    │      │    Chrome CDP (:9222)  │
       │   Local LLM Inference  │      │    Headless/DevTools   │
       └────────────────────────┘      └────────────────────────┘
```