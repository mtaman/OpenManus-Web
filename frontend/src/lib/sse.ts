import { SSEEnvelope } from "./types";

export interface StreamHandlers {
  onEvent: (event: SSEEnvelope) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
}

export function openJobStream(jobId: string, handlers: StreamHandlers): { close: () => void } {
  const url = `/api/run/jobs/${encodeURIComponent(jobId)}/stream`;
  const eventSource = new EventSource(url);

  eventSource.onopen = () => {
    handlers.onOpen?.();
  };

  const eventTypes = [
    "status",
    "step_start",
    "thought",
    "tool_call",
    "observation",
    "step_end",
    "final",
    "error",
  ];

  eventTypes.forEach((type) => {
    eventSource.addEventListener(type, (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        handlers.onEvent({
          jobId,
          type: type as any,
          step: parsed.step ?? 0,
          data: parsed.data ?? parsed,
        });
      } catch (err) {
        console.error("Failed to parse SSE payload", err);
      }
    });
  });

  eventSource.onerror = (err) => {
    handlers.onError?.(new Error("SSE connection interrupted"));
  };

  return {
    close: () => {
      eventSource.close();
    },
  };
}