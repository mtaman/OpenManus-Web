"use client";

import React, { useState } from "react";
import { useJobStream } from "@/hooks/useJobStream";
import { RunHeader } from "@/components/chat/run-header";
import { StepTimeline } from "@/components/chat/step-timeline";
import { Composer } from "@/components/chat/composer";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function ChatPage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const { run, cancel } = useJobStream(activeJobId, currentPrompt);

  const handleSubmitPrompt = async (promptText: string) => {
    setCurrentPrompt(promptText);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, max_steps: 20 }),
      });
      const data = await res.json();
      const jobId = data.job_id || data.id;
      setActiveJobId(jobId);
    } catch (err) {
      console.error("Failed to start job", err);
    }
  };

  const status = run?.status || "idle";

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--color-canvas)]">
      {/* Panel A: Conversation & Execution Steps (45% on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-[var(--color-line)]">
        <RunHeader
          prompt={currentPrompt}
          status={status}
          currentStep={run?.steps.length || 0}
          onCancel={cancel}
        />

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!activeJobId && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-accent-500)]/30 flex items-center justify-center text-[var(--color-accent-400)] mb-4">
                <Sparkles size={24} />
              </div>
              <h3 className="text-base font-semibold mb-2">What would you like OpenManus to solve today?</h3>
              <p className="text-xs text-[var(--color-ink-muted)] max-w-md">
                Assign complex analytical, browsing, or coding tasks. Watch thoughts, tool calls, and observations stream in real-time.
              </p>
            </div>
          )}

          {run && <StepTimeline steps={run.steps} />}

          {run?.finalAnswer && (
            <Card className="border-emerald-500/30 bg-emerald-950/10 p-5 mt-4">
              <div className="text-xs font-mono text-emerald-400 font-semibold mb-2 uppercase">Final Result</div>
              <div className="text-sm font-sans whitespace-pre-wrap leading-relaxed text-[var(--color-ink)]">
                {run.finalAnswer}
              </div>
            </Card>
          )}
        </div>

        <Composer
          isStreaming={status === "running"}
          onSubmit={handleSubmitPrompt}
          onCancel={cancel}
        />
      </div>

      {/* Panel B: Interactive Workspace (55% on desktop) */}
      <div className="w-[52%] hidden lg:flex flex-col h-full min-w-0">
        <WorkspacePanel activeJobId={activeJobId} />
      </div>
    </div>
  );
}