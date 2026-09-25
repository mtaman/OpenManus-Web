import { create } from "zustand";

export interface AgentStep {
  id: string;
  step_number: number;
  type: "thought" | "tool_call" | "observation" | "plan";
  content: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  steps?: AgentStep[];
  jobId?: string;
  status?: "pending" | "running" | "completed" | "failed";
}

interface ChatState {
  messages: ChatMessage[];
  currentJobId: string | null;
  isRunning: boolean;
  activeSteps: AgentStep[];
  addMessage: (message: ChatMessage) => void;
  updateMessageStatus: (id: string, status: ChatMessage["status"]) => void;
  appendStep: (step: AgentStep) => void;
  clearActiveSteps: () => void;
  setCurrentJobId: (jobId: string | null) => void;
  setIsRunning: (isRunning: boolean) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  currentJobId: null,
  isRunning: false,
  activeSteps: [],

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessageStatus: (id, status) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, status } : msg
      ),
    })),

  appendStep: (step) =>
    set((state) => ({ activeSteps: [...state.activeSteps, step] })),

  clearActiveSteps: () => set({ activeSteps: [] }),

  setCurrentJobId: (jobId) => set({ currentJobId: jobId }),

  setIsRunning: (isRunning) => set({ isRunning }),

  resetChat: () =>
    set({
      messages: [],
      currentJobId: null,
      isRunning: false,
      activeSteps: [],
    }),
}));