export type ServerEventName =
  | "status"
  | "step_start"
  | "thought"
  | "tool_call"
  | "observation"
  | "step_end"
  | "final"
  | "error";

export type RunStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type ExecutionMode = "agent" | "chat";

export interface ToolPair {
  kind: "tool";
  id: string;
  tool: string;
  args: Record<string, unknown>;
  startedAt: number;
  output: string | null;
  durationMs: number | null;
}

export interface ThoughtItem {
  kind: "thought";
  id: string;
  text: string;
  at: number;
}

export type StepItem = ThoughtItem | ToolPair;

export interface StepGroup {
  step: number;
  startedAt: number | null;
  finishedAt: number | null;
  durationMs: number | null;
  items: StepItem[];
}

export interface RunState {
  jobId: string;
  prompt: string;
  status: RunStatus;
  startedAt: number;
  steps: StepGroup[];
  finalAnswer: string | null;
  error: string | null;
  lastEventAt: number;
  droppedEvents: number;
  mode?: ExecutionMode;
}

export interface SSEEnvelope {
  jobId: string;
  type: ServerEventName;
  step: number;
  data: Record<string, any>;
  mode?: ExecutionMode;
}

export interface Step {
  id: string;
  step_number: number;
  type: string;
  content: string;
  timestamp: string;
}
