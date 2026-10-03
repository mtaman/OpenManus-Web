# PELDRUN-Web Unified Multi-Tier Storage Architecture

## 1. Architectural Overview & Design Philosophy

The **Unified Multi-Tier Storage Architecture** provides a typed, SSR-safe, and reactive persistence layer for the PELDRUN-Web application.

In modern hybrid React/Next.js frameworks (App Router with Next.js 15), reading client storage such as `localStorage` or `sessionStorage` during server-side execution is strictly forbidden and produces hydration mismatch errors. Conversely, performing blocking server reads on client-only values compromises runtime performance.

To resolve this dichotomy, this architecture bifurcates persistence into **two physical tiers**:

```
                       PELDRUN-Web Application
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
   SERVER TIER (SSR)                               CLIENT TIER (Browser)
         │                                                 │
  HTTP Request Cookies                              Browser Runtime
         │                                                 │
 ┌───────┴────────┐                                ┌───────┴────────┐
 │   Layout SSR   │                                │  LocalStorage  │
 │  Preferences   │                                │ Configuration  │
 └────────────────┘                                └────────────────┘
         │                                                 │
         │ (Initial SSR Hydration Snapshot)                │ (Sync & Events)
         ▼                                                 ▼
┌───────────────────────────────────────────────────────────────────┐
│               Unified Reactive Storage Bridge                     │
│      (useAppStorage Hook + Cross-Tab BroadcastChannel)            │
└───────────────────────────────────────────────────────────────────┘

```

1. **Server-Critical Tier (Cookies):** Houses user interface layout preferences (`sidebar_state`, `right_panel_open`, `theme`, `locale`). These values are evaluated during the initial server request via asynchronous cookie reading (`await cookies()`), preventing **Flash of Unstyled Content (FOUC)** and layout thrashing.


2. **Client-Only Tier (`localStorage`):** Houses execution configurations, selected engines, local model parameters, and runtime overrides (`active_model`, `active_provider`, `exec_mode`, `api_base_url`). These are managed in the browser environment with automatic schema validation and cross-tab synchronization.



---

## 2. Directory Layout & Module Structure

The unified storage implementation is self-contained within `frontend/src/lib/storage`, augmented by top-level Next.js Server Actions, a React context provider, and a custom hook:

```
frontend/src/
├── app/
│   ├── actions/
│   │   └── storage.ts              # Server Actions for HTTP cookie mutations
│   └── layout.tsx                  # Root layout performing SSR snapshot injection
├── components/
│   └── providers/
│       └── storage-provider.tsx    # Client Context distributing SSR cookie snapshots
├── hooks/
│   └── use-app-storage.ts          # Reactive, hydration-safe hook (useSyncExternalStore)
└── lib/
    └── storage/
        ├── schema.ts               # Canonical schema definition and Zod runtime validators
        ├── client.ts               # Core browser storage engine with BroadcastChannel
        ├── server.ts               # Asynchronous Server Component storage reader
        ├── zustand.ts              # Standardized StateStorage adapter for Zustand stores
        ├── debounce.ts             # Throttling utility for write-heavy properties
        └── index.ts                # Public module export aggregation

```

---

## 3. Core Engine Mechanics & Data Flow

### 3.1. Unified Schema & Type Safety (`schema.ts`)

All persisted application properties are declared inside `storageSchema` using Zod validators. A TypeScript developer cannot write to an arbitrary key or persist malformed data payloads:

```typescript
export const storageSchema = {
  // SSR-critical cookies
  sidebar_state: {
    tier: "cookie",
    schema: z.enum(["expanded", "collapsed"]),
    defaultValue: "expanded",
  },
  right_panel_open: {
    tier: "cookie",
    schema: z.boolean(),
    defaultValue: false,
  },
  theme: {
    tier: "cookie",
    schema: z.enum(["light", "dark", "system"]),
    defaultValue: "system",
  },
  locale: {
    tier: "cookie",
    schema: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
    defaultValue: "en",
  },

  // Client-only configuration
  exec_mode: {
    tier: "local",
    schema: z.enum(["agent", "chat"]),
    defaultValue: "agent",
  },
  active_model: {
    tier: "local",
    schema: z.string().min(1).max(256),
    defaultValue: "qwen3-vl-8b-instruct",
  },
  active_provider: {
    tier: "local",
    schema: z.string().min(1).max(128),
    defaultValue: "LM Studio (Local)",
  },
  selected_engine: {
    tier: "local",
    schema: z.string().min(1).max(128),
    defaultValue: "peldrun-agent",
  },
  active_llm_override: {
    tier: "local",
    schema: z.string().max(4096).nullable(),
    defaultValue: null,
  },
  api_base_url: {
    tier: "local",
    schema: z.string().max(2048),
    defaultValue: "http://127.0.0.1:1234/v1",
  },
  custom_prompt: {
    tier: "local",
    schema: z.string().max(100000),
    defaultValue: "",
  },
} as const;

```

### 3.2. Asynchronous Server-Side Hydration (`server.ts` & `layout.tsx`)

In Next.js 15, request-bound APIs such as `cookies()` return a Promise. In `layout.tsx`, `getServerStorageSnapshot()` resolves the stored cookies server-side and injects them directly into:

1. The static HTML attributes (`data-sidebar={sidebarState}`, `data-theme={theme}`).


2. The `<StorageProvider cookieSnapshot="{cookieSnapshot}">` wrapper.



When the client browser parses the document, the DOM already reflects the persisted state before JavaScript execution begins, preventing layout shift.

### 3.3. Client Storage Engine & Cross-Tab Reactivity (`client.ts`)

The client engine encapsulates all browser interactions:

* **Safe Parsing:** Catches and logs corrupted JSON entries, gracefully reverting to the default schema value without throwing runtime exceptions.


* **Local In-Memory Notification:** Fires registered listeners immediately within the active window when a change occurs.


* **BroadcastChannel:** Transmits updates across browser tabs via `new BroadcastChannel("PELDRUN-Web-storage")`.


* **StorageEvent Fallback:** Listens for standard window `storage` events to ensure cross-window reactivity.



### 3.4. Hydration-Safe Hook (`use-app-storage.ts`)

Instead of `useEffect` + `useState` (which triggers double-renders and hydration mismatch warnings), the hook relies on React's `useSyncExternalStore`:

```typescript
const value = useSyncExternalStore(
  subscribe,
  getSnapshot,
  getServerSnapshot
);

```

* **`getServerSnapshot`:** Returns the SSR cookie snapshot or default schema value, guaranteeing that the initial client render tree strictly matches the server-generated markup.


* **`getSnapshot`:** Returns the active memory/storage value during client-side user operations.



---

## 4. Usage Guide for Developers

### 4.1. Reading and Writing in React Components (Standard Pattern)

Import and invoke `useAppStorage` inside any Client Component (`"use client"`):

```tsx
"use client";

import React from "react";
import { useAppStorage } from "@/hooks/use-app-storage";

export function ModelSelector() {
  const [model, setModel] = useAppStorage("active_model");
  const [execMode, setExecMode] = useAppStorage("exec_mode");

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="input"
      />
      <button
        onClick={() => setExecMode(execMode === "agent" ? "chat" : "agent")}
        className="btn"
      >
        Current Mode: {execMode}
      </button>
    </div>
  );
}

```

### 4.2. Direct Imperative Client Usage (Outside React Components)

For API clients, interceptors, or utility functions operating outside the React render lifecycle, use the direct `storage` singleton:

```typescript
import { storage } from "@/lib/storage/client";

// Read value synchronously
const currentEngine = storage.get("selected_engine");

// Write value (automatically triggers UI subscribers and cross-tab broadcasts)
storage.set("selected_engine", "peldrun-agent");

// Subscribe to imperative changes
const unsubscribe = storage.subscribe("exec_mode", (newMode) => {
  console.log("Execution mode changed to:", newMode);
});

```

### 4.3. Layout & Cookie Mutations with Server Component Refresh

When modifying an SSR-critical cookie (such as toggling the sidebar), write the value via `useAppStorage` and immediately invoke `router.refresh()` so server components re-render with the updated cookie payload:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useAppStorage } from "@/hooks/use-app-storage";

export function SidebarCollapseButton() {
  const router = useRouter();
  const [sidebarState, setSidebarState] = useAppStorage("sidebar_state");

  const toggleSidebar = () => {
    const nextState = sidebarState === "expanded" ? "collapsed" : "expanded";
    setSidebarState(nextState);
    router.refresh();
  };

  return (
    <button onClick={toggleSidebar}>
      Toggle ({sidebarState})
    </button>
  );
}

```

### 4.4. Zustand Store Integration (`zustand.ts`)

If building a Zustand store that requires persistent storage through the unified engine, supply `zustandStorage`:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/lib/storage/zustand";

interface WorkspaceRuntimeState {
  activeFile: string | null;
  setActiveFile: (file: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceRuntimeState>()(
  persist(
    (set) => ({
      activeFile: null,
      setActiveFile: (file) => set({ activeFile: file }),
    }),
    {
      name: "omweb-workspace-cache",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

```

### 4.5. Debounced Storage Writes (`debounce.ts`)

For high-frequency events (such as typing into a textarea or editor), wrap the setter using `createDebouncedWriter`:

```tsx
"use client";

import { useMemo } from "react";
import { storage, createDebouncedWriter } from "@/lib/storage";

export function CustomPromptEditor() {
  const debouncedPromptUpdate = useMemo(
    () =>
      createDebouncedWriter((content: string) => {
        storage.set("custom_prompt", content);
      }, 300),
    []
  );

  return (
    <textarea
      defaultValue={storage.get("custom_prompt")}
      onChange={(e) => debouncedPromptUpdate(e.target.value)}
      placeholder="Type system prompt instructions..."
    />
  );
}

```

---

## 5. Adding New Keys to the Schema

To register a new persistent property:

1. Open `frontend/src/lib/storage/schema.ts`.


2. Append the key definition to `storageSchema`:


```typescript
export const storageSchema = {
  // ... existing keys
  my_new_feature_enabled: {
    tier: "local", // or "cookie" if needed server-side during initial SSR render
    schema: z.boolean(),
    defaultValue: true,
  },
} as const;

```


3. TypeScript automatically derives the type unions (`StorageKey`, `StorageValue<K>`). The key becomes immediately available to `useAppStorage("my_new_feature_enabled")` with compile-time type validation.



---

## 6. Architecture Rules & Guardrails

To prevent regressions and maintain isolation:

* **No Raw `localStorage` Access:** Direct calls to `window.localStorage.getItem(...)` or `window.localStorage.setItem(...)` outside `src/lib/storage/` are strictly disallowed.


* **No Arbitrary Key Names:** Keys must be defined in `storageSchema` to ensure validation and schema tracking.


* **Do Not Persist Ephemeral Streaming Data:** Server-Sent Events (SSE), tool traces, stream chunks, tokens, and live agent execution progress belong in memory (Zustand or component state) and must never be routed through this storage engine.


* **No Sensitive Secrets:** API keys and private tokens must never be written to client cookies or client storage; they belong on the secure backend server.