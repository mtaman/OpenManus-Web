"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStreamStore } from "@/stores/stream-store";
import { openJobStream } from "@/lib/sse";
import { reduceEvent, initialRunState } from "@/lib/stream-reducer";
import { SSEEnvelope } from "@/lib/types";

export function useJobStream(jobId: string | null, prompt: string) {
  const closeRef = useRef<(() => void) | null>(null);
  const upsertRun = useStreamStore((s) => s.upsertRun);
  const clearRun = useStreamStore((s) => s.clearRun);

  const dispatch = useCallback(
    (event: SSEEnvelope) => {
      useStreamStore.setState((s) => {
        const prev = s.runs[event.jobId] ?? initialRunState(event.jobId, prompt);
        const next = reduceEvent(prev, event);
        if (
          next.status === "completed" ||
          next.status === "failed" ||
          next.status === "cancelled"
        ) {
          closeRef.current?.();
        }
        return { runs: { ...s.runs, [event.jobId]: next } };
      });
    },
    [prompt]
  );

  useEffect(() => {
    if (!jobId) return;

    upsertRun(jobId, initialRunState(jobId, prompt));

    const handle = openJobStream(jobId, {
      onEvent: dispatch,
      onError: (err) => {
        console.warn("SSE stream error", err);
      },
    });

    closeRef.current = handle.close;

    return () => {
      handle.close();
      closeRef.current = null;
    };
  }, [jobId, prompt, dispatch, upsertRun]);

  const run = useStreamStore((s) => (jobId ? s.runs[jobId] ?? null : null));

  const cancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await fetch(`/api/run/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" });
    } catch (e) {
      console.error("Failed to cancel run", e);
    }
    clearRun(jobId);
  }, [jobId, clearRun]);

  return { run, cancel };
}