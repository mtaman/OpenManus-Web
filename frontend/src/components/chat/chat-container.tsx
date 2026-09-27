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
  Plus,
  PanelRightClose,
  PanelRightOpen,
  HelpCircle,
  Coins,
  Loader2,
  Sparkles,
  Layout,
  Globe,
  Palette,
  Gamepad2,
  ArrowUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

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

export interface ChatContainerProps {
  initialJobId?: string | null;
}

export function ChatContainer({ initialJobId }: ChatContainerProps) {
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

  // Closed by default for fresh sessions to ensure a clean landing
  const [showRightPanel, setShowRightPanel] = useState<boolean>(Boolean(initialJobId));

  const [tokensUsed, setTokensUsed] = useState({ input: 0, output: 0, total: 0 });
  const [humanQuery, setHumanQuery] = useState<string | null>(null);
  const [humanAnswer, setHumanAnswer] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionTimestamp, setSessionTimestamp] = useState<string>("");

  const eventSourceRef = useRef<EventSource | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (initialJobId) {
      setActiveJobId(initialJobId);
      fetchJobDetails(initialJobId);
      connectStream(initialJobId);
      setShowRightPanel(true);
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
        setSessionTimestamp(data.created_at || data.timestamp || new Date().toLocaleString());

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
              timestamp: ev.timestamp || new Date().toLocaleTimeString(),
            });
          });
          setSteps(replayed);
          if (replayed.length > 0) setShowRightPanel(true);
        }

        // Keep reasoning collapsed on completed runs
        if (data.status === "completed") {
          setExpandedSteps({});
        }

        fetchJobFiles(jobId);
      }
    } catch (e) {
      console.error("Failed to fetch job details", e);
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
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    };

    const handleEventPayload = (eventType: string, payload: any) => {
      const step = payload.step || 1;
      setCurrentStepNum(step);

      // Keep active step open during execution
      setExpandedSteps((prev) => ({ ...prev, [step]: true }));

      if (eventType === "thought") {
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
          setShowRightPanel(true);
        }
        fetchJobFiles(jobId);
      } else if (eventType === "final") {
        const resText = payload.data?.result ?? "Task completed successfully.";
        setFinalResult(safeRender(resText));
        setStatus("completed");
        // Auto-collapse reasoning steps when completed to prioritize the final deliverable
        setExpandedSteps({});
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

    es.onerror = () => {
      es.close();
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
      [stepNum]: !prev[stepNum],
    }));
  };

  const copyText = (text: string, identifier: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(identifier);
      setTimeout(() => setCopiedSection(null), 2000);
    });
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
    setShowRightPanel(false);
    router.push("/chat");
  };

  const handleStopTask = async () => {
    if (!activeJobId || status !== "running") return;
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
    if (!activeJobId || !humanAnswer.trim()) return;
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
    if (!textToSend || status === "running") return;

    setInputValue("");
    setSubmittedPrompt(textToSend);
    setStatus("running");
    setSteps([]);
    setFinalResult(null);
    setCurrentStepNum(1);
    setProducedFiles([]);
    setSelectedFileForEditor(null);
    setExpandedSteps({ 1: true });
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStartTask();
    }
  };

  const groupedSteps = steps.reduce((acc, s) => {
    if (!acc[s.step]) {
      acc[s.step] = [];
    }
    acc[s.step].push(s);
    return acc;
  }, {} as Record<number, StepEvent[]>);

  const quickPills = [
    { label: "Create slides", icon: <Layout size={13} />, prompt: "Create an interactive presentation in HTML with modern slide navigation and CSS styling, then terminate." },
    { label: "Build website", icon: <Globe size={13} />, prompt: "Build a responsive modern single-page website in HTML and Tailwind CSS with a clean hero section and pricing cards, then terminate." },
    { label: "Design", icon: <Palette size={13} />, prompt: "In workspace, create an animated SVG dashboard widget with modern cards and dark mode styling, then terminate." },
    { label: "Create games", icon: <Gamepad2 size={13} />, prompt: "Create a playable HTML5 canvas retro game with keyboard controls, sound effects, and score tracking, then terminate." },
  ];

  const isFreshSession = steps.length === 0 && !submittedPrompt && status !== "running";

  return (
    <div className="flex h-full w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Main Interaction Cockpit */}
      <div className="flex-1 flex flex-col h-full border-r border-border min-w-0 transition-all">
        {/* Cockpit Sub-Header */}
        <div className="h-12 flex items-center justify-between px-5 border-b border-border bg-card/40 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleNewSession}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted text-foreground transition-all shadow-manus-xs cursor-pointer"
              title="Start a fresh autonomous session"
            >
              <Plus size={13} />
              <span>New Session</span>
            </button>

            <span className="text-xs font-medium text-foreground truncate max-w-[140px] sm:max-w-xs">
              {submittedPrompt ? submittedPrompt : (activeJobId ? `Session ${activeJobId}` : "New Session")}
            </span>

            {status === "running" ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-manus-warning/15 text-manus-warning border border-manus-warning/30">
                <span className="w-1.5 h-1.5 rounded-full bg-manus-warning animate-pulse" />
                <span>RUNNING</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-manus-success/15 text-manus-success border border-manus-success/30">
                <span className="w-1.5 h-1.5 rounded-full bg-manus-success" />
                <span>READY</span>
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

            {currentStepNum > 0 && (
              <span className="text-xs font-mono text-muted-foreground">
                Step {currentStepNum} / 20
              </span>
            )}

            {status === "running" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopTask}
                className="h-7 px-2.5 text-xs font-sans rounded-md cursor-pointer"
              >
                <Square size={11} className="fill-current mr-1" />
                <span>Stop</span>
              </Button>
            )}

            <button
              type="button"
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
              title={showRightPanel ? "Hide Right Workspace Panel" : "Show Right Workspace Panel"}
            >
              {showRightPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>
        </div>

        {/* Dynamic Body: Centered Landing Screen OR Active Chat Stream */}
        {isFreshSession ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto w-full">
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground tracking-tight mb-8">
              What can I do for you?
            </h1>

            {/* Centered Large Composer */}
            <div className="w-full bg-card rounded-2xl border border-border shadow-manus-md p-3.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all text-left">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="Assign a task or type / for more..."
                className="w-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                    <Sparkles size={12} className="text-manus-accent" />
                    <span>OpenManus Engine</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartTask()}
                  disabled={!inputValue.trim()}
                  className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-manus-xs cursor-pointer hover:bg-primary/90"
                  title="Dispatch Task (Enter)"
                >
                  <ArrowUp size={15} />
                </button>
              </div>
            </div>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {quickPills.map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleStartTask(pill.prompt)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/60 hover:bg-muted text-xs text-foreground transition-all cursor-pointer shadow-manus-xs"
                >
                  <span className="text-muted-foreground">{pill.icon}</span>
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Chat Stream Feed */
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            {submittedPrompt && (
              <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-1.5 shadow-manus-xs">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <User size={13} className="text-primary" />
                    <span>User Task</span>
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

                <div className="text-foreground text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {submittedPrompt}
                </div>
              </div>
            )}

            {/* Human Intervention Required */}
            {humanQuery && (
              <div className="p-4 rounded-xl bg-manus-warning/10 border border-manus-warning/30 text-xs space-y-2.5 animate-pulse">
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
                    onKeyDown={(e) => e.key === "Enter" && handleSendHumanAnswer()}
                    placeholder="Type your response to the agent..."
                    className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    variant="primary"
                    onClick={handleSendHumanAnswer}
                    className="text-xs px-3 h-8 rounded-md cursor-pointer"
                  >
                    Submit Answer
                  </Button>
                </div>
              </div>
            )}

            {/* Running Status Indicator */}
            {status === "running" && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-lg border border-primary/20 bg-muted/50 text-foreground">
                <div className="flex items-center gap-2 text-xs">
                  <Loader2 size={13} className="animate-spin text-manus-accent" />
                  <span>Agent reasoning & executing autonomously...</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-muted-foreground">
                  {elapsedSeconds}s
                </span>
              </div>
            )}

            {/* Grouped Step Accordions (Auto-Collapsing Supported) */}
            {Object.entries(groupedSteps).map(([stepNumStr, stepEvents]) => {
              const stepNum = parseInt(stepNumStr, 10);
              const isExpanded = expandedSteps[stepNum] === true;

              return (
                <div key={stepNum} className="border border-border rounded-xl bg-card/60 overflow-hidden shadow-manus-xs transition-all">
                  <button
                    type="button"
                    onClick={() => toggleStep(stepNum)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-manus-accent" />
                      ) : (
                        <ChevronRight size={14} className="text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-foreground">
                        Execution Step {stepNum}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                        {stepEvents.length} events
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {isExpanded ? "Collapse" : "View reasoning"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="p-3.5 pt-1 border-t border-border/60 space-y-2 bg-background/50">
                      {stepEvents.map((evt) => (
                        <div key={evt.id} className="text-xs space-y-1">
                          {evt.type === "thought" && (
                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-card border border-border/80 text-foreground shadow-manus-xs">
                              <BrainCircuit size={15} className="text-manus-accent mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <MarkdownRenderer content={evt.content} />
                              </div>
                            </div>
                          )}

                          {evt.type === "tool_call" && evt.toolName && (
                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted border border-border text-foreground font-mono text-xs">
                              <Wrench size={13} className="text-manus-info mt-0.5 flex-shrink-0" />
                              <div className="truncate">
                                <span className="font-semibold text-primary mr-1">{evt.toolName}:</span>
                                <span>{evt.content}</span>
                              </div>
                            </div>
                          )}

                          {evt.type === "observation" && (
                            <div className="p-2.5 text-xs font-mono text-foreground/90 bg-muted/60 rounded-lg border border-border flex items-start gap-2">
                              <Terminal size={13} className="mt-0.5 flex-shrink-0 text-manus-success" />
                              <div className="flex-1 min-w-0 overflow-x-auto">
                                <MarkdownRenderer content={evt.content} />
                              </div>
                            </div>
                          )}

                          {evt.type === "error" && (
                            <div className="p-2.5 text-xs text-manus-error bg-manus-error/10 rounded-lg border border-manus-error/20 flex items-start gap-2">
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

            {/* Final Deliverable Card with Rich Markdown & CodeBlock support */}
            {finalResult && (
              <div className="p-4 rounded-xl bg-manus-success/10 border border-manus-success/30 text-xs space-y-3 shadow-manus-xs">
                <div className="flex items-center justify-between">
                  <span className="text-manus-success font-semibold tracking-wide text-xs">
                    TASK DELIVERABLE COMPLETED
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(finalResult, "final-result")}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md hover:bg-background text-foreground cursor-pointer transition-all border border-border/40"
                    title="Copy Final Result"
                  >
                    {copiedSection === "final-result" ? (
                      <>
                        <Check size={12} className="text-manus-success" />
                        <span className="text-manus-success">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Result</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-foreground leading-relaxed">
                  <MarkdownRenderer content={finalResult} />
                </div>

                {producedFiles.length > 0 && (
                  <div className="pt-2.5 border-t border-manus-success/20">
                    <span className="text-[11px] font-semibold text-foreground block mb-1.5">
                      Generated Files:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {producedFiles.map((f) => (
                        <button
                          key={f.path}
                          type="button"
                          onClick={() => {
                            setSelectedFileForEditor(f.name);
                            setShowRightPanel(true);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card hover:bg-muted text-foreground border border-border text-xs cursor-pointer shadow-manus-xs transition-all"
                        >
                          <FileText size={12} className="text-manus-accent" />
                          <span>{f.name}</span>
                          <ExternalLink size={10} className="opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom Composer when session is active */}
        {!isFreshSession && (
          <div className="p-4 border-t border-border bg-card/40 space-y-2 shrink-0">
            <div className="relative flex items-center rounded-xl border border-border bg-background shadow-manus-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary/50 transition-all p-1.5 pl-3">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={status === "running" ? "Agent is running... (use Stop to cancel)" : "Assign a follow-up task (Shift+Enter for newline)..."}
                disabled={status === "running"}
                className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground disabled:opacity-50 resize-none max-h-24 py-1"
              />
              <Button
                type="button"
                onClick={() => handleStartTask()}
                size="sm"
                disabled={status === "running" || !inputValue.trim()}
                className="h-7 w-7 p-0 rounded-md shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-manus-xs"
              >
                <Send size={12} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sandbox Workspace Panel */}
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

export default ChatContainer;