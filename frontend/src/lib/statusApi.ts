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

export interface ServerStatusResult {
  status: "online" | "degraded" | "offline" | "checking";
  isOnline: boolean;
  latency: number;
  data: ServerHealthResponse | null;
  error?: string;
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
