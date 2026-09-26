import { RunState, SSEEnvelope, StepGroup, ToolPair } from "./types";

export const initialRunState = (jobId: string, prompt: string): RunState => ({
  jobId,
  prompt,
  status: "pending",
  startedAt: Date.now(),
  steps: [],
  finalAnswer: null,
  error: null,
  lastEventAt: Date.now(),
  droppedEvents: 0,
});

function upsertGroup(
  steps: StepGroup[],
  stepNum: number,
  updater: (group: StepGroup) => StepGroup
): StepGroup[] {
  const index = steps.findIndex((g) => g.step === stepNum);
  if (index === -1) {
    const newGroup: StepGroup = {
      step: stepNum,
      startedAt: Date.now(),
      finishedAt: null,
      durationMs: null,
      items: [],
    };
    return [...steps, updater(newGroup)];
  }
  const next = [...steps];
  next[index] = updater(next[index]);
  return next;
}

function patchTool(
  steps: StepGroup[],
  stepNum: number,
  toolCallId: string | undefined,
  updater: (t: ToolPair) => ToolPair
): StepGroup[] {
  return steps.map((g) => {
    if (g.step !== stepNum) return g;
    let patched = false;
    const items = g.items.map((item) => {
      if (item.kind === "tool" && (!toolCallId || item.id === toolCallId) && !patched) {
        patched = true;
        return updater(item);
      }
      return item;
    });
    return { ...g, items };
  });
}

export function reduceEvent(state: RunState, event: SSEEnvelope): RunState {
  const now = Date.now();
  const base = { ...state, lastEventAt: now };

  switch (event.type) {
    case "step_start":
      return {
        ...base,
        status: "running",
        steps: upsertGroup(state.steps, event.step, (g) => ({ ...g, startedAt: now })),
      };

    case "thought":
      return {
        ...base,
        steps: upsertGroup(state.steps, event.step, (g) => ({
          ...g,
          items: [
            ...g.items,
            {
              kind: "thought",
              id: `th_${event.step}_${g.items.length}`,
              text: event.data.thought ?? "",
              at: now,
            },
          ],
        })),
      };

    case "tool_call":
      return {
        ...base,
        steps: upsertGroup(state.steps, event.step, (g) => ({
          ...g,
          items: [
            ...g.items,
            {
              kind: "tool",
              id: event.data.toolCallId || `tc_${event.step}_${g.items.length}`,
              tool: event.data.tool || "unknown_tool",
              args: event.data.arguments ?? {},
              startedAt: now,
              output: null,
              durationMs: null,
            } satisfies ToolPair,
          ],
        })),
      };

    case "observation":
      return {
        ...base,
        steps: patchTool(state.steps, event.step, event.data.toolCallId, (t) => ({
          ...t,
          output: event.data.output ?? "",
          durationMs: now - t.startedAt,
        })),
      };

    case "step_end":
      return {
        ...base,
        steps: upsertGroup(state.steps, event.step, (g) => ({
          ...g,
          finishedAt: now,
          durationMs: event.data.durationMs ?? (g.startedAt ? now - g.startedAt : null),
        })),
      };

    case "final":
      return {
        ...base,
        status: "completed",
        finalAnswer: event.data.result ?? "",
      };

    case "error":
      return {
        ...base,
        status: event.data.code === "cancelled" ? "cancelled" : "failed",
        error: event.data.message ?? "Execution failed",
      };

    case "status":
      return {
        ...base,
        status: (event.data.state as any) ?? state.status,
      };

    default:
      return { ...base, droppedEvents: state.droppedEvents + 1 };
  }
}