# peldrun Web – Installation & Operation Guide

[![peldrun Core](https://img.shields.io/badge/peldrun-Core-blue?style=for-the-badge&logo=github)](https://github.com/FoundationAgents/peldrun)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%202.0-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-000000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

A complete web dashboard for the **peldrun** AI agent. Visual execution, live streaming, and full file & settings management.

 

---

## ✨ Key Features

- **Split‑View Interface** – Chat and live telemetry side by side.
- **Live Streaming (SSE)** – Real‑time thoughts and tool calls.
- **Zero‑Config Setup Wizard** – Auto‑detect existing peldrun or install embedded with one click.
- **Secure File Explorer** – File tree, code editor, downloads, path‑traversal protection.
- **Task History & Replay** – Persistent task storage with one‑click re‑run.
- **Bilingual Support** – Arabic and English with full RTL/LTR.
- **Advanced Security** – Path traversal guard, safe deletion, secret isolation.
- **One‑Click Launch** – PowerShell scripts to start both servers.

---

## 🏗️ Architecture (Simplified)

```
Browser (localhost:3088)
      │ HTTP + SSE
      ▼
Frontend (Next.js 15) ── /api/* proxy → Backend (FastAPI 2.0) on port 8088
      │
      ▼
peldrun Core Engine (embedded or external)
```

---

## 📂 Project Structure

```
PELDRUN-Web/
├─ start-all.ps1
├─ start-backend.ps1
├─ start-frontend.ps1
├─ engine/                 # Embedded peldrun (Git ignored)
│  └─ peldrun/
├─ backend/
│  ├─ .venv/
│  ├─ requirements.txt
│  └─ omweb/
└─ frontend/
   ├─ package.json
   └─ src/
```

> **Note:** `start-frontend.py` and `start_frontend.bat` are **not used** by the project. They can be safely deleted.

---

## 🛠️ Prerequisites

| Requirement | Recommended Version | Notes |
|-------------|---------------------|-------|
| **Python** | 3.12+ | Backend and peldrun engine |
| **Node.js** | 18+ | Next.js frontend |
| **Git** | Latest | Cloning repositories |
| **PowerShell** | 5.1+ | Windows launch scripts (optional) |

> **Note:** If you don't have peldrun installed, the setup wizard will install an embedded copy automatically.

---

## 🚀 Installation Guide

### Step 1 – Clone the Repository

```bash
git clone https://github.com/mtaman/PELDRUN-Web.git
cd PELDRUN-Web
```

### Step 2 – Backend Setup

```bash
cd backend
python -m venv .venv

# Activate the virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

> **Important:** The `backend/requirements.txt` file should already be present in the repository. If not, create it manually from the project's documentation.

### Step 3 – Frontend Setup

```bash
cd ../frontend
npm install
```

### Step 4 – Configure the peldrun Engine

You have two options:

#### 🔹 Option A – Embedded Engine (Recommended for New Users)

1. Start the backend and frontend (see Step 5).
2. Open `http://localhost:3088/setup`.
3. Click **"Install Embedded Engine"**.
4. The system clones peldrun into `engine/peldrun`, creates `config.toml`, and initialises the sandbox.

#### 🔹 Option B – Link an Existing peldrun Installation

1. Open the `/setup` page.
2. The system will list detected paths. Select one and click **"Connect"**, or enter a custom path manually.
3. Ensure the path points to a valid peldrun directory containing `config.toml`.

---

## 🏃 Running the Application

### ⚠️ Important Note About PowerShell Scripts

The provided `start-all.ps1`, `start-backend.ps1`, and `start-frontend.ps1` scripts contain **absolute paths** such as `D:\AI\PELDRUN-Web\`.  
**They will not work on your machine unless you edit these paths.**

You can either:

- Edit the scripts to match your project location, **or**
- Use the manual commands below (recommended for cross‑platform compatibility).

#### Making the Scripts Portable (Optional)

Replace absolute paths with relative ones. Example for `start-all.ps1`:

```powershell
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Start-Process powershell -ArgumentList "-NoExit", "-File", "$root\start-backend.ps1"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-File", "$root\start-frontend.ps1"
```

Apply similar changes to `start-backend.ps1` and `start-frontend.ps1`.

---

### Manual Launch (Works on Windows, macOS, Linux)

Open **two terminals** from the project root.

**Terminal 1 – Backend (FastAPI)**

```bash
cd backend
# Activate virtual environment first (see Step 2)

# Windows (ensure Windows Proactor loop for Playwright):
python -c "import sys, asyncio, uvicorn; asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy()) if sys.platform == 'win32' else None; uvicorn.run('omweb.main:app', host='0.0.0.0', port=8088)"

# macOS / Linux:
uvicorn omweb.main:app --host 0.0.0.0 --port 8088
```

**Terminal 2 – Frontend (Next.js)**

```bash
cd frontend
npm run dev -- -p 3088
```

---

### One‑Click Launch (Windows Only, after editing scripts)

```powershell
.\start-all.ps1
```

This opens two PowerShell windows and starts both servers.

---

## 🌐 Accessing the Dashboard

| Service | URL |
|---------|-----|
| Dashboard UI | `http://localhost:3088` |
| Setup Wizard | `http://localhost:3088/setup` |
| Backend Health Check | `http://localhost:8088/api/status` |

After starting both servers, open your browser and navigate to `http://localhost:3088`.  
Go to `/setup` to configure the engine. Once the status shows **"READY & SYNCHRONIZED"**, you can start using the dashboard.

---

## ⚙️ Configuration

### API Keys

Configure your LLM provider (OpenAI, DeepSeek, Ollama, etc.) either via:

1. **Settings UI** at `/settings`.
2. **`config.toml`** inside the peldrun engine folder:

```toml
[llm]
model = "gpt-4o"
base_url = "https://api.openai.com/v1"
api_key = "sk-your-api-key-here"
max_tokens = 4096
temperature = 0.0
```

### Ports

| Service | Default Port | Changeable |
|---------|--------------|------------|
| Frontend (Next.js) | 3088 | Yes – via `next.config.mjs` or CLI |
| Backend (FastAPI) | 8088 | Yes – via environment variables |

---

## 🧭 Basic Usage

- **Chat** (`/chat`) – Send commands, watch live streaming, see results.
- **Files** (`/files`) – Browse, edit, download, and safely delete files.
- **History** (`/history`) – View past tasks and re‑run them.
- **Settings** (`/settings`) – Manage API keys and UI preferences.

---

## 🔒 Security

- **Path Traversal Guard** – All file operations validated with `Path.resolve()` and `is_relative_to(WORKSPACE_ROOT)`.
- **Safe Deletion** – Files moved to `.trash/` instead of permanent removal.
- **Secret Isolation** – Keys and runtime files are `.gitignore`d.
- **Read‑Only Core** – peldrun engine is treated as an immutable external module.

---

## 🧪 Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend not starting | Ensure `.venv` is activated and dependencies installed. |
| Frontend not loading | Run `npm install`; check port 3088 is free. |
| peldrun not found | Use `/setup` to install embedded or link existing path. |
| Invalid API key | Check `config.toml` or `/settings`. |
| SSE streaming issues | Ensure port 8088 is not blocked by firewall. |

---

## 📜 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.

---

## 🔗 Important Links

| Resource | Link |
|----------|------|
| peldrun Official Repository | [https://github.com/FoundationAgents/peldrun](https://github.com/FoundationAgents/peldrun) |
| peldrun Web Repository | [https://github.com/mtaman/PELDRUN-Web](https://github.com/mtaman/PELDRUN-Web) |
| FoundationAgents Organization | [https://github.com/FoundationAgents](https://github.com/FoundationAgents) |

---

<div align="center">

**Made with ❤️ for the peldrun community worldwide**

</div>