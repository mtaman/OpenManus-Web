import { create } from "zustand";
import { fetchChats, ChatSession, deleteAllChats } from "@/lib/chatsApi";

export interface AgentStep {
  id: string;
  step_number: number;
  type: "thought" | "tool_call" | "observation" | "plan";
  content: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  status?: "pending" | "running" | "completed" | "failed";
}

interface ChatState {
  messages: ChatMessage[];
  currentJobId: string | null;
  isRunning: boolean;
  activeSteps: AgentStep[];
  sessions: ChatSession[];
  loadSessions: () => Promise<void>;
  loadSessionDetail: (chatId: string) => Promise<void>;
  clearAllSessions: () => Promise<void>;
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
  sessions: [],

  loadSessions: async () => {
    try {
      const chats = await fetchChats();
      set({ sessions: chats });
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  },

  loadSessionDetail: async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      let chat = null;
      if (res.ok) {
        const data = await res.json();
        chat = data.chat;
      } else {
        const chats = await fetchChats();
        chat = chats.find((c: any) => c.job_id === chatId || c.id === chatId);
      }

      if (chat) {
        set({
          currentJobId: chat.job_id || null,
          messages: [
            {
              id: chat.id || "msg_1",
              role: "user",
              content: chat.prompt || chat.title,
              timestamp: chat.created_at || new Date().toISOString(),
              status: chat.status === "completed" ? "completed" : "running"
            }
          ],
          activeSteps: (chat.events || []).map((ev: any, idx: number) => ({
            id: `step_${idx}`,
            step_number: idx + 1,
            type: ev.type || "thought",
            content: typeof ev.data === "string" ? ev.data : (ev.data?.content || JSON.stringify(ev.data)),
            timestamp: new Date().toISOString()
          }))
        });
      }
    } catch (err) {
      console.error("Failed to load session detail:", err);
    }
  },

  clearAllSessions: async () => {
    await deleteAllChats();
    set({ sessions: [], messages: [], currentJobId: null, activeSteps: [] });
  },

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessageStatus: (id, status) => set((state) => ({
    messages: state.messages.map((msg) => msg.id === id ? { ...msg, status } : msg)
  })),
  appendStep: (step) => set((state) => ({ activeSteps: [...state.activeSteps, step] })),
  clearActiveSteps: () => set({ activeSteps: [] }),
  setCurrentJobId: (jobId) => set({ currentJobId: jobId }),
  setIsRunning: (isRunning) => set({ isRunning }),
  resetChat: () => set({ messages: [], currentJobId: null, isRunning: false, activeSteps: [] }),
}));
