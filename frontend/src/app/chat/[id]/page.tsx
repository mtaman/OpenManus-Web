"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Send,
  Wrench,
  BrainCircuit,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  User,
  Terminal,
  PlusCircle,
  PanelRightClose,
  PanelRightOpen,
  HelpCircle,
  Coins,
  Loader2,
  Clock,
  Download,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";

interface StepEvent {
  id: string;
  step: number;
  type: "thought" | "tool_call" | "observation" | "error" | "final" | "ask_human";
  content: string;
  toolName?: string;
  timestamp?: string;
}

function safeRender(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "{}" || trimmed === "null" || trimmed === "undefined") return "";
    return val;
  }
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try {
    const str = JSON.stringify(val, null, 2);
    if (str === "{}" || str === "[]") return "";
    return str;
  } catch {
    return String(val);
  }
}

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;

  const [activeJobId, setActiveJobId] = useState<string>(rawId);
  const [inputValue, setInputValue] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [currentStepNum, setCurrentStepNum] = useState(0);
  const [producedFiles, setProducedFiles] = useState<{ name: string; path: string }[]>([]);
  const [selectedFileForEditor, setSelectedFileForEditor] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const [showRightPanel, setShowRightPanel] = useState(true);
  const [tokensUsed, setTokensUsed] = useState({ input: 0, output: 0, total: 0 });
  const [humanQuery, setHumanQuery] = useState<string | null>(null);
  const [humanAnswer, setHumanAnswer] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionTimestamp, setSessionTimestamp] = useState<string>("");

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (rawId) {
      setActiveJobId(rawId);
      loadSessionData(rawId);
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [rawId]);

  const parseEvents = (rawEvents: any[]): StepEvent[] => {
    const parsed: StepEvent[] = [];
    rawEvents.forEach((ev: any, idx: number) => {
      let evType = (ev.type || "thought").toLowerCase();
      if (evType === "ping" || evType === "step_start" || evType === "step_end") return;

      let rawData = ev.data;
      if (typeof rawData === "string") {
        try { rawData = JSON.parse(rawData); } catch {}
      }

      let evContent = "";
      let toolName = undefined;

      if (rawData && typeof rawData === "object") {
        evContent = rawData.thought || rawData.output || rawData.content || rawData.result || rawData.message || "";
        toolName = rawData.name || rawData.tool;
        if (!evContent && rawData.arguments) {
          evContent = typeof rawData.arguments === "string" ? rawData.arguments : JSON.stringify(rawData.arguments);
        }
      }

      if (!evContent) {
        evContent = typeof rawData === "string" ? rawData : JSON.stringify(rawData || ev);
      }

      let stepType: StepEvent["type"] = "thought";
      if (evType.includes("tool")) stepType = "tool_call";
      else if (evType.includes("observ")) stepType = "observation";
      else if (evType.includes("final")) stepType = "final";
      else if (evType.includes("error")) stepType = "error";

      parsed.push({
        id: `step-${idx}-${Math.random()}`,
        step: ev.step || 1,
        type: stepType,
        content: safeRender(evContent),
        toolName: toolName || (stepType === "tool_call" ? "action" : undefined),
        timestamp: ev.timestamp || new Date().toLocaleTimeString()
      });
    });
    return parsed;
  };

  const loadSessionData = async (jobId: string) => {
    try {
      const res = await fetch(`/api/run/jobs/${jobId}`);
      const data = res.ok ? await res.json() : null;

      if (data) {
        if (data.prompt) setSubmittedPrompt(data.prompt);
        const resolvedStatus = data.status || "completed";
        setStatus(resolvedStatus);
        if (data.result) setFinalResult(safeRender(data.result));
        if (data.created_at) setSessionTimestamp(data.created_at);

        if (data.events && Array.isArray(data.events) && data.events.length > 0) {
          const reconstructed = parseEvents(data.events);
          setSteps(reconstructed);
          if (reconstructed.length > 0) {
            setCurrentStepNum(reconstructed[reconstructed.length - 1].step);
          }
          if (!data.result) {
            const finalEv = reconstructed.find((s) => s.type === "final");
            if (finalEv) setFinalResult(finalEv.content);
          }
        }
        fetchJobFiles(jobId);

        // ONLY connect live SSE if task is actively running!
        if (resolvedStatus === "running") {
          connectStream(jobId);
        }
      }
    } catch (e) {
      console.error("Failed to load session data", e);
    }
  };

  const connectStream = (jobId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/run/jobs/${jobId}/stream`);
    eventSourceRef.current = es;

    const appendLiveStep = (type: StepEvent["type"], content: any, stepNum = 1, toolName?: string) => {
      const cleanContent = safeRender(content);
      const cleanTool = toolName ? safeRender(toolName) : undefined;
      if (type === "tool_call" && !cleanTool && !cleanContent) return;

      setSteps((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          step: stepNum,
          type,
          content: cleanContent,
          toolName: cleanTool,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    };

    const handlePayload = (eventType: string, payload: any) => {
      const step = payload.step || 1;
      setCurrentStepNum(step);

      if (eventType === "ping" || eventType === "step_start" || eventType === "step_end") {
        return;
      } else if (eventType === "thought") {
        const raw = payload.data?.thought ?? payload.data?.content ?? payload.data;
        appendLiveStep("thought", raw, step);
        if (payload.data?.tokens) setTokensUsed(payload.data.tokens);
      } else if (eventType === "tool_call") {
        const name = payload.data?.name;
        const args = payload.data?.arguments ?? "";
        if (name === "ask_human" || (typeof args === "string" && (args.includes("?") || args.includes("prefer")))) {
          setHumanQuery(typeof args === "string" ? args : JSON.stringify(args));
        }
        appendLiveStep("tool_call", args, step, name);
      } else if (eventType === "observation") {
        const raw = payload.data?.output ?? "Execution completed.";
        appendLiveStep("observation", raw, step);
        fetchJobFiles(jobId);
      } else if (eventType === "final") {
        const resText = payload.data?.result ?? "Task completed successfully.";
        setFinalResult(safeRender(resText));
        setStatus("completed");
        fetchJobFiles(jobId);
        es.close();
      } else if (eventType === "error") {
        const errText = payload.data?.message ?? "Execution error encountered.";
        setFinalResult(safeRender(errText));
        setStatus("failed");
        fetchJobFiles(jobId);
        es.close();
      }
    };

    es.addEventListener("thought", (e: any) => { try { handlePayload("thought", JSON.parse(e.data)); } catch {} });
    es.addEventListener("tool_call", (e: any) => { try { handlePayload("tool_call", JSON.parse(e.data)); } catch {} });
    es.addEventListener("observation", (e: any) => { try { handlePayload("observation", JSON.parse(e.data)); } catch {} });
    es.addEventListener("final", (e: any) => { try { handlePayload("final", JSON.parse(e.data)); } catch {} });
    es.addEventListener("error", (e: any) => { try { handlePayload("error", JSON.parse(e.data)); } catch {} });

    es.onerror = () => {
      es.close();
      fetchJobFiles(jobId);
    };
  };

  const fetchJobFiles = async (jobId: string) => {
    try {
      const res = await fetch(`/api/run/jobs/${jobId}/files`);
      if (res.ok) {
        const data = await res.json();
        const filesList: { name: string; path: string }[] = data.files ? data.files : [];
        setProducedFiles(filesList);

        const htmlFile = filesList.find((f) => {
          const lower = f.name.toLowerCase();
          return lower.endsWith(".html") || lower.endsWith(".htm");
        });
        if (htmlFile) {
          setSelectedFileForEditor(htmlFile.name);
        }
      }
    } catch (e) {
      console.error("Error fetching files", e);
    }
  };

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNum]: !prev[stepNum]
    }));
  };

  const copyText = (text: string, identifier: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(identifier);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputValue.trim();
    if (!textToSend || status === "running") return;

    setInputValue("");
    setStatus("running");
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSend, max_steps: 20 }),
      });
      if (!res.ok) throw new Error("Failed to dispatch run");
      const data = await res.json();
      if (data.job_id) {
        router.push(`/chat/${data.job_id}`);
      }
    } catch (err) {
      console.error("Execution error:", err);
      setStatus("failed");
    }
  };

  const groupedSteps = steps.reduce((acc, s) => {
    if (!acc[s.step]) {
      acc[s.step] = [];
    }
    acc[s.step].push(s);
    return acc;
  }, {} as Record<number, StepEvent[]>);

  return (
    <div className="flex h-full w-full bg-[var(--color-canvas)] text-[var(--color-ink)] overflow-hidden font-mono">
      <div className="flex-1 flex flex-col h-full border-r border-[var(--color-line)] min-w-0">
        {/* Sleek Header */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-[var(--color-line)] bg-[var(--color-surface-1)] shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-mono rounded border border-[var(--color-line)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-1)] text-cyan-400 transition"
              title="Start a fresh autonomous session"
            >
              <PlusCircle size={13} />
              <span>New Session</span>
            </Link>
            <h1 className="text-xs font-semibold truncate max-w-xs text-[var(--color-ink)]">
              {submittedPrompt || activeJobId}
            </h1>
            <StatusPill status={status} />
          </div>

          <div className="flex items-center gap-3">
            {sessionTimestamp && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]">
                <Clock size={11} />
                <span>{sessionTimestamp}</span>
              </span>
            )}
            {tokensUsed.total > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]">
                <Coins size={11} />
                <span>Tokens: {tokensUsed.total.toLocaleString()}</span>
              </span>
            )}
            <span className="text-xs font-mono text-[var(--color-ink-faint)]">
              Step {currentStepNum} / 20
            </span>
            <button
              onClick={() => window.open(`/api/run/jobs/${activeJobId}/download-zip`, "_blank")}
              className="p-1.5 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-cyan-400 transition"
              title="Download Session Deliverables ZIP"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="p-1.5 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-cyan-400 transition"
              title={showRightPanel ? "Hide Right Workspace Panel" : "Show Right Workspace Panel"}
            >
              {showRightPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>
        </div>

        {/* Telemetry Stream Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {submittedPrompt && (
            <div className="p-4 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs font-mono space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                  <User size={13} />
                  User Prompt
                  {sessionTimestamp && <span className="text-[10px] text-slate-500 font-normal ml-2">({sessionTimestamp})</span>}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(submittedPrompt, "user-prompt")}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] cursor-pointer"
                  title="Copy Prompt"
                >
                  {copiedSection === "user-prompt" ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 font-sans">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span className="font-sans">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-[var(--color-ink)] whitespace-pre-wrap font-sans text-xs leading-relaxed">
                {submittedPrompt}
              </div>
            </div>
          )}

          {/* Real-time Loader */}
          {status === "running" && (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-cyan-400">
              <div className="flex items-center gap-2.5">
                <Loader2 size={14} className="animate-spin text-cyan-400" />
                <span className="text-[11px] font-mono">Agent reasoning & executing autonomously...</span>
              </div>
            </div>
          )}

          {/* Grouped Steps with Clean Typography */}
          {Object.entries(groupedSteps).map(([stepNumStr, stepEvents]) => {
            const stepNum = parseInt(stepNumStr, 10);
            const isExpanded = expandedSteps[stepNum] !== false;
            return (
              <div key={stepNum} className="border border-[var(--color-line)] rounded-xl bg-[var(--color-surface-1)] overflow-hidden transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleStep(stepNum)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-cyan-400" />
                    ) : (
                      <ChevronRight size={14} className="text-[var(--color-ink-muted)]" />
                    )}
                    <span className="text-xs font-mono font-semibold text-[var(--color-ink)]">
                      Execution Step {stepNum}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-ink-faint)]">
                      {stepEvents.length} events
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-ink-faint)]">
                    {isExpanded ? "Click to collapse" : "Click to view reasoning"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="p-4 pt-2 border-t border-[var(--color-line-subtle)] space-y-2.5 bg-[var(--color-canvas)]">
                    {stepEvents.map((evt) => (
                      <div key={evt.id} className="text-xs font-mono space-y-1">
                        {evt.timestamp && (
                          <div className="text-[9px] text-slate-500 flex items-center gap-1">
                            <Clock size={10} /> {evt.timestamp}
                          </div>
                        )}
                        {evt.type === "thought" && (
                          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)]">
                            <BrainCircuit size={15} className="text-purple-400 mt-0.5 shrink-0" />
                            <div className="whitespace-pre-wrap leading-relaxed text-slate-200">{evt.content}</div>
                          </div>
                        )}
                        {evt.type === "tool_call" && (
                          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-surface-2)] text-cyan-400 border border-[var(--color-line)]">
                            <Wrench size={15} className="mt-0.5 shrink-0" />
                            <div>
                              <span className="font-bold underline mr-1.5">{evt.toolName || "action"}:</span>
                              <span className="text-slate-300">{evt.content}</span>
                            </div>
                          </div>
                        )}
                        {evt.type === "observation" && (
                          <div className="p-2.5 text-[11px] text-emerald-400 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-start gap-2">
                            <Terminal size={14} className="mt-0.5 shrink-0" />
                            <span className="whitespace-pre-wrap">{evt.content}</span>
                          </div>
                        )}
                        {evt.type === "error" && (
                          <div className="p-2.5 text-[11px] text-rose-400 bg-rose-500/10 rounded-lg border border-rose-500/20 flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
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

          {/* Final Result Card */}
          {finalResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> FINAL RESULT
                </span>
                <button
                  type="button"
                  onClick={() => copyText(finalResult, "final-result")}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] cursor-pointer"
                  title="Copy Final Result"
                >
                  {copiedSection === "final-result" ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 font-sans">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span className="font-sans">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-[var(--color-ink)] whitespace-pre-wrap font-sans text-xs leading-relaxed">
                {finalResult}
              </div>

              {producedFiles.length > 0 && (
                <div className="pt-3 border-t border-emerald-500/20">
                  <span className="text-[11px] font-semibold text-emerald-300 block mb-1.5">
                    Generated Task Deliverables:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {producedFiles.map((f) => (
                      <button
                        key={f.path}
                        type="button"
                        onClick={() => setSelectedFileForEditor(f.name)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-1)] text-cyan-300 border border-cyan-500/30 text-xs cursor-pointer"
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

        {/* Bottom Input Composer */}
        <div className="p-4 border-t border-[var(--color-line)] bg-[var(--color-surface-1)] shrink-0">
          <form onSubmit={handleSendPrompt} className="relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Assign a follow-up autonomous task..."
              disabled={status === "running"}
              className="w-full bg-[var(--color-void)] border border-[var(--color-line)] rounded-xl pl-4 pr-12 py-2.5 text-xs text-[var(--color-ink)] focus:outline-none focus:border-cyan-500"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={status === "running" || !inputValue.trim()}
              className="absolute right-1.5 h-7 w-7 p-0 flex items-center justify-center cursor-pointer"
            >
              <Send size={12} />
            </Button>
          </form>
        </div>
      </div>

      {/* Right Workspace Preview Panel */}
      {showRightPanel && (
        <div className="flex-1 h-full min-w-0 transition-all">
          <WorkspacePanel
            activeJobId={activeJobId}
            overrideFile={selectedFileForEditor}
          />
        </div>
      )}
    </div>
  );
}