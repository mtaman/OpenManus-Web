"use client";

import React, { useState } from "react";
import { Terminal, ChevronRight, ChevronDown, Clock, CheckCircle2 } from "lucide-react";
import { ToolPair } from "@/lib/types";

export function ToolCallCard({ tool }: { tool: ToolPair }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-1.5 rounded-lg border border-border bg-card/60 text-xs overflow-hidden shadow-peldrun-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors cursor-pointer select-none font-mono"
      >
        <div className="flex items-center gap-2 truncate">
          <Terminal size={13} className="text-primary flex-shrink-0" />
          <span className="font-semibold text-[11px] text-foreground">{tool.tool}</span>
          {!isOpen && tool.output && (
            <span className="inline-flex items-center gap-1 text-[10px] text-peldrun-success truncate max-w-xs font-sans">
              <CheckCircle2 size={11} />
              <span>executed</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
          {tool.durationMs !== null && tool.durationMs !== undefined && (
            <span className="flex items-center gap-1 text-[10px] font-mono">
              <Clock size={11} />
              {tool.durationMs}ms
            </span>
          )}
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 space-y-2 border-t border-border/60 bg-background/60">
          {tool.args && Object.keys(tool.args).length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Parameters</div>
              <pre className="p-2 rounded-md bg-muted/50 border border-border/50 text-foreground font-mono text-[10px] overflow-x-auto max-h-48">
                {JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}

          {tool.output !== null && tool.output !== undefined && (
            <div>
              <div className="text-[9px] font-mono text-peldrun-success uppercase mb-1">Result</div>
              <pre className="p-2 rounded-md bg-muted/40 border border-border/50 text-foreground font-mono text-[10px] whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-56">
                {tool.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolCallCard;
