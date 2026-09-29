"use client";

import React from "react";
import { User, Copy, Check, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatTimeline, StepEvent } from "./chat-timeline";
import { ChatDeliverable } from "./chat-deliverable";

export interface ChatTurn {
  id: string;
  jobId: string;
  prompt: string;
  timestamp: string;
  steps: StepEvent[];
  finalResult: string | null;
  status: "completed" | "failed";
  tokensUsed?: { input: number; output: number; total: number };
  producedFiles?: { name: string; path: string }[];
}

interface ChatThreadProps {
  historyTurns: ChatTurn[];
  submittedPrompt: string;
  sessionTimestamp: string;
  humanQuery: string | null;
  humanAnswer: string;
  setHumanAnswer: (val: string) => void;
  onSendHumanAnswer: () => void;
  execMode: "agent" | "chat";
  activeGroupedSteps: Record<number, StepEvent[]>;
  currentStepNum: number;
  status: "idle" | "running" | "completed" | "failed";
  elapsedSeconds: number;
  finalResult: string | null;
  producedFiles: { name: string; path: string }[];
  copiedSection: string | null;
  copyText: (text: string, id: string) => void;
  expandedSteps: Record<string, boolean>;
  toggleStep: (key: string) => void;
  onSelectFile: (fileName: string) => void;
  showRawTrace: boolean;
  setShowRawTrace: (val: boolean) => void;
  getLiveStatusMessage: () => string;
  chatScrollBottomRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatThread({
  historyTurns,
  submittedPrompt,
  sessionTimestamp,
  humanQuery,
  humanAnswer,
  setHumanAnswer,
  onSendHumanAnswer,
  execMode,
  activeGroupedSteps,
  currentStepNum,
  status,
  elapsedSeconds,
  finalResult,
  producedFiles,
  copiedSection,
  copyText,
  expandedSteps,
  toggleStep,
  onSelectFile,
  showRawTrace,
  setShowRawTrace,
  getLiveStatusMessage,
  chatScrollBottomRef,
}: ChatThreadProps) {
  const groupStepEvents = (evts: StepEvent[]) => {
    return evts.reduce((acc, s) => {
      const isVisible = (s.content && s.content.trim() !== "") || Boolean(s.toolName);
      if (!isVisible) return acc;
      if (!acc[s.step]) acc[s.step] = [];
      acc[s.step].push(s);
      return acc;
    }, {} as Record<number, StepEvent[]>);
  };

  const isCurrentRawTrace = Boolean(
    finalResult &&
    (finalResult.includes("Observed output of cmd") || finalResult.startsWith("Step 1:"))
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
      <div className="w-full max-w-[1000px] mx-auto space-y-6">
        {/* Historical Completed Turns */}
        {historyTurns.map((turn, tIdx) => {
          const isTurnRawTrace = Boolean(
            turn.finalResult &&
            (turn.finalResult.includes("Observed output of cmd") || turn.finalResult.startsWith("Step 1:"))
          );
          const turnLastThought = [...turn.steps]
            .reverse()
            .find((s) => s.type === "thought" && s.content && !s.content.startsWith("Step "));

          const turnGrouped = groupStepEvents(turn.steps);

          return (
            <div key={turn.id || tIdx} className="space-y-3 pb-4 border-b border-border/40">
              <div className="py-2 px-1 space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <User size={13} className="text-primary" />
                    <span>User Request #{tIdx + 1}</span>
                    {turn.timestamp && <span className="text-[10px] text-muted-foreground font-normal">({turn.timestamp})</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(turn.prompt, `turn-prompt-${tIdx}`)}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    {copiedSection === `turn-prompt-${tIdx}` ? (
                      <>
                        <Check size={11} className="text-manus-success" />
                        <span className="text-manus-success">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-foreground text-sm sm:text-base font-normal leading-relaxed whitespace-pre-wrap font-sans">
                  {turn.prompt}
                </div>
              </div>

              {turnGrouped && Object.keys(turnGrouped).length > 0 && (
                <ChatTimeline
                  prefix={`turn-${tIdx}`}
                  groupedSteps={turnGrouped}
                  isCurrentActive={false}
                  currentStepNum={0}
                  isRunning={false}
                  expandedSteps={expandedSteps}
                  toggleStep={toggleStep}
                />
              )}

              {turn.finalResult && (
                <ChatDeliverable
                  finalResult={turn.finalResult}
                  status={turn.status}
                  turnIndex={tIdx}
                  isTurnRawTrace={isTurnRawTrace}
                  lastThoughtContent={turnLastThought ? turnLastThought.content : undefined}
                  producedFiles={turn.producedFiles}
                  onSelectFile={onSelectFile}
                  copiedSection={copiedSection}
                  onCopy={copyText}
                  execMode={execMode}
                  showRawTrace={showRawTrace}
                  setShowRawTrace={setShowRawTrace}
                />
              )}
            </div>
          );
        })}

        {/* Current Active Turn Prompt */}
        {submittedPrompt && (
          <div className="py-2 px-1 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <User size={13} className="text-primary" />
                <span>User Request {historyTurns.length > 0 ? `#${historyTurns.length + 1}` : ""}</span>
                {sessionTimestamp && <span className="text-[10px] text-muted-foreground font-normal">({sessionTimestamp})</span>}
              </span>

              <button
                type="button"
                onClick={() => copyText(submittedPrompt, "user-prompt")}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title="Copy Task Prompt"
              >
                {copiedSection === "user-prompt" ? (
                  <>
                    <Check size={11} className="text-manus-success" />
                    <span className="text-manus-success">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-foreground text-sm sm:text-base font-normal leading-relaxed whitespace-pre-wrap font-sans">
              {submittedPrompt}
            </div>
          </div>
        )}

        {/* Human Intervention Box */}
        {humanQuery && (
          <div className="p-4 rounded-sm bg-manus-warning/10 border border-manus-warning/30 text-xs space-y-2.5 animate-pulse">
            <div className="flex items-center gap-2 text-manus-warning font-semibold text-xs">
              <HelpCircle size={14} />
              <span>Agent Requires Human Input:</span>
            </div>
            <div className="p-2.5 rounded-md bg-background border border-border text-foreground">
              {humanQuery}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={humanAnswer}
                onChange={(e) => setHumanAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSendHumanAnswer()}
                placeholder="Type your response to the agent..."
                className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                variant="primary"
                onClick={onSendHumanAnswer}
                className="text-xs px-3 h-8 rounded-md cursor-pointer"
              >
                Submit Answer
              </Button>
            </div>
          </div>
        )}

        {/* Active Connected Stepper */}
        {execMode === "agent" && activeGroupedSteps && Object.keys(activeGroupedSteps).length > 0 && (
          <ChatTimeline
            prefix="active"
            groupedSteps={activeGroupedSteps}
            isCurrentActive={true}
            currentStepNum={currentStepNum}
            isRunning={status === "running"}
            expandedSteps={expandedSteps}
            toggleStep={toggleStep}
          />
        )}

        {/* Live Running Indicator */}
        {status === "running" && (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-primary/20 bg-muted/40 text-foreground transition-all">
            <div className="flex items-center gap-2.5 text-xs">
              <Loader2 size={14} className="animate-spin text-manus-accent" />
              <span className="font-medium">{getLiveStatusMessage()}</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-muted-foreground">
              {elapsedSeconds}s
            </span>
          </div>
        )}

        {/* Final Result Deliverable */}
        {finalResult && (
          <ChatDeliverable
            finalResult={finalResult}
            status={status === "failed" ? "failed" : "completed"}
            isTurnRawTrace={isCurrentRawTrace}
            producedFiles={producedFiles}
            onSelectFile={onSelectFile}
            copiedSection={copiedSection}
            onCopy={copyText}
            execMode={execMode}
            showRawTrace={showRawTrace}
            setShowRawTrace={setShowRawTrace}
          />
        )}

        <div ref={chatScrollBottomRef} />
      </div>
    </div>
  );
}

export default ChatThread;
