"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";
import { Terminal, CheckCircle2, Clock, ChevronDown, ChevronRight } from "lucide-react";

export default function ChatDetailPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const { messages, activeSteps, loadSessionDetail } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (rawId) {
      setLoading(true);
      loadSessionDetail(rawId).finally(() => setLoading(false));
    }
  }, [rawId, loadSessionDetail]);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AppShell>
      <div className="flex h-full w-full overflow-hidden">
        {/* Left: Chat & Timeline */}
        <div className="w-1/2 flex flex-col h-full border-r border-border p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-sm font-bold text-foreground">Session View</h1>
                <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">{rawId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 bg-accent/60 px-2.5 py-1 rounded-full text-[11px] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Loaded</span>
            </div>
          </div>

          {messages.length > 0 && (
            <div className="space-y-3 shrink-0">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-card border border-border rounded-lg p-3.5 space-y-1.5 shadow-sm text-xs">
                  <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-semibold">
                    <span className="text-primary">{msg.role} Prompt</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap font-medium">{msg.content}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 flex-1">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Timeline ({activeSteps.length} Steps)
            </h2>

            {activeSteps.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg text-muted-foreground text-xs">
                {loading ? "Loading session history..." : "No steps recorded for this session."}
              </div>
            ) : (
              <div className="space-y-2">
                {activeSteps.map((step) => {
                  const isOpen = expanded[step.id] ?? true;
                  return (
                    <div key={step.id} className="bg-card/50 border border-border rounded-md overflow-hidden text-xs">
                      <button
                        onClick={() => toggle(step.id)}
                        className="w-full flex items-center justify-between p-2.5 bg-muted/20 hover:bg-muted/30 transition-colors text-left font-mono"
                      >
                        <div className="flex items-center space-x-2">
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          <span className="font-bold text-primary">Step {step.step_number}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-accent uppercase">{step.type}</span>
                        </div>
                        <span className="text-muted-foreground text-[10px]">{new Date(step.timestamp).toLocaleTimeString()}</span>
                      </button>
                      {isOpen && (
                        <div className="p-2.5 font-mono bg-background/40 border-t border-border/40 text-foreground whitespace-pre-wrap leading-relaxed text-[11px]">
                          {step.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Workspace */}
        <div className="w-1/2 h-full flex flex-col">
          <WorkspacePanel />
        </div>
      </div>
    </AppShell>
  );
}