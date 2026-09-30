export interface ServerHealthResponse {
  status: "healthy" | "degraded" | "unhealthy" | "online";
  server?: string;
  openmanus_linked?: boolean;
  workspaces_writable?: boolean;
  llm_configured?: boolean;
  memory_usage_percent?: number;
  python_version?: string;
  platform?: string;
  timestamp?: string;
}

export interface SystemMemoryInfo {
  total_gb: number;
  available_gb: number;
  usage_percent: number;
}

export interface SystemInfoResponse {
  os: {
    system: string;
    release: string;
    version: string;
    machine: string;
    cpu_brand: string;
    cores: number;
    memory: SystemMemoryInfo;
  };
  software: {
    python: string;
    python_executable: string;
  };
  repositories: {
    openmanus: {
      path: string;
      commit: string;
      target_commit: string;
      is_aligned: boolean;
    };
    openmanus_web: {
      path: string;
      commit: string;
      version: string;
    };
  };
}

export interface ServerStatusResult {
  status: "online" | "degraded" | "offline" | "checking";
  isOnline: boolean;
  latency: number;
  data: ServerHealthResponse | null;
  error?: string;
}

export interface DiagnosticsReport {
  health: ServerHealthResponse | null;
  systemInfo: SystemInfoResponse | null;
  latency: number;
  isOnline: boolean;
  error?: string;
  timestamp: string;
}

export async function checkServerHealth(timeoutMs = 4000): Promise<ServerStatusResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = performance.now();

  try {
    let res = await fetch("/api/status/health", {
      signal: controller.signal,
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });

    if (res.status === 404) {
      res = await fetch("/api/status", {
        signal: controller.signal,
        cache: "no-store"
      });
    }

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);

    if (!res.ok) {
      return {
        status: "offline",
        isOnline: false,
        latency,
        data: null,
        error: `HTTP ${res.status}`
      };
    }

    const data: ServerHealthResponse = await res.json();
    const effectiveStatus =
      data.status === "degraded"
        ? "degraded"
        : data.status === "unhealthy"
        ? "offline"
        : "online";

    return {
      status: effectiveStatus,
      isOnline: effectiveStatus !== "offline",
      latency,
      data
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);
    return {
      status: "offline",
      isOnline: false,
      latency,
      data: null,
      error: err?.name === "AbortError" ? "Timeout" : (err?.message || "Network Error")
    };
  }
}

export async function fetchFullDiagnostics(timeoutMs = 6000): Promise<DiagnosticsReport> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = performance.now();

  try {
    const [healthRes, infoRes] = await Promise.all([
      fetch("/api/status/health", { signal: controller.signal, cache: "no-store" }).catch(() => null),
      fetch("/api/status/system-info", { signal: controller.signal, cache: "no-store" }).catch(() => null)
    ]);

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);

    let health: ServerHealthResponse | null = null;
    let systemInfo: SystemInfoResponse | null = null;

    if (healthRes && healthRes.ok) {
      health = await healthRes.json();
    }
    if (infoRes && infoRes.ok) {
      systemInfo = await infoRes.json();
    }

    const isOnline = Boolean(health || systemInfo);

    return {
      health,
      systemInfo,
      latency,
      isOnline,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      health: null,
      systemInfo: null,
      latency: Math.round(performance.now() - startTime),
      isOnline: false,
      error: err?.message || "Connection failed",
      timestamp: new Date().toISOString()
    };
  }
}
