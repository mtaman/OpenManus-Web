"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, BrainCircuit } from "lucide-react";

interface ThoughtCardProps {
  thought: string;
  isStreaming?: boolean;
}

export function ThoughtCard({ thought, isStreaming }: ThoughtCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!thought && !isStreaming) return null;

  return (
    <div className="my-1.5 rounded-lg border border-border bg-card/60 text-xs overflow-hidden shadow-manus-xs transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer select-none font-sans"
      >
        <div className="flex items-center gap-2 truncate">
          <BrainCircuit size={14} className="text-manus-accent flex-shrink-0" />
          <span className="text-xs font-medium text-foreground">Agent Reasoning</span>
          {!isOpen && thought && (
            <span className="text-[11px] text-muted-foreground truncate max-w-sm">
              — {thought.slice(0, 60).replace(/\n/g, " ")}...
            </span>
          )}
          {isStreaming && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-manus-accent animate-pulse flex-shrink-0" />
          )}
        </div>
        <div className="text-muted-foreground pl-2">
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 py-2.5 border-t border-border/60 text-foreground font-sans text-xs whitespace-pre-wrap leading-relaxed bg-background/50">
          {thought || <span className="italic text-muted-foreground">Thinking...</span>}
        </div>
      )}
    </div>
  );
}

export default ThoughtCard;
