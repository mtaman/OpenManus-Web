"use client";

import React from "react";
import { Terminal } from "lucide-react";

export function LogsTab() {
  return (
    <div className="flex flex-col h-full bg-background text-xs font-mono">
      <div className="px-3 py-2 border-b border-border bg-card/40 flex items-center gap-2">
        <Terminal size={14} className="text-muted-foreground" />
        <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider">
          Raw SSE Stream Tail
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-xs text-muted-foreground space-y-1.5 font-mono">
        <div className="text-muted-foreground/60">[system] Stream listener attached to active job queue.</div>
        <div className="text-manus-info font-mono">
          [event:status] {JSON.stringify({ state: "ready", source: "manus-agent" })}
        </div>
      </div>
    </div>
  );
}

export default LogsTab;
