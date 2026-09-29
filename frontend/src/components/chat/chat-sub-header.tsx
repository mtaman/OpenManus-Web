"use client";

import React from "react";
import { Plus, History, Coins, Square, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EngineSelector } from "./engine-selector";

interface ChatSubHeaderProps {
  isFreshSession: boolean;
  submittedPrompt: string;
  activeChatId: string | null;
  activeJobId: string | null;
  historyTurnsCount: number;
  status: "idle" | "running" | "completed" | "failed";
  tokensUsed: { input: number; output: number; total: number };
  currentStepNum: number;
  execMode: "agent" | "chat";
  onNewSession: () => void;
  onStopTask: () => void;
  showRightPanel: boolean;
  onToggleRightPanel: () => void;
}

export function ChatSubHeader({
  isFreshSession,
  submittedPrompt,
  activeChatId,
  activeJobId,
  historyTurnsCount,
  status,
  tokensUsed,
  currentStepNum,
  execMode,
  onNewSession,
  onStopTask,
  showRightPanel,
  onToggleRightPanel,
}: ChatSubHeaderProps) {
  return (
    <div className="h-12 flex items-center justify-between px-5  border-border bg-[#ffffff]/1 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-2.5">
        {isFreshSession ? (
          <EngineSelector />
        ) : (
          <button
            type="button"
            onClick={onNewSession}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted text-foreground transition-all shadow-manus-xs cursor-pointer"
            title="Start a fresh autonomous session"
          >
            <Plus size={13} />
            <span>New Session</span>
          </button>
        )}

        <span className="text-xs font-medium text-foreground truncate max-w-[140px] sm:max-w-xs">
          {submittedPrompt ? submittedPrompt : (activeChatId ? `Chat ${activeChatId}` : (activeJobId ? `Session ${activeJobId}` : " "))}
        </span>

        {historyTurnsCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-muted border border-border text-muted-foreground">
            <History size={10} />
            <span>Turn {historyTurnsCount + 1}</span>
          </span>
        )}

        {status === "running" && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-manus-warning/15 text-manus-warning border border-manus-warning/30">
            <span className="w-1.5 h-1.5 rounded-full bg-manus-warning animate-pulse" />
            <span>RUNNING</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {tokensUsed.total > 0 && (
          <span className="hidden md:flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted border border-border text-muted-foreground">
            <Coins size={11} />
            <span>{tokensUsed.total.toLocaleString()} tokens</span>
          </span>
        )}

        {currentStepNum > 0 && execMode === "agent" && (
          <span className="text-xs font-mono text-foreground font-semibold px-2 py-0.5 bg-muted rounded-md border border-border/60">
            Step {currentStepNum} / 20
          </span>
        )}

        {status === "running" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onStopTask}
            className="h-7 px-2.5 text-xs font-sans rounded-md cursor-pointer"
          >
            <Square size={11} className="fill-current mr-1" />
            <span>Stop</span>
          </Button>
        )}

        <button
          type="button"
          onClick={onToggleRightPanel}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
          title={showRightPanel ? "Hide Right Workspace Panel" : "Show Right Workspace Panel"}
        >
          {showRightPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>
    </div>
  );
}

export default ChatSubHeader;
