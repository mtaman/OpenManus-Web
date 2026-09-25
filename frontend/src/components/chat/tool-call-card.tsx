"use client";

import React, { useState } from "react";
import { Terminal, ChevronRight, ChevronDown, Clock } from "lucide-react";
import { ToolPair } from "@/lib/types";

export function ToolCallCard({ tool }: { tool: ToolPair }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] text-xs overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]/50 transition-colors cursor-pointer select-none font-mono"
      >
        <div className="flex items-center gap-2 text-[var(--color-code-ink)] truncate">
          <Terminal size={13} className="flex-shrink-0" />
          <span className="font-semibold text-[11px]">{tool.tool}</span>
          {!isOpen && tool.output && (
            <span className="text-[10px] text-emerald-400/80 truncate max-w-xs font-sans">
              ✓ output ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-[var(--color-ink-muted)] flex-shrink-0">
          {tool.durationMs !== null && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-ink-faint)]">
              <Clock size={11} />
              {tool.durationMs}ms
            </span>
          )}
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 space-y-2 border-t border-[var(--color-line)] bg-[var(--color-void)]/40">
          {tool.args && Object.keys(tool.args).length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-[var(--color-ink-faint)] uppercase mb-1">Parameters</div>
              <pre className="p-2 rounded bg-[var(--color-void)] border border-[var(--color-line-subtle)] text-[var(--color-ink)] font-mono text-[10px] overflow-x-auto">
                {JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}

          {tool.output !== null && (
            <div>
              <div className="text-[9px] font-mono text-[var(--color-observation)] uppercase mb-1">Result</div>
              <pre className="p-2 rounded bg-[var(--color-observation-bg)] border border-emerald-500/20 text-[var(--color-observation)] font-mono text-[10px] whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-56">
                {tool.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}