"use client";

import React from "react";
import { FileText, ExternalLink, Activity, Check, Copy } from "lucide-react";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

interface ChatDeliverableProps {
  finalResult: string;
  status: "completed" | "failed";
  turnIndex?: number;
  isTurnRawTrace: boolean;
  lastThoughtContent?: string;
  producedFiles?: { name: string; path: string }[];
  onSelectFile: (fileName: string) => void;
  copiedSection: string | null;
  onCopy: (text: string, identifier: string) => void;
  execMode?: "agent" | "chat";
  showRawTrace: boolean;
  setShowRawTrace: (show: boolean) => void;
}

export function ChatDeliverable({
  finalResult,
  status,
  turnIndex,
  isTurnRawTrace,
  lastThoughtContent,
  producedFiles = [],
  onSelectFile,
  copiedSection,
  onCopy,
  execMode = "agent",
  showRawTrace,
  setShowRawTrace,
}: ChatDeliverableProps) {
  const copyId = typeof turnIndex === "number" ? `turn-res-${turnIndex}` : "final-result";
  const title =
    status === "failed"
      ? "EXECUTION STATUS"
      : typeof turnIndex === "number"
      ? `DELIVERABLE COMPLETED #${turnIndex + 1}`
      : execMode === "chat"
      ? "RESPONSE"
      : "TASK DELIVERABLE COMPLETED";

  return (
    <div className="p-4 rounded-sm bg-manus-success/10 border border-manus-success/30 text-xs space-y-3 shadow-manus-xs font-sans">
      <div className="flex items-center justify-between">
        <span className="text-manus-success font-semibold tracking-wide text-xs">
          {title}
        </span>
        <button
          type="button"
          onClick={() => onCopy(finalResult, copyId)}
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md hover:bg-background text-foreground cursor-pointer transition-all border border-border/40"
        >
          {copiedSection === copyId ? (
            <>
              <Check size={12} className="text-manus-success" />
              <span className="text-manus-success">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy Result</span>
            </>
          )}
        </button>
      </div>

      {isTurnRawTrace ? (
        <div className="space-y-3">
          {lastThoughtContent ? (
            <div className="bg-background/60 p-3 rounded-lg border border-border/50 text-foreground leading-relaxed">
              <MarkdownRenderer content={lastThoughtContent} />
            </div>
          ) : (
            <p className="text-foreground/90 font-medium">
              Autonomous execution completed successfully. All artifacts and output files are prepared below.
            </p>
          )}

          <div className="border border-border/60 rounded-lg overflow-hidden bg-background/40">
            <button
              type="button"
              onClick={() => setShowRawTrace(!showRawTrace)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-muted-foreground hover:text-foreground text-[11px] font-mono cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Activity size={12} />
                <span>Execution Trace & Observations</span>
              </span>
              <span>{showRawTrace ? "Hide trace" : "View diagnostic trace"}</span>
            </button>
            {showRawTrace && (
              <div className="p-2.5 border-t border-border/40 font-mono text-[11px] text-muted-foreground bg-muted/30 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {finalResult}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-foreground leading-relaxed">
          <MarkdownRenderer content={finalResult} />
        </div>
      )}

      {producedFiles && producedFiles.length > 0 && (
        <div className="pt-2.5 border-t border-manus-success/20">
          <span className="text-[11px] font-semibold text-foreground block mb-1.5">
            Generated Files:
          </span>
          <div className="flex flex-wrap gap-2">
            {producedFiles.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => onSelectFile(f.name)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card hover:bg-muted text-foreground border border-border text-xs cursor-pointer shadow-manus-xs transition-all"
              >
                <FileText size={12} className="text-manus-accent" />
                <span>{f.name}</span>
                <ExternalLink size={10} className="opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatDeliverable;
