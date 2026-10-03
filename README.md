<div align="center">

<img src="assets\image\peldrun-logo.svg" alt="peldrun Web Logo" width="200">

[![peldrun](https://img.shields.io/badge/peldrun-Core-blue?style=for-the-badge&logo=github)](https://github.com/FoundationAgents/peldrun)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%202.0-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-000000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)


</div>

# 👋 Peldrun Web — Professional Dashboard for the peldrun AI Agent

<div align="center">


**A complete web interface for full control of peldrun — visual execution, live streaming, and complete file & settings management.**



</div>

---

## 📖 Overview

**peldrun Web** is a professional operating system and frontend designed specifically for full control of the **peldrun** AI agent. It allows you to manage peldrun entirely visually — from settings, to sending commands, to receiving results, with live streaming of operations and tool traces.

Instead of dealing only with the terminal, **peldrun Web** gives you a modern browser-based dashboard with full Arabic/English (RTL/LTR) support and a smooth user experience that makes controlling your AI agent feel like using a modern web app.

> **peldrun** is an open-source framework for building general AI agents, developed by **FoundationAgents**. You can view the official repository here: [https://github.com/FoundationAgents/peldrun](https://github.com/FoundationAgents/peldrun)

---

## ✨ Key Features

| Feature | Description |
|--------|-------------|
| **🖥️ Split-View Interface** | Simultaneous display of chat and live telemetry on one screen |
| **⚡ Live Streaming (SSE)** | Instant streaming of thoughts and tool calls via Server-Sent Events |
| **🧙♂️ Zero-Config Setup Wizard** | Automatic detection of existing peldrun installations, or one-click embedded installation |
| **📂 Secure File Explorer** | Interactive file tree, built-in code editor, and direct file downloads with path-traversal protection |
| **📜 Task History & Replay** | Persistent storage of all tasks with one-click re-run and full retrospective inspection |
| **🌍 Bilingual Support** | Arabic and English interface with full RTL/LTR support |
| **🔒 Advanced Security** | Path traversal guard, safe deletion (trash), and secret isolation |
| **🚀 One-Click Launch** | Ready-to-use PowerShell scripts to start both frontend and backend together |

---

## 🏗️ Architectural Topology

```text
┌──────────────────────────────────────────────────────────────────┐
│                     BROWSER (localhost:3088)                     │
└───────────────────────────┬──────────────────────────────────────┘
                            │  HTTP + SSE
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│          FRONTEND — Next.js 15 · React 19 · TypeScript           │
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
│        peldrun Core Engine (External or Embedded)              │
│                     (READ-ONLY ACCESS)                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Directory Structure

```text
D:\AI\peldrun\
├─ README.md
├─ .gitignore
├─ start-all.ps1
├─ start-backend.ps1
├─ start-frontend.ps1
├─ engine\                             (Embedded engine directory — Git ignored)
│  └─ peldrun\
├─ backend\
│  ├─ .venv\                           (Python 3.12 virtual environment)
│  ├─ engine_config.json               (Active engine configuration — Git ignored)
│  ├─ jobs.json                        (Runtime job persistence — Git ignored)
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

## 🛠️ Prerequisites

Before you begin, ensure the following are installed on your system:

| Requirement | Recommended Version | Notes |
|-------------|---------------------|-------|
| **Python** | 3.12+ | Required for the backend and peldrun engine |
| **Node.js** | 18+ | Required for the Next.js frontend |
| **Git** | Latest | For cloning repositories |
| **PowerShell** | 5.1+ | To run the launch scripts (Windows) |
| **peldrun** | — | Can be installed embedded or linked from an existing installation |

> **Note:** If you don’t have peldrun installed yet, don’t worry — **peldrun Web** will automatically install an embedded copy via the setup wizard.

---

## 🚀 Complete Installation Guide

### Step 1: Clone the peldrun Web Repository

```bash
git clone https://github.com/mtaman/PELDRUN-Web.git
cd PELDRUN-Web
```

### Step 2: Backend Setup

#### 2.1 Create a Virtual Environment

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
```

#### 2.2 Install Dependencies

```powershell
pip install -r requirements.txt
```

#### 2.3 Install peldrun Dependencies (if using embedded engine)

The setup wizard will handle this automatically, but you can also install manually later.

### Step 3: Frontend Setup

```powershell
cd ..\frontend
npm install
```

### Step 4: Configure the peldrun Engine

You have two options:

#### 🔹 Option A: Install Embedded Engine (Recommended for New Users)

1. Start the backend and frontend (see Step 5).
2. Open your browser and go to: `http://localhost:3088/setup`
3. Click the **"Install Embedded Engine"** button.
4. The system will automatically:
   - Clone the peldrun repository from [https://github.com/FoundationAgents/peldrun](https://github.com/FoundationAgents/peldrun) into `engine/peldrun`.
   - Create default configuration files.
   - Initialize the sandbox environment.

#### 🔹 Option B: Link an Existing peldrun Installation

1. Open the `/setup` page in the web interface.
2. The system will show a list of automatically detected paths on your machine.
3. Select the correct path and click **"Use Path"**, or enter a custom path and click **"Validate & Link"**.
4. Ensure the path points to a folder containing `config.toml` and that the engine is valid.

> **Note:** You can always refer to the official peldrun repository for the latest instructions: [https://github.com/FoundationAgents/peldrun](https://github.com/FoundationAgents/peldrun)

### Step 5: Start the System

#### Recommended: Unified One-Click Launch

```powershell
# From the project root
.\start-all.ps1
```

This script launches both servers in separate windows with pre-flight checks.

#### Alternative: Separate Launch

**Terminal 1 — Backend:**

```powershell
.\start-backend.ps1
```

- Health check API: `http://localhost:8088/api/status`

**Terminal 2 — Frontend:**

```powershell
.\start-frontend.ps1
```

- Dashboard: `http://localhost:3088`

### Step 6: Verify Installation

After starting both servers, open your browser and go to `http://localhost:3088`. You should see the main dashboard. Navigate to `/setup` and confirm the engine status shows **"READY & SYNCHRONIZED"**.

---

## ⚙️ Configuration & Settings

### API Key Configuration

To enable peldrun, you need to configure an LLM provider (e.g., OpenAI, DeepSeek, Ollama). You can do this via:

1. **Integrated Settings UI** at `/settings`.
2. **`config.toml` file** inside the peldrun engine folder:

```toml
[llm]
model = "gpt-4o"
base_url = "https://api.openai.com/v1"
api_key = "sk-your-api-key-here"
max_tokens = 4096
temperature = 0.0
```

> For more details on configuring peldrun, see the [official guide](https://github.com/FoundationAgents/peldrun).

### Port Configuration

| Service | Default Port | Changeable |
|---------|--------------|------------|
| Frontend (Next.js) | 3088 | Yes — via `next.config.mjs` |
| Backend (FastAPI) | 8088 | Yes — via environment variables |

---

## 🧭 Basic Usage

### 1. Chat with the Agent (`/chat`)

- Enter your commands in Arabic or English.
- Watch live streaming of thoughts and tool calls during execution.
- View final results on the same screen.

### 2. File Management (`/files`)

- Browse the workspace directory tree.
- Open and edit files in the built-in editor.
- Download files directly.
- Delete files safely (moved to `.trash/`).

### 3. Task History (`/history`)

- View all previous tasks.
- Re-run any task with one click.
- Inspect full execution details.

### 4. Settings (`/settings`)

- Modify API keys and LLM models.
- Adjust UI and language preferences.

---

## 🔒 Security Protocols

- **Path Traversal Guard:** Every file operation is verified via `Path.resolve()` and `is_relative_to(WORKSPACE_ROOT)`.
- **Safe Deletion:** Deleted items are moved to a `.trash/` recovery folder instead of permanent removal.
- **Secret Isolation:** Environment keys, credentials, `engine_config.json`, and runtime databases are strictly untracked via `.gitignore`.
- **Read-Only Core Protection:** The peldrun engine directory is treated as an immutable external module injected into `sys.path`.

---

## 🧪 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Backend not starting** | Ensure the `.venv` is activated and all dependencies are installed |
| **Frontend not loading** | Run `npm install` and check that port 3088 is free |
| **peldrun not found** | Use the `/setup` wizard to install embedded or link an existing path |
| **Invalid API key** | Check `config.toml` or the `/settings` page |
| **SSE streaming issues** | Ensure no firewall is blocking connections on port 8088 |

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📜 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.

---

## 🔗 Important Links

| Resource | Link |
|----------|------|
| **peldrun Official Repository** | [https://github.com/FoundationAgents/peldrun](https://github.com/FoundationAgents/peldrun) |
| **peldrun Web Repository** | [https://github.com/mtaman/PELDRUN-Web](https://github.com/mtaman/PELDRUN-Web) |
| **FoundationAgents Organization** | [https://github.com/FoundationAgents](https://github.com/FoundationAgents) |
| **peldrun Quick Start Guide** | [Quick Start Guide](https://deepwiki.com/sxhxliang/peldrun/1.1-quick-start) |

---

<div align="center">

**Made with ❤️ for the peldrun community worldwide**

</div>