"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Square,
  PlusCircle,
  PanelRightClose,
  PanelRightOpen,
  HelpCircle,
  Coins,
  Loader2,
  Sparkles,
  Layout,
  Gauge,
  Gamepad2,
  Clock
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

export default function ChatPage({ initialJobId }: { initialJobId?: string }) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(initialJobId || null);
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
    if (initialJobId) {
      setActiveJobId(initialJobId);
      fetchJobDetails(initialJobId);
      connectStream(initialJobId);
    }
  }, [initialJobId]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      const res = await fetch(`/api/run/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.prompt) setSubmittedPrompt(data.prompt);
        if (data.status) setStatus(data.status);
        if (data.result) setFinalResult(safeRender(data.result));
        if (data.created_at || data.timestamp) {
          setSessionTimestamp(data.created_at || data.timestamp);
        } else {
          setSessionTimestamp(new Date().toLocaleString());
        }

        if (data.events && Array.isArray(data.events)) {
          const replayed: StepEvent[] = [];
          data.events.forEach((ev: any, idx: number) => {
            const evType = ev.type || "thought";
            const evContent = ev.data?.thought || ev.data?.output || ev.data?.content || ev.data || JSON.stringify(ev);
            replayed.push({
              id: `replay-${idx}-${Math.random()}`,
              step: ev.step || 1,
              type: evType,
              content: safeRender(evContent),
              toolName: ev.data?.name,
              timestamp: ev.timestamp || new Date().toLocaleTimeString()
            });
          });
          setSteps(replayed);
        }
        fetchJobFiles(jobId);
      }
    } catch (e) {
      console.error("Failed to fetch job details for restoration", e);
    }
  };

  const connectStream = (jobId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/run/jobs/${jobId}/stream`);
    eventSourceRef.current = es;

    const appendStep = (type: StepEvent["type"], content: any, stepNum = 1, toolName?: string) => {
      const cleanContent = safeRender(content);
      const cleanTool = toolName ? safeRender(toolName) : undefined;

      if (type === "tool_call") {
        if (!cleanTool || cleanTool === "{}") return;
        if (!cleanContent && !cleanTool) return;
      }

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

    const handleEventPayload = (eventType: string, payload: any) => {
      const step = payload.step || 1;
      setCurrentStepNum(step);

      if (eventType === "step_start") {
        // Step initialized
      } else if (eventType === "thought") {
        const raw = payload.data?.thought ?? payload.data?.content ?? payload.data;
        appendStep("thought", raw, step);
        if (payload.data?.tokens) setTokensUsed(payload.data.tokens);
      } else if (eventType === "tool_call") {
        const name = payload.data?.name;
        const args = payload.data?.arguments ?? "";
        if (name === "ask_human" || (typeof args === "string" && (args.includes("?") || args.includes("prefer")))) {
          setHumanQuery(typeof args === "string" ? args : JSON.stringify(args));
        }
        appendStep("tool_call", args, step, name);
      } else if (eventType === "observation") {
        const raw = payload.data?.output ?? "Execution completed.";
        appendStep("observation", raw, step);

        const match = typeof raw === "string" ? raw.match(/(?:File created successfully at|The file)\s*:?\s*([^\r\n]+?)(?:\s+has been edited|\. Cannot|\r|\n|$)/i) : null;
        if (match && match[1]) {
          const fullPath = match[1].trim();
          const fileName = fullPath.split(/[\/\\]/).pop() || fullPath;
          setSelectedFileForEditor(fileName);
        }
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

    const bindEvt = (name: string) => {
      es.addEventListener(name, (e: any) => {
        try {
          const parsed = JSON.parse(e.data);
          handleEventPayload(name, parsed);
        } catch {
          handleEventPayload(name, { data: e.data });
        }
      });
    };

    bindEvt("step_start");
    bindEvt("thought");
    bindEvt("tool_call");
    bindEvt("observation");
    bindEvt("final");
    bindEvt("error");
    bindEvt("ping");

    es.onmessage = (e: any) => {
      try {
        const parsed = JSON.parse(e.data);
        const evType = parsed.type || "thought";
        handleEventPayload(evType, parsed);
      } catch {}
    };

    // Fail-safe auto unlock on disconnect
    es.onerror = () => {
      console.warn("EventSource closed or connection interrupted for job:", jobId);
      es.close();
      fetch(`/api/run/jobs/${jobId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && (d.status === "completed" || d.status === "failed")) {
            setStatus(d.status);
            if (d.result) setFinalResult(safeRender(d.result));
          } else {
            setStatus("idle");
          }
        })
        .catch(() => setStatus("idle"));
      fetchJobFiles(jobId);
    };
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === "running") {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [status]);

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNum]: !prev[stepNum]
    }));
  };

  const copyText = (text: string, identifier: string) => {
    if (!text) return;
    const onCopySuccess = () => {
      setCopiedSection(identifier);
      setTimeout(() => setCopiedSection(null), 2000);
    };

    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(onCopySuccess).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }

    function fallbackCopy(str: string) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = str;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) onCopySuccess();
      } catch (err) {
        console.error("Fallback copy error:", err);
      }
    }
  };

  const handleNewSession = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setInputValue("");
    setSubmittedPrompt("");
    setActiveJobId(null);
    setStatus("idle");
    setSteps([]);
    setFinalResult(null);
    setCurrentStepNum(0);
    setProducedFiles([]);
    setSelectedFileForEditor(null);
    setExpandedSteps({});
    setTokensUsed({ input: 0, output: 0, total: 0 });
    setHumanQuery(null);
    setHumanAnswer("");
    setSessionTimestamp("");
  };

  const handleStopTask = async () => {
    if (!activeJobId) return;
    if (status !== "running") return;
    try {
      await fetch(`/api/run/jobs/${activeJobId}/stop`, { method: "POST" });
      setStatus("failed");
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    } catch (e) {
      console.error("Failed to stop job", e);
    }
  };

  const handleSendHumanAnswer = async () => {
    if (!activeJobId) return;
    if (!humanAnswer.trim()) return;
    try {
      await fetch(`/api/run/jobs/${activeJobId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: humanAnswer.trim() }),
      });
      setHumanQuery(null);
      setHumanAnswer("");
    } catch (e) {
      console.error("Failed to submit human response", e);
    }
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
      console.error("Error fetching job files", e);
    }
  };

  const handleStartTask = async (customPrompt?: string) => {
    const textToSend = (customPrompt !== undefined ? customPrompt : inputValue).trim();
    if (!textToSend) return;
    if (status === "running") return;

    setInputValue("");
    setSubmittedPrompt(textToSend);
    setStatus("running");
    setSteps([]);
    setFinalResult(null);
    setCurrentStepNum(1);
    setProducedFiles([]);
    setSelectedFileForEditor(null);
    setExpandedSteps({});
    setHumanQuery(null);
    setTokensUsed({ input: 0, output: 0, total: 0 });
    setSessionTimestamp(new Date().toLocaleString());

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSend, max_steps: 20 }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to start run");
      }

      const data = await res.json();
      const jobId = data.job_id;
      setActiveJobId(jobId);

      connectStream(jobId);
    } catch (err: any) {
      console.error("Execution error:", err);
      setStatus("failed");
      setFinalResult(err?.message || "Execution error encountered.");
    }
  };

  const groupedSteps = steps.reduce((acc, s) => {
    if (!acc[s.step]) {
      acc[s.step] = [];
    }
    acc[s.step].push(s);
    return acc;
  }, {} as Record<number, StepEvent[]>);

  const quickPrompts = [
    { label: "Dashboard Widget", icon: <Layout size={12} />, prompt: "In the workspace, create a file named 'analytics_widget.html' featuring a dark mode system health card with an animated SVG radial progress ring and real-time refresh button, then terminate." },
    { label: "Interactive Counter", icon: <Gauge size={12} />, prompt: "In the workspace, create a file named 'counter_app.html' with a modern dark theme card component using CSS, including a glowing button that changes color on hover and increments a click counter in JavaScript, then terminate." },
    { label: "Mini Pong Game", icon: <Gamepad2 size={12} />, prompt: "In the workspace, create a file named 'mini_pong.html' with a playable HTML5 canvas retro pong game with keyboard controls and score counter, then terminate." }
  ];

  return (
    <div className="flex h-full w-full bg-[var(--color-canvas)] text-[var(--color-ink)] overflow-hidden font-mono">
      <div className="flex-1 flex flex-col h-full border-r border-[var(--color-line)] min-w-0">
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNewSession}
              className="flex items-center gap-1.5 h-7 px-2 text-xs font-mono border-[var(--color-line)] bg-[var(--color-surface-2)] cursor-pointer"
              title="Start a fresh autonomous session"
            >
              <PlusCircle size={13} className="text-cyan-400" />
              <span>New Session</span>
            </Button>
            <h1 className="text-xs font-semibold truncate max-w-xs text-[var(--color-ink)]">
              {submittedPrompt ? submittedPrompt : "Ready"}
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
            {status === "running" && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleStopTask}
                className="flex items-center gap-1 h-7 px-2.5 text-xs font-mono bg-red-600/80 hover:bg-red-600 text-white cursor-pointer"
              >
                <Square size={11} className="fill-current" />
                <span>Stop</span>
              </Button>
            )}
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="p-1.5 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-cyan-400 cursor-pointer"
              title={showRightPanel ? "Hide Right Workspace Panel" : "Show Right Workspace Panel"}
            >
              {showRightPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {submittedPrompt && (
            <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs font-mono space-y-2">
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

          {humanQuery && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono space-y-3 animate-pulse">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                <HelpCircle size={14} />
                <span>Agent Requires Human Assistance / Feedback:</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-surface-1)] text-[var(--color-ink)] border border-[var(--color-line)] font-sans">
                {humanQuery}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={humanAnswer}
                  onChange={(e) => setHumanAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendHumanAnswer()}
                  placeholder="Type your response to the agent..."
                  className="flex-1 bg-[var(--color-void)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)] focus:outline-none focus:border-amber-400"
                />
                <Button
                  variant="primary"
                  onClick={handleSendHumanAnswer}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs px-3 h-8 cursor-pointer"
                >
                  Submit Answer
                </Button>
              </div>
            </div>
          )}

          {status === "running" && (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-cyan-400">
              <div className="flex items-center gap-2.5">
                <Loader2 size={14} className="animate-spin text-cyan-400" />
                <span className="text-[11px] font-mono">Agent reasoning & executing autonomously...</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                {elapsedSeconds}s
              </span>
            </div>
          )}

          {Object.entries(groupedSteps).map(([stepNumStr, stepEvents]) => {
            const stepNum = parseInt(stepNumStr, 10);
            const isExpanded = expandedSteps[stepNum] === true;
            return (
              <div key={stepNum} className="border border-[var(--color-line)] rounded-lg bg-[var(--color-surface-1)] overflow-hidden transition-all">
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
                    <span className="text-xs font-mono font-semibold text-[var(--color-ink-muted)]">
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
                          <div className="flex items-start gap-2 p-2.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-line)]">
                            <BrainCircuit size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                            <div className="whitespace-pre-wrap leading-relaxed">{evt.content}</div>
                          </div>
                        )}
                        {evt.type === "tool_call" && evt.toolName && (
                          <div className="flex items-start gap-2 p-2.5 rounded bg-[var(--color-surface-2)] text-cyan-400 border border-[var(--color-line)]">
                            <Wrench size={14} className="mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-bold underline mr-1">{evt.toolName}:</span>
                              <span>{evt.content}</span>
                            </div>
                          </div>
                        )}
                        {evt.type === "observation" && (
                          <div className="p-2 text-[11px] text-emerald-400 bg-emerald-500/10 rounded border border-emerald-500/20 flex items-start gap-2">
                            <Terminal size={13} className="mt-0.5 flex-shrink-0" />
                            <span className="whitespace-pre-wrap">{evt.content}</span>
                          </div>
                        )}
                        {evt.type === "error" && (
                          <div className="p-2 text-[11px] text-rose-400 bg-rose-500/10 rounded border border-rose-500/20 flex items-start gap-2">
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

          {finalResult && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                  FINAL RESULT
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
                    Generated Task Files:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {producedFiles.map((f) => (
                      <button
                        key={f.path}
                        type="button"
                        onClick={() => setSelectedFileForEditor(f.name)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-1)] text-cyan-300 border border-cyan-500/30 text-xs cursor-pointer"
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

        <div className="p-4 border-t border-[var(--color-line)] bg-[var(--color-surface-1)] space-y-2.5">
          {status !== "running" && steps.length === 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-[var(--color-ink-muted)]">
              <span className="flex items-center gap-1 text-[10px] text-cyan-400 uppercase tracking-wider font-bold mr-1">
                <Sparkles size={11} />
                Quick Tasks:
              </span>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleStartTask(qp.prompt)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-cyan-500/50 hover:text-cyan-300 transition cursor-pointer whitespace-nowrap"
                >
                  {qp.icon}
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStartTask();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={status === "running" ? "Agent is running... (use Stop to cancel)" : "Assign an autonomous task to OpenManus..."}
              disabled={status === "running"}
              className="w-full bg-[var(--color-void)] border border-[var(--color-line)] rounded-lg pl-4 pr-12 py-2.5 text-xs text-[var(--color-ink)] focus:outline-none focus:border-cyan-500 disabled:opacity-60"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={status === "running" || !inputValue.trim()}
              className="absolute right-1.5 h-7 w-7 p-0 flex items-center justify-center cursor-pointer disabled:opacity-40"
            >
              <Send size={12} />
            </Button>
          </form>
        </div>
      </div>

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