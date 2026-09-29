import { create } from "zustand";

export type WorkspaceTabId = "preview" | "files" | "artifacts" | "logs" | "editor";

interface UIState {
  isWorkspaceOpen: boolean;
  activeWorkspaceTab: WorkspaceTabId;
  setWorkspaceOpen: (open: boolean) => void;
  setActiveWorkspaceTab: (tab: WorkspaceTabId) => void;
  openArtifacts: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isWorkspaceOpen: false,
  activeWorkspaceTab: "preview",
  setWorkspaceOpen: (open) => set({ isWorkspaceOpen: open }),
  setActiveWorkspaceTab: (tab) => set({ activeWorkspaceTab: tab }),
  openArtifacts: () => set({ isWorkspaceOpen: true, activeWorkspaceTab: "artifacts" }),
}));
