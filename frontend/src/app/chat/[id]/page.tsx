"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";
import { RunHeader } from "@/components/chat/run-header";
import { LiveSteps } from "@/components/chat/live-steps";
import { ChatComposer } from "@/components/chat/composer";
import { useJobStream } from "@/hooks/useJobStream";
import { useChatStore } from "@/stores/chat-store";
import { Terminal, Clock, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";

export default function ChatDetailPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const { messages = [], activeSteps = [], loadSessionDetail, addMessage } = useChatStore();
  const [activeJobId, setActiveJobId] = useState<string>(rawId);
  const { steps = [], isStreaming, error, stopStream } = useJobStream(activeJobId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const safeLiveSteps = steps || [];
  const safeHistorySteps = activeSteps || [];
  const safeMessages = messages || [];

  useEffect(() => {
    if (rawId) {
      setActiveJobId(rawId);
      loadSessionDetail(rawId);
    }
  }, [rawId, loadSessionDetail]);

  const handleSendPrompt = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    addMessage({
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      status: "running",
    });

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      if (!res.ok) throw new Error("Failed to dispatch task");
      const data = await res.json();

      if (data.job_id) {
        setActiveJobId(data.job_id);
      }
    } catch (err: any) {
      console.error("Execution error:", err);
    }
  };

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const headerPrompt = safeMessages[0]?.content || "Autonomous Execution Task";
  const headerStatus: "idle" | "running" | "completed" | "failed" = isStreaming
    ? "running"
    : error
    ? "failed"
    : (safeLiveSteps.length > 0 || safeHistorySteps.length > 0)
    ? "completed"
    : "idle";
  const headerStep = isStreaming ? safeLiveSteps.length : (safeHistorySteps.length || safeLiveSteps.length || 0);

  return (
    <AppShell>
      <div className="flex h-full w-full overflow-hidden">
        {/* Left Side: Live Execution & Timeline */}
        <div className="w-1/2 flex flex-col h-full border-r border-border bg-background/50">
          <RunHeader
            prompt={headerPrompt}
            status={headerStatus}
            currentStep={headerStep}
            maxSteps={20}
            onCancel={stopStream}
          />

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-xs text-destructive flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {safeMessages.length > 0 && (
              <div className="space-y-3">
                {safeMessages.map((msg) => (
                  <div key={msg.id} className="bg-card border border-border rounded-xl p-4 shadow-sm text-xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-semibold mb-1">
                      <span className="text-primary flex items-center space-x-1">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{msg.role} Prompt</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap font-medium leading-relaxed">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            {isStreaming || safeLiveSteps.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Live Agent Execution
                </h4>
                <LiveSteps steps={safeLiveSteps} />
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Archived Timeline ({safeHistorySteps.length} Steps)
                </h4>
                {safeHistorySteps.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                    No steps recorded for this session.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safeHistorySteps.map((step) => {
                      const isOpen = expanded[step.id] ?? true;
                      return (
                        <div key={step.id} className="bg-card/60 border border-border rounded-lg overflow-hidden text-xs">
                          <button
                            onClick={() => toggle(step.id)}
                            className="w-full flex items-center justify-between p-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left font-mono"
                          >
                            <div className="flex items-center space-x-2">
                              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              <span className="font-bold text-primary">Step {step.step_number}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent uppercase tracking-wider">{step.type}</span>
                            </div>
                            <span className="text-muted-foreground text-[10px]">{new Date(step.timestamp).toLocaleTimeString()}</span>
                          </button>
                          {isOpen && (
                            <div className="p-3 font-mono bg-background/50 border-t border-border/40 text-foreground whitespace-pre-wrap leading-relaxed text-[11px]">
                              {step.content}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card/40">
            <ChatComposer
              onSend={handleSendPrompt}
              disabled={isStreaming}
              isStreaming={isStreaming}
              onStop={stopStream}
            />
          </div>
        </div>

        {/* Right Side: Workspace Panel */}
        <div className="w-1/2 h-full flex flex-col">
          <WorkspacePanel />
        </div>
      </div>
    </AppShell>
  );
}