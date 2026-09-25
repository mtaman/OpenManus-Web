export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type StepType =
  | "step_start"
  | "thought"
  | "tool_call"
  | "observation"
  | "step_end"
  | "final_answer"
  | "error";

export interface JobStep {
  step_id: string;
  step_type: StepType;
  timestamp: string;
  content?: string | null;
  data?: Record<string, any> | null;
}

export interface Job {
  id: string;
  prompt: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  steps: JobStep[];
  error_message?: string | null;
  metadata: Record<string, any>;
}

export interface RunRequest {
  prompt: string;
  model_override?: string;
  max_steps?: number;
}