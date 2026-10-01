"use client";

import { create } from "zustand";
import { fetchChats, ChatSession, deleteAllChats } from "@/lib/chatsApi";
import { AgentManifest } from "@/lib/types";
import { storage } from "@/lib/storage";

export interface AgentStep {
  id: string;
  step_number: number;
  type: "thought" | "tool_call" | "observation" | "plan";
  content: string;
  timestamp: string;
  tool_name?: string;
  tool_args?: Record<string, any>;
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
  selectedAgentId: string;
  availableAgents: AgentManifest[];
  activeSteps: AgentStep[];
  sessions: ChatSession[];
  setSelectedAgentId: (agentId: string) => void;
  setAvailableAgents: (agents: AgentManifest[]) => void;
  getAgentMaxSteps: (id?: string) => number;
  syncSessionAgentMetadata: (chatData: any) => void;
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

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentJobId: null,
  isRunning: false,
  selectedAgentId: "manus",
  availableAgents: [],
  activeSteps: [],
  sessions: [],

  setSelectedAgentId: (agentId: string) => set({ selectedAgentId: agentId || "manus" }),
  setAvailableAgents: (agents: AgentManifest[]) => set({ availableAgents: agents }),

  syncSessionAgentMetadata: (chatData: any) => {
    if (!chatData) return;
    const agentId = chatData.agent_id || "manus";
    const mode = (chatData.mode === "chat" || chatData.mode === "agent") ? chatData.mode : "agent";
    
    set({ selectedAgentId: agentId });
    
    // Safely write to unified multi-tier storage engine
    storage.set("exec_mode", mode);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("omweb:mode-change", { detail: mode }));
    }
  },

  getAgentMaxSteps: (id?: string) => {
    const targetId = id || get().selectedAgentId;
    const found = get().availableAgents.find((a) => a.id === targetId);
    if (found && found.max_steps) return found.max_steps;

    // Built-in manifest boundary matching backend registry
    switch (targetId) {
      case "deep_researcher":
        return 35;
      case "data_scientist":
        return 25;
      case "code_architect":
      case "manus":
      default:
        return 30;
    }
  },

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
          selectedAgentId: chat.agent_id || "manus",
          messages: [
            {
              id: chat.id || "msg_1",
              role: "user",
              content: chat.prompt || chat.title,
              timestamp: chat.created_at || new Date().toISOString(),
              status: chat.status === "completed" ? "completed" : "running",
            },
          ],
          activeSteps: (chat.events || []).map((ev: any, idx: number) => ({
            id: `step_${idx}`,
            step_number: idx + 1,
            type: ev.type || "thought",
            content: typeof ev.data === "string" ? ev.data : (ev.data?.content || JSON.stringify(ev.data)),
            timestamp: new Date().toISOString(),
            tool_name: ev.data?.name || ev.data?.tool_name || ev.tool_name,
            tool_args: ev.data?.arguments || ev.data?.tool_args || ev.tool_args,
          })),
        });
      }
    } catch (err) {
      console.error("Failed to load session detail:", err);
    }
  },

  clearAllSessions: async () => {
    await deleteAllChats();
    set({ sessions: [], messages: [], currentJobId: null, activeSteps: [], selectedAgentId: "manus" });
  },

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessageStatus: (id, status) => set((state) => ({
    messages: state.messages.map((msg) => (msg.id === id ? { ...msg, status } : msg)),
  })),
  appendStep: (step) => set((state) => ({ activeSteps: [...state.activeSteps, step] })),
  clearActiveSteps: () => set({ activeSteps: [] }),
  setCurrentJobId: (jobId) => set({ currentJobId: jobId }),
  setIsRunning: (isRunning) => set({ isRunning }),
  resetChat: () => set({ messages: [], currentJobId: null, isRunning: false, activeSteps: [] }),
}));