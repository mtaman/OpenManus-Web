"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { LiveSteps } from "@/components/chat/live-steps";
import { ChatComposer } from "@/components/chat/composer";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";
import { RunHeader } from "@/components/chat/run-header";
import { useJobStream } from "@/hooks/useJobStream";
import { useChatStore } from "@/stores/chat-store";
import { Sparkles, Terminal } from "lucide-react";

export default function HomePage() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const { steps, isStreaming, error, stopStream } = useJobStream(currentJobId);
  const { addMessage } = useChatStore();

  const handleSendPrompt = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setPrompt(text);

    addMessage({
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      status: "running"
    });

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      if (!res.ok) throw new Error("Failed to start agent task");
      const data = await res.json();

      if (data.job_id) {
        setCurrentJobId(data.job_id);
        window.history.replaceState(null, "", `/chat/${data.job_id}`);
      }
    } catch (err: any) {
      console.error("Execution error:", err);
    }
  };

  return (
    <AppShell>
      <div className="flex h-full w-full overflow-hidden">
        {/* Left: Chat & Live Execution */}
        <div className="w-1/2 flex flex-col h-full border-r border-border bg-background/50">
          <RunHeader jobId={currentJobId} isStreaming={isStreaming} onStop={stopStream} />

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {prompt && (
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>User Task</span>
                </div>
                <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{prompt}</p>
              </div>
            )}

            {!currentJobId && !prompt && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">OpenManus Autonomous Workspace</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Assign a task to start autonomous browsing, tool invocations, and workspace file synthesis.
                  </p>
                </div>
              </div>
            )}

            {currentJobId && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Live Agent Timeline
                </h4>
                <LiveSteps steps={steps} isStreaming={isStreaming} error={error} />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card/40">
            <ChatComposer onSend={handleSendPrompt} disabled={isStreaming} />
          </div>
        </div>

        {/* Right: Workspace Panel */}
        <div className="w-1/2 h-full flex flex-col">
          <WorkspacePanel />
        </div>
      </div>
    </AppShell>
  );
}