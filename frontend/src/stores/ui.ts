"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage } from "@/lib/storage";
import { zustandStorage } from "@/lib/storage/zustand";

export type WorkspaceTabId = "preview" | "files" | "artifacts" | "logs" | "editor";

interface UIState {
  isWorkspaceOpen: boolean;
  activeWorkspaceTab: WorkspaceTabId;
  setWorkspaceOpen: (open: boolean) => void;
  setActiveWorkspaceTab: (tab: WorkspaceTabId) => void;
  openArtifacts: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isWorkspaceOpen: false,
      activeWorkspaceTab: "preview",
      setWorkspaceOpen: (open: boolean) => {
        set({ isWorkspaceOpen: open });
        // Synchronize with cookie-tier storage to prevent layout shift
        storage.set("right_panel_open", open);
      },
      setActiveWorkspaceTab: (tab: WorkspaceTabId) => set({ activeWorkspaceTab: tab }),
      openArtifacts: () => {
        set({ isWorkspaceOpen: true, activeWorkspaceTab: "artifacts" });
        storage.set("right_panel_open", true);
      },
    }),
    {
      name: "omweb_ui_store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        isWorkspaceOpen: state.isWorkspaceOpen,
        activeWorkspaceTab: state.activeWorkspaceTab,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== "undefined") {
          // Sync server cookie value if present
          const panelCookie = storage.get("right_panel_open");
          if (typeof panelCookie === "boolean") {
            state.isWorkspaceOpen = panelCookie;
          }
        }
      },
    }
  )
);