"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, Brain } from "lucide-react";

interface ThoughtCardProps {
  thought: string;
  isStreaming?: boolean;
}

export function ThoughtCard({ thought, isStreaming }: ThoughtCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!thought && !isStreaming) return null;

  return (
    <div className="my-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line-subtle)] bg-[var(--color-surface-2)]/50 text-xs overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-3)]/30 transition-colors cursor-pointer select-none font-mono"
      >
        <div className="flex items-center gap-2 truncate">
          <Brain size={13} className="text-[var(--color-thought)] flex-shrink-0" />
          <span className="text-[11px] font-medium text-[var(--color-ink)]">Agent Reasoning</span>
          {!isOpen && thought && (
            <span className="text-[10px] text-[var(--color-ink-faint)] truncate max-w-sm font-sans">
              — {thought.slice(0, 70).replace(/\n/g, " ")}...
            </span>
          )}
          {isStreaming && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-thought)] animate-pulse flex-shrink-0" />
          )}
        </div>
        <div className="text-[var(--color-ink-faint)] pl-2">
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 py-2 border-t border-[var(--color-line-subtle)] text-[var(--color-ink-muted)] font-mono text-[11px] whitespace-pre-wrap leading-relaxed bg-[var(--color-void)]/40">
          {thought || <span className="italic text-[var(--color-ink-faint)]">Thinking...</span>}
        </div>
      )}
    </div>
  );
}