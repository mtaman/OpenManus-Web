"use client";

import React from "react";
import { Terminal } from "lucide-react";

export function LogsTab() {
  return (
    <div className="flex flex-col h-full bg-[var(--color-void)] text-xs font-mono">
      <div className="px-3 py-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] flex items-center gap-2">
        <Terminal size={14} className="text-[var(--color-ink-muted)]" />
        <span className="text-[10px] uppercase font-semibold text-[var(--color-ink-muted)]">Raw SSE Stream Tail</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-[11px] text-[var(--color-ink-muted)] space-y-1">
        <div className="text-[var(--color-ink-faint)]">[system] Stream listener attached to active job queue.</div>
        <div className="text-cyan-400/80 font-mono">
          [event:status] {JSON.stringify({ state: "ready", source: "omweb" })}
        </div>
      </div>
    </div>
  );
}