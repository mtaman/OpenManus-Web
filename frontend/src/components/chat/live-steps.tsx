"use client";

import React, { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  BrainCircuit, 
  Eye, 
  CheckCircle2, 
  Clock 
} from "lucide-react";
import { AgentStep } from "@/stores/chat-store";

interface LiveStepsProps {
  steps: AgentStep[];
  isRunning?: boolean;
}

export function LiveSteps({ steps, isRunning }: LiveStepsProps) {
  const [expanded, setExpanded] = useState<boolean>(true);

  if (!steps || steps.length === 0) {
    return null;
  }

  const getStepIcon = (type: AgentStep["type"]) => {
    switch (type) {
      case "thought":
        return <BrainCircuit className="h-4 w-4 text-purple-400 shrink-0" />;
      case "tool_call":
        return <Terminal className="h-4 w-4 text-amber-400 shrink-0" />;
      case "observation":
        return <Eye className="h-4 w-4 text-blue-400 shrink-0" />;
      case "plan":
        return <Clock className="h-4 w-4 text-emerald-400 shrink-0" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden my-3 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-xs font-medium text-foreground select-none"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 rtl:rotate-180 text-muted-foreground" />
          )}
          <span>Execution Steps ({steps.length})</span>
          {isRunning && (
            <span className="flex h-2 w-2 relative ms-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          {isRunning ? "Running..." : "Completed"}
        </span>
      </button>

      {expanded && (
        <div className="divide-y divide-border/60 max-h-96 overflow-y-auto p-2 space-y-2">
          {steps.map((step, idx) => (
            <div key={step.id || idx} className="pt-2 text-xs">
              <div className="flex items-center gap-2 px-2 py-1 text-muted-foreground font-mono text-[11px]">
                {getStepIcon(step.type)}
                <span className="uppercase font-semibold tracking-wider text-[10px]">
                  {step.type}
                </span>
                {step.tool_name && (
                  <span className="text-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                    {step.tool_name}
                  </span>
                )}
                <span className="ms-auto text-[10px] opacity-70">
                  {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : ""}
                </span>
              </div>

              <div className="px-3 py-2 text-foreground font-mono text-xs bg-muted/20 rounded-md mt-1 whitespace-pre-wrap break-words border border-border/30">
                {step.content}
              </div>

              {step.tool_args && Object.keys(step.tool_args).length > 0 && (
                <div className="mt-1 px-3 py-1.5 bg-background/50 rounded text-[11px] font-mono text-muted-foreground border border-border/20">
                  <span className="font-semibold text-foreground/80">Arguments: </span>
                  <pre className="inline whitespace-pre-wrap">
                    {JSON.stringify(step.tool_args, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}