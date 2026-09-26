"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { AppShell } from "@/components/layout/app-shell";
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
      <div className="flex flex-col h-full p-6 space-y-6 max-w-5xl mx-auto w-full overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center space-x-3">
            <Terminal className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Session Details</h1>
              <p className="text-xs text-muted-foreground font-mono">{rawId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-accent/60 px-3 py-1.5 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Archive Loaded</span>
          </div>
        </div>

        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-primary">{msg.role} Prompt</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="bg-card/40 border border-border/60 rounded-xl p-6 text-center text-sm text-muted-foreground">
              No prompt stored for this session.
            </div>
          )
        )}

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Recorded Execution Steps ({activeSteps.length})
          </h3>

          {activeSteps.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
              No steps or thoughts found for this session.
            </div>
          ) : (
            <div className="space-y-2">
              {activeSteps.map((step) => {
                const isOpen = expanded[step.id] ?? true;
                return (
                  <div key={step.id} className="bg-card/60 border border-border rounded-lg overflow-hidden text-xs">
                    <button
                      onClick={() => toggle(step.id)}
                      className="w-full flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left font-mono"
                    >
                      <div className="flex items-center space-x-2">
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span className="font-bold text-primary">Step {step.step_number}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent uppercase">{step.type}</span>
                      </div>
                      <span className="text-muted-foreground text-[11px]">{new Date(step.timestamp).toLocaleTimeString()}</span>
                    </button>
                    {isOpen && (
                      <div className="p-3 font-mono bg-background/50 border-t border-border/40 text-foreground whitespace-pre-wrap leading-relaxed">
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
    </AppShell>
  );
}