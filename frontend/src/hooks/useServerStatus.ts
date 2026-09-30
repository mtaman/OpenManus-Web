"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { checkServerHealth, ServerHealthResponse, ServerStatusResult } from "@/lib/statusApi";

export interface UseServerStatusOptions {
  pollingIntervalMs?: number;
  enabled?: boolean;
}

export function useServerStatus(options: UseServerStatusOptions = {}) {
  const { pollingIntervalMs = 45000, enabled = true } = options;

  const [state, setState] = useState<ServerStatusResult>({
    status: "checking",
    isOnline: false,
    latency: 0,
    data: null
  });
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const lastCheckTimeRef = useRef<number>(0);
  const isCheckingRef = useRef<boolean>(false);

  const checkStatus = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && (now - lastCheckTimeRef.current < 2000 || isCheckingRef.current)) {
      return;
    }

    isCheckingRef.current = true;
    setIsChecking(true);

    try {
      const result = await checkServerHealth();
      lastCheckTimeRef.current = Date.now();
      setState(result);
    } catch {
      setState({
        status: "offline",
        isOnline: false,
        latency: 0,
        data: null,
        error: "Check failed"
      });
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    checkStatus(true);
  }, [checkStatus, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastCheckTimeRef.current;
        if (elapsed > 15000) {
          checkStatus(true);
        }
      }
    };

    const handleOnline = () => checkStatus(true);
    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        status: "offline",
        isOnline: false,
        error: "Browser Offline"
      }));
    };

    const handleCustomRefresh = () => checkStatus(true);

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("omweb:check-server-status", handleCustomRefresh);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("omweb:check-server-status", handleCustomRefresh);
    };
  }, [checkStatus, enabled]);

  useEffect(() => {
    if (!enabled || pollingIntervalMs <= 0) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        checkStatus();
      }
    }, pollingIntervalMs);

    return () => clearInterval(timer);
  }, [checkStatus, enabled, pollingIntervalMs]);

  return {
    status: state.status,
    isOnline: state.isOnline,
    latency: state.latency,
    health: state.data,
    error: state.error,
    isChecking,
    checkNow: () => checkStatus(true)
  };
}
