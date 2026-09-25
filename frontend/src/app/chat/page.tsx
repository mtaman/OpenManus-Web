"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  Wrench, 
  BrainCircuit,
  FileText,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";

interface StepEvent {
  id: string;
  step: number;
  type: "thought" | "tool_call" | "observation" | "error" | "final";
  content: string;
  toolName?: string;
  arguments?: string;
}

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [currentStepNum, setCurrentStepNum] = useState(0);
  const [producedFiles, setProducedFiles] = useState<{ name: string; path: string }[]>([]);
  const [selectedFileForEditor, setSelectedFileForEditor] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchJobFiles = async (jobId: string) => {
    try {
      const res = await fetch(`/api/run/jobs/${jobId}/files`);
      if (res.ok) {
        const data = await res.json();
        setProducedFiles(data.files || []);
      }
    } catch (e) {
      console.error("Error fetching job files", e);
    }
  };

  const handleStartTask = async () => {
    if (!prompt.trim() || status === "running") return;

    setStatus("running");
    setSteps([]);
    setFinalResult(null);
    setCurrentStepNum(1);
    setProducedFiles([]);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, max_steps: 20 }),
      });

      if (!res.ok) throw new Error("Failed to start run");

      const data = await res.json();
      const jobId = data.job_id;
      setActiveJobId(jobId);

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/run/jobs/${jobId}/stream`);
      eventSourceRef.current = es;

      const appendStep = (type: StepEvent["type"], content: string, stepNum = 1, toolName?: string) => {
        setSteps((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            step: stepNum,
            type,
            content,
            toolName,
          }
        ]);
      };

      es.addEventListener("step_start", (e: any) => {
        const payload = JSON.parse(e.data);
        setCurrentStepNum(payload.step || 1);
      });

      es.addEventListener("thought", (e: any) => {
        const payload = JSON.parse(e.data);
        const text = payload.data?.thought || payload.data?.content || JSON.stringify(payload.data);
        appendStep("thought", text, payload.step || 1);
      });

      es.addEventListener("tool_call", (e: any) => {
        const payload = JSON.parse(e.data);
        appendStep("tool_call", payload.data?.arguments || "Running tool...", payload.step || 1, payload.data?.name);
      });

      es.addEventListener("observation", (e: any) => {
        const payload = JSON.parse(e.data);
        appendStep("observation", payload.data?.output || "output ready", payload.step || 1);
        fetchJobFiles(jobId);
      });

      es.addEventListener("final", (e: any) => {
        const payload = JSON.parse(e.data);
        setFinalResult(payload.data?.result || "Task finished.");
        setStatus("completed");
        fetchJobFiles(jobId);
        es.close();
      });

      es.addEventListener("error", (e: any) => {
        const payload = JSON.parse(e.data);
        setFinalResult(payload.data?.message || "Execution error.");
        setStatus("failed");
        es.close();
      });

      es.onerror = () => {
        fetchJobFiles(jobId);
      };

    } catch (err) {
      console.error(err);
      setStatus("failed");
    }
  };

  // Group steps by step number
  const groupedSteps = steps.reduce((acc, s) => {
    acc[s.step] = acc[s.step] || [];
    acc[s.step].push(s);
    return acc;
  }, {} as Record<number, StepEvent[]>);

  return (
    <div className="flex h-full w-full bg-[var(--color-canvas)] text-[var(--color-ink)] overflow-hidden">
      {/* Left Chat & Telemetry View (50%) */}
      <div className="flex-1 flex flex-col h-full border-r border-[var(--color-line)] min-w-0">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold truncate max-w-md">
              {prompt || "New Autonomous Session"}
            </h1>
            <StatusPill status={status} />
          </div>
          <span className="text-xs font-mono text-[var(--color-ink-faint)]">
            Step {currentStepNum} / 20 • Local Engine
          </span>
        </div>

        {/* Scrollable Telemetry Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {Object.entries(groupedSteps).map(([stepNum, stepEvents]) => (
            <div key={stepNum} className="border border-[var(--color-line)] rounded-lg bg-[var(--color-surface-1)] p-4 space-y-2">
              <span className="text-xs font-mono font-semibold text-[var(--color-ink-muted)] block mb-1">
                Execution Step {stepNum}
              </span>
              {stepEvents.map((evt) => (
                <div key={evt.id} className="text-xs font-mono">
                  {evt.type === "thought" && (
                    <div className="flex items-start gap-2 p-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-line-subtle)] text-[var(--color-ink)]">
                      <BrainCircuit size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                      <div className="whitespace-pre-wrap">{evt.content}</div>
                    </div>
                  )}
                  {evt.type === "tool_call" && (
                    <div className="flex items-start gap-2 p-2 rounded bg-[var(--color-surface-2)] text-cyan-400 border border-cyan-500/20">
                      <Wrench size={14} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-bold underline">{evt.toolName}</span>: {evt.content}
                      </div>
                    </div>
                  )}
                  {evt.type === "observation" && (
                    <div className="p-2 text-[11px] text-emerald-400 bg-emerald-500/10 rounded border border-emerald-500/20">
                      ✓ {evt.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Final Result Card with Instant File Open Links */}
          {finalResult && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono space-y-3">
              <span className="text-emerald-400 font-bold uppercase tracking-wider block">FINAL RESULT</span>
              <div className="text-[var(--color-ink)] whitespace-pre-wrap font-sans text-xs">
                {finalResult}
              </div>

              {/* Produced Files Quick Open Links */}
              {producedFiles.length > 0 && (
                <div className="pt-3 border-t border-emerald-500/20">
                  <span className="text-[11px] font-semibold text-emerald-300 block mb-1.5">
                    Generated Task Files (Click to inspect in Editor):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {producedFiles.map((f) => (
                      <button
                        key={f.path}
                        onClick={() => setSelectedFileForEditor(f.path)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-1)] border border-emerald-500/40 text-emerald-300 text-xs font-mono transition"
                      >
                        <FileText size={12} />
                        <span>{f.name}</span>
                        <ExternalLink size={10} className="opacity-70" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[var(--color-line)] bg-[var(--color-surface-1)]">
          <div className="relative flex items-center">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartTask()}
              placeholder="Assign an autonomous task to OpenManus..."
              className="w-full bg-[var(--color-void)] border border-[var(--color-line)] rounded-lg pl-4 pr-12 py-2.5 text-xs text-[var(--color-ink)] focus:outline-none focus:border-cyan-500 font-mono"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartTask}
              disabled={status === "running"}
              className="absolute right-1.5 h-7 w-7 p-0"
            >
              <Send size={12} />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Workspace View (50%) */}
      <div className="flex-1 h-full min-w-0">
        <WorkspacePanel 
          activeJobId={activeJobId} 
          overrideFile={selectedFileForEditor}
        />
      </div>
    </div>
  );
}