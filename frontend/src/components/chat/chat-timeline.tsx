"use client";

import React from "react";
import { BrainCircuit, Wrench, Terminal, ChevronDown, ChevronRight } from "lucide-react";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

export interface StepEvent {
  id: string;
  step: number;
  type: "thought" | "tool_call" | "observation" | "error" | "final" | "ask_human";
  content: string;
  toolName?: string;
  timestamp?: string;
}

interface ChatTimelineProps {
  prefix: string;
  groupedSteps: Record<number, StepEvent[]>;
  isCurrentActive?: boolean;
  currentStepNum: number;
  isRunning: boolean;
  expandedSteps: Record<string, boolean>;
  toggleStep: (key: string) => void;
}

export function ChatTimeline({
  prefix,
  groupedSteps,
  isCurrentActive = false,
  currentStepNum,
  isRunning,
  expandedSteps,
  toggleStep,
}: ChatTimelineProps) {
  const entries = Object.entries(groupedSteps);
  if (entries.length === 0) return null;

  return (
    <div className="relative pl-5 ml-3 border-l-2 border-border/70 space-y-4 my-3 font-sans">
      {entries.map(([stepNumStr, stepEvents]) => {
        const stepNum = parseInt(stepNumStr, 10);
        const key = `${prefix}-${stepNum}`;
        const isExpanded = expandedSteps[key] === true;
        const isLatestStep = isCurrentActive && stepNum === currentStepNum && isRunning;
        const toolsUsed = Array.from(new Set(stepEvents.filter((e) => e.toolName).map((e) => e.toolName)));

        return (
          <div key={key} className="relative group">
            {/* Stepper Node Icon */}
            <div
              className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-background flex items-center justify-center transition-all ${
                isLatestStep
                  ? "border-primary ring-2 ring-primary/40 scale-110"
                  : "border-emerald-500/80"
              }`}
            >
              {isLatestStep ? (
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </div>

            {/* Step Header */}
            <div className="flex items-center justify-between py-1 px-2.5 -ml-1 rounded-md hover:bg-muted/40 transition-colors">
              <button
                type="button"
                onClick={() => toggleStep(key)}
                className="flex-1 flex items-center gap-2 text-left cursor-pointer"
              >
                <span className="text-xs font-semibold text-foreground">
                  Step {stepNum}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                  {stepEvents.length} events
                </span>
                {toolsUsed.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground truncate max-w-[240px]">
                    • {toolsUsed.join(", ")}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleStep(key)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors ml-2"
              >
                <span>{isExpanded ? "Collapse" : "View reasoning"}</span>
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            </div>

            {/* Expanded Step Events */}
            {isExpanded && (
              <div className="mt-2.5 space-y-2 pl-1.5 pr-1 animate-in fade-in">
                {stepEvents.map((evt) => (
                  <div key={evt.id} className="text-xs space-y-1">
                    {evt.type === "thought" && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-card border border-border/80 text-foreground shadow-manus-xs">
                        <BrainCircuit size={15} className="text-manus-accent mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <MarkdownRenderer content={evt.content} />
                        </div>
                      </div>
                    )}

                    {evt.type === "tool_call" && evt.toolName && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/80 border border-border text-foreground font-mono text-xs">
                        <Wrench size={13} className="text-manus-info mt-0.5 flex-shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-primary mr-1">{evt.toolName}:</span>
                          <span>{evt.content}</span>
                        </div>
                      </div>
                    )}

                    {evt.type === "observation" && (
                      <div className="p-2.5 text-xs font-mono text-foreground/90 bg-muted/60 rounded-lg border border-border flex items-start gap-2">
                        <Terminal size={13} className="mt-0.5 flex-shrink-0 text-manus-success" />
                        <div className="flex-1 min-w-0 overflow-x-auto">
                          <MarkdownRenderer content={evt.content} />
                        </div>
                      </div>
                    )}

                    {evt.type === "error" && (
                      <div className="p-2.5 text-xs text-manus-error bg-manus-error/10 rounded-lg border border-manus-error/20 flex items-start gap-2">
                        <span className="whitespace-pre-wrap">{evt.content}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ChatTimeline;
