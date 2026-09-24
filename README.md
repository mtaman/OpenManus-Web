# OpenManus Web Dashboard

A sovereign, local web dashboard interface providing full Manus.im-style capabilities powered by OpenManus.

---

## Executive Summary

| Parameter | Specification |
|---|---|
| **Goal** | Local interactive web dashboard mimicking Manus.im on top of OpenManus |
| **Root Path** | `D:\AI\OpenManus-Web\` |
| **Backend Stack** | FastAPI 2.0, Python 3.12, Isolated Virtual Environment (`backend/.venv`) |
| **Frontend Stack** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| **Real-time Engine**| SSE (Server-Sent Events) via `sse-starlette` (AG-UI event protocol) |
| **State Management**| Zustand (Client UI State) + TanStack Query (Server State Synchronization) |
| **Internationalization** | `react-i18next` supporting Arabic (RTL) & English (LTR) |
| **Ports** | Backend: `8088` \| Frontend: `3088` \| LM Studio: `1234` \| Chrome CDP: `9222` |
| **OpenManus Source**| `D:\AI\OpenManus` @ commit `3309bf4` (STRICTLY READ-ONLY) |
| **Injection Point** | Non-invasive monkey-patch on `Memory.add_message` |

---

## High-Level System Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                   BROWSER (http://localhost:3088)                │
└───────────────────────────┬──────────────────────────────────────┘
                            │  HTTP + Server-Sent Events (SSE)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│         FRONTEND — Next.js 15 (App Router) · React 19            │
│  ┌──────────┬──────────┬───────────┬──────────┬──────────────┐   │
│  │ /chat    │ /history │ /files    │ /settings│ /            │   │
│  └──────────┴──────────┴───────────┴──────────┴──────────────┘   │
└───────────────────────────┬──────────────────────────────────────┘
                            │  Reverse Proxy / Direct API (:8088)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│         BACKEND — FastAPI 2.0 (Python 3.12 Isolated venv)        │
│  ┌────────────┬────────────┬────────────┬──────────────────────┐ │
│  │ run_router │ files_rtr  │ config_rtr │ mcp_router           │ │
│  └────────────┴────────────┴────────────┴──────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  JobManager: in-memory state + atomic write to jobs.json   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  AgentBridge: dynamic monkey-patching of OpenManus events  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────┬───────────────────────────────────────────────────┘
               │  sys.path.insert(0, r"D:\AI\OpenManus")
               ▼
┌──────────────────────────────────────────────────────────────────┐
│         D:\AI\OpenManus (External Core Engine — READ-ONLY)       │
└──────────────┬───────────────────────────────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌──────────────┐ ┌──────────────────┐
│ LM Studio    │ │ Chrome CDP       │
│ Port: 1234   │ │ Port: 9222       │
└──────────────┘ └──────────────────┘
```