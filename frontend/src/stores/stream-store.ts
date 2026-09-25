import { create } from "zustand";
import { RunState } from "@/lib/types";

interface StreamStore {
  runs: Record<string, RunState>;
  upsertRun: (jobId: string, state: RunState) => void;
  clearRun: (jobId: string) => void;
}

export const useStreamStore = create<StreamStore>((set) => ({
  runs: {},
  upsertRun: (jobId, state) =>
    set((s) => ({
      runs: { ...s.runs, [jobId]: state },
    })),
  clearRun: (jobId) =>
    set((s) => {
      const next = { ...s.runs };
      delete next[jobId];
      return { runs: next };
    }),
}));