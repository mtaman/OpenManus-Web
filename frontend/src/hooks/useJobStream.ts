"use client";

import { useEffect, useRef } from "react";
import { useChatStore, AgentStep } from "@/stores/chat-store";

export function useJobStream(jobId: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const appendStep = useChatStore((state) => state.appendStep);
  const setIsRunning = useChatStore((state) => state.setIsRunning);
  const updateMessageStatus = useChatStore((state) => state.updateMessageStatus);

  useEffect(() => {
    if (!jobId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    setIsRunning(true);
    const es = new EventSource(`/api/run/jobs/${encodeURIComponent(jobId)}/stream`);
    eventSourceRef.current = es;

    es.addEventListener("thought", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const step: AgentStep = {
          id: `thought-${Date.now()}-${Math.random()}`,
          step_number: payload.step || 0,
          type: "thought",
          content: payload.content || "",
          timestamp: payload.timestamp || new Date().toISOString(),
        };
        appendStep(step);
      } catch {
        // Ignore parse error on partial stream
      }
    });

    es.addEventListener("tool_call", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const step: AgentStep = {
          id: `tool-${Date.now()}-${Math.random()}`,
          step_number: payload.step || 0,
          type: "tool_call",
          content: `Invoking tool: ${payload.tool_name || "unknown"}`,
          tool_name: payload.tool_name,
          tool_args: payload.arguments || {},
          timestamp: payload.timestamp || new Date().toISOString(),
        };
        appendStep(step);
      } catch {
        // Ignore parse error
      }
    });

    es.addEventListener("observation", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const step: AgentStep = {
          id: `obs-${Date.now()}-${Math.random()}`,
          step_number: payload.step || 0,
          type: "observation",
          content: typeof payload.output === "string" ? payload.output : JSON.stringify(payload.output, null, 2),
          tool_name: payload.tool_name,
          timestamp: payload.timestamp || new Date().toISOString(),
        };
        appendStep(step);
      } catch {
        // Ignore parse error
      }
    });

    es.addEventListener("done", () => {
      setIsRunning(false);
      updateMessageStatus(jobId, "completed");
      es.close();
      eventSourceRef.current = null;
    });

    es.addEventListener("error", () => {
      setIsRunning(false);
      updateMessageStatus(jobId, "failed");
      es.close();
      eventSourceRef.current = null;
    });

    return () => {
      if (es) {
        es.close();
      }
    };
  }, [jobId, appendStep, setIsRunning, updateMessageStatus]);
}