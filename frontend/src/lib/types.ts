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
}

export interface SSEEnvelope {
  jobId: string;
  type: ServerEventName;
  step: number;
  data: Record<string, any>;
}

// ==========================================
// Sovereign Store & Agent Manifest Contracts
// ==========================================
export interface AgentManifest {
  id: string;
  name: string;
  role?: string;
  icon?: string;
  description?: string;
  system_prompt: string;
  tools: string[];
  max_steps: number;
  is_builtin?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  safety_level: string;
  parameters?: Record<string, string>;
}

export interface ExtensionDefinition {
  id: string;
  name: string;
  type: string;
  status: string;
  command?: string;
  description: string;
}

export interface AgentUpsertPayload {
  name: string;
  role?: string;
  icon?: string;
  description?: string;
  system_prompt: string;
  tools: string[];
  max_steps?: number;
}
