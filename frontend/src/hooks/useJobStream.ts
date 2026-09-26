"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Step } from "@/lib/types";

export function useJobStream(jobId: string | null) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    if (!jobId) {
      setSteps([]);
      setIsStreaming(false);
      return;
    }

    stopStream();
    setSteps([]);
    setError(null);
    setIsStreaming(true);

    const sseUrl = `/api/run/stream/events?job_id=${encodeURIComponent(jobId)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        if (!event.data) return;
        const payload = JSON.parse(event.data);

        if (payload.type === "ping") return;

        let contentStr = "";
        if (typeof payload.data === "string") {
          contentStr = payload.data;
        } else if (payload.data && typeof payload.data === "object") {
          contentStr = payload.data.thought || payload.data.content || payload.data.result || JSON.stringify(payload.data, null, 2);
        } else {
          contentStr = JSON.stringify(payload, null, 2);
        }

        const newStep: Step = {
          id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          step_number: payload.step || steps.length + 1,
          type: (payload.type || "agent_step").toUpperCase(),
          content: contentStr,
          timestamp: new Date().toISOString(),
        };

        setSteps((prev) => [...prev, newStep]);

        if (payload.type === "finish" || payload.type === "complete" || payload.status === "completed") {
          stopStream();
        }
      } catch {
        setSteps((prev) => [
          ...prev,
          {
            id: `step_${Date.now()}`,
            step_number: prev.length + 1,
            type: "LOG",
            content: event.data,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    };

    es.onerror = () => {
      stopStream();
    };

    return () => {
      stopStream();
    };
  }, [jobId, stopStream]);

  return { steps, isStreaming, error, stopStream };
}