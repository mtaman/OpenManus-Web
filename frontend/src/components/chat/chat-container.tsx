"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
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
  ArrowUp,
  Activity,
  History,
  Bot,
  MessageSquare,
  Paperclip,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { Composer } from "@/components/chat/composer";

interface StepEvent {
  id: string;
  step: number;
  type: "thought" | "tool_call" | "observation" | "error" | "final" | "ask_human";
  content: string;
  toolName?: string;
  timestamp?: string;
}

interface ChatTurn {
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
  const [landingAttachedFiles, setLandingAttachedFiles] = useState<File[]>([]);
  const [isLandingDragging, setIsLandingDragging] = useState(false);
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(initialJobId || null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [historyTurns, setHistoryTurns] = useState<ChatTurn[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [currentStepNum, setCurrentStepNum] = useState(0);
  const [producedFiles, setProducedFiles] = useState<{ name: string; path: string }[]>([]);
  const [selectedFileForEditor, setSelectedFileForEditor] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showRawTrace, setShowRawTrace] = useState(false);

  const [showRightPanel, setShowRightPanel] = useState<boolean>(Boolean(initialJobId));
  const [sandboxDraft, setSandboxDraft] = useState<{ filename: string; content: string } | null>(null);

  const [tokensUsed, setTokensUsed] = useState({ input: 0, output: 0, total: 0 });
  const [humanQuery, setHumanQuery] = useState<string | null>(null);
  const [humanAnswer, setHumanAnswer] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionTimestamp, setSessionTimestamp] = useState<string>("");
  const [execMode, setExecMode] = useState<"agent" | "chat">("agent");

  const eventSourceRef = useRef<EventSource | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const landingFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("omweb_exec_mode") as "agent" | "chat" | null;
      if (savedMode === "agent" || savedMode === "chat") {
        setExecMode(savedMode);
      }

      const onModeChange = (e: any) => {
        if (e.detail === "agent" || e.detail === "chat") {
          setExecMode(e.detail);
        }
      };
      window.addEventListener("omweb:mode-change", onModeChange);
      return () => window.removeEventListener("omweb:mode-change", onModeChange);
    }
  }, []);

  const handleModeChange = (newMode: "agent" | "chat") => {
    setExecMode(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("omweb_exec_mode", newMode);
      window.dispatchEvent(new CustomEvent("omweb:mode-change", { detail: newMode }));
    }
  };

  useEffect(() => {
    if (status === "running" || steps.length > 0) {
      chatScrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [steps, status, finalResult]);

  useEffect(() => {
    const handleSandboxEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ code: string; language: string; filename: string }>;
      if (customEvent.detail) {
        setShowRightPanel(true);
        setSandboxDraft({
          filename: customEvent.detail.filename,
          content: customEvent.detail.code,
        });
      }
    };

    window.addEventListener("openmanus:open-in-sandbox", handleSandboxEvent);
    return () => {
      window.removeEventListener("openmanus:open-in-sandbox", handleSandboxEvent);
    };
  }, []);

  useEffect(() => {
    if (initialJobId) {
      setActiveJobId(initialJobId);
      fetchJobDetails(initialJobId);
      setShowRightPanel(true);
    }
  }, [initialJobId]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      const res = await fetch(`/api/run/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.chat_id) setActiveChatId(data.chat_id);
        if (data.prompt) setSubmittedPrompt(data.prompt);
        if (data.status) setStatus(data.status);
        if (data.result) setFinalResult(safeRender(data.result));
        setSessionTimestamp(data.created_at || data.timestamp || new Date().toLocaleString());

        if (data.turns && Array.isArray(data.turns)) {
          const loadedTurns: ChatTurn[] = data.turns.map((t: any, idx: number) => {
            const replayedSteps: StepEvent[] = (t.events || [])
              .map((ev: any, evIdx: number) => ({
                id: `hist-${idx}-step-${evIdx}`,
                step: ev.step || 1,
                type: ev.type || "thought",
                content: safeRender(ev.data?.thought || ev.data?.output || ev.data?.content || ev.data || JSON.stringify(ev)),
                toolName: ev.data?.name,
                timestamp: ev.timestamp || "",
              }))
              .filter((ev: StepEvent) => ev.content.trim() !== "" || Boolean(ev.toolName));

            return {
              id: t.job_id || `turn-${idx}`,
              jobId: t.job_id || "",
              prompt: t.prompt || "",
              timestamp: t.created_at || "",
              steps: replayedSteps,
              finalResult: safeRender(t.result),
              status: t.status || "completed",
            };
          });
          setHistoryTurns(loadedTurns);
        }

        if (data.events && Array.isArray(data.events)) {
          const replayed: StepEvent[] = [];
          data.events.forEach((ev: any, idx: number) => {
            const evType = ev.type || "thought";
            const evContent = ev.data?.thought || ev.data?.output || ev.data?.content || ev.data || JSON.stringify(ev);
            const rendered = safeRender(evContent);
            const tool = ev.data?.name;
            if (rendered.trim() !== "" || Boolean(tool)) {
              replayed.push({
                id: `replay-${idx}-${Math.random()}`,
                step: ev.step || 1,
                type: evType,
                content: rendered,
                toolName: tool,
                timestamp: ev.timestamp || new Date().toLocaleTimeString(),
              });
            }
          });
          setSteps(replayed);
          const maxStep = replayed.reduce((max, s) => Math.max(max, s.step), 0);
          if (maxStep > 0) setCurrentStepNum(maxStep);
        }

        if (data.status === "completed") {
          setExpandedSteps({});
        }

        fetchJobFiles(data.id || jobId);

        if (data.status === "running") {
          connectStream(data.id || jobId);
        }
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
      if (!cleanContent && !cleanTool) return;

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
      const step = payload.step || payload.data?.step || currentStepNum || 1;
      setCurrentStepNum(step);

      if (eventType === "thought") {
        const raw = payload.data?.thought ?? payload.data?.content ?? payload.data;
        if (safeRender(raw).trim() !== "") {
          appendStep("thought", raw, step);
          setExpandedSteps((prev) => ({ ...prev, [`active-${step}`]: true }));
        }
        if (payload.data?.tokens) setTokensUsed(payload.data.tokens);
      } else if (eventType === "tool_call") {
        const name = payload.data?.name;
        const args = payload.data?.arguments ?? "";
        if (name === "ask_human" || (typeof args === "string" && (args.includes("?") || args.includes("prefer")))) {
          setHumanQuery(typeof args === "string" ? args : JSON.stringify(args));
        }
        appendStep("tool_call", args, step, name);
        setExpandedSteps((prev) => ({ ...prev, [`active-${step}`]: true }));
      } else if (eventType === "observation") {
        const raw = payload.data?.output ?? "Execution completed.";
        appendStep("observation", raw, step);

        const match = typeof raw === "string" ? raw.match(/(?:File created successfully at|The file)\s*:?\s*([^\r\n]+?)(?:\s+has been edited|\. Cannot|\r|\n|$)/i) : null;
        if (match && match[1]) {
          const fullPath = match[1].trim();
          const fileName = fullPath.split(/[\/\\]/).pop() || fullPath;
          setSelectedFileForEditor(fileName);
          setShowRightPanel(true);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("openmanus:file-saved", { detail: { path: fileName } }));
          }
        }
        fetchJobFiles(jobId);
      } else if (eventType === "final" || eventType === "done") {
        const resText = payload.data?.result ?? payload.data?.content ?? "Task completed successfully.";
        if (eventType === "final") {
          setFinalResult(safeRender(resText));
        }
        setStatus("completed");
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
    bindEvt("done");
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

  const toggleStep = (key: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [key]: !prev[key],
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
    setLandingAttachedFiles([]);
    setSubmittedPrompt("");
    setActiveJobId(null);
    setActiveChatId(null);
    setHistoryTurns([]);
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

  const handleStartTask = async (customPrompt?: string, customOverride?: any, filesToUpload?: File[]) => {
    const rawText = (customPrompt !== undefined ? customPrompt : inputValue).trim();
    if ((!rawText && (!filesToUpload || filesToUpload.length === 0)) || status === "running") return;

    let finalPrompt = rawText;
    const effectiveMode = customOverride?.mode || execMode;
    const targetChatId = activeChatId || `chat_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    if (filesToUpload && filesToUpload.length > 0) {
      try {
        const formData = new FormData();
        filesToUpload.forEach((f) => formData.append("files", f));
        formData.append("chat_id", targetChatId);
        if (activeJobId) formData.append("job_id", activeJobId);

        const uploadRes = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          const uploadedList: { name: string; path: string }[] = uploadData.files || [];
          if (uploadedList.length > 0) {
            const filesSummary = uploadedList
              .map((f) => `- ${f.name} (located directly in your current workspace directory)`)
              .join("\n");
            finalPrompt = rawText
              ? `${rawText}\n\n[Uploaded User Files in Workspace Directory]:\n${filesSummary}`
              : `Please inspect and process the following uploaded workspace files:\n${filesSummary}`;
          }
        }
      } catch (uploadErr) {
        console.error("Failed to upload files:", uploadErr);
      }
    }

    if (submittedPrompt && (finalResult || steps.length > 0)) {
      const currentTurn: ChatTurn = {
        id: activeJobId || `turn-${Date.now()}`,
        jobId: activeJobId || "",
        prompt: submittedPrompt,
        timestamp: sessionTimestamp || new Date().toLocaleString(),
        steps: [...steps],
        finalResult: finalResult,
        status: status === "failed" ? "failed" : "completed",
        tokensUsed: { ...tokensUsed },
        producedFiles: [...producedFiles],
      };
      setHistoryTurns((prev) => [...prev, currentTurn]);
    }

    setInputValue("");
    setLandingAttachedFiles([]);
    setSubmittedPrompt(finalPrompt);
    setStatus("running");
    setSteps([]);
    setFinalResult(null);
    setCurrentStepNum(1);
    setProducedFiles([]);
    setSelectedFileForEditor(null);
    setExpandedSteps({ "active-1": true });
    setHumanQuery(null);
    setTokensUsed({ input: 0, output: 0, total: 0 });
    setSessionTimestamp(new Date().toLocaleString());

    try {
      const storedOverride = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("omweb_active_llm_override") || "{}") : {};
      const finalOverride = { ...storedOverride, ...(customOverride || {}) };

      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          max_steps: 20,
          chat_id: targetChatId,
          mode: effectiveMode,
          ...finalOverride
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to start run");
      }

      const data = await res.json();
      const jobId = data.job_id;
      const returnedChatId = data.chat_id || targetChatId;
      setActiveChatId(returnedChatId);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/chat/${returnedChatId}`);
      }
      setActiveJobId(jobId);
      connectStream(jobId);
    } catch (err: any) {
      console.error("Execution error:", err);
      setStatus("failed");
      setFinalResult(err?.message || "Execution error encountered.");
    }
  };

  const handleLandingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLandingAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (landingFileInputRef.current) {
      landingFileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const groupStepEvents = (evts: StepEvent[]) => {
    return evts.reduce((acc, s) => {
      const isVisible = (s.content && s.content.trim() !== "") || Boolean(s.toolName);
      if (!isVisible) return acc;
      if (!acc[s.step]) {
        acc[s.step] = [];
      }
      acc[s.step].push(s);
      return acc;
    }, {} as Record<number, StepEvent[]>);
  };

  const activeGroupedSteps = groupStepEvents(steps);

  const quickPills = [
    { label: "Create slides", icon: <Layout size={13} />, prompt: "Create an interactive presentation in HTML with modern slide navigation and CSS styling, then terminate." },
    { label: "Build website", icon: <Globe size={13} />, prompt: "Build a responsive modern single-page website in HTML and Tailwind CSS with a clean hero section and pricing cards, then terminate." },
    { label: "Design", icon: <Palette size={13} />, prompt: "In workspace, create an animated SVG dashboard widget with modern cards and dark mode styling, then terminate." },
    { label: "Create games", icon: <Gamepad2 size={13} />, prompt: "Create a playable HTML5 canvas retro game with keyboard controls, sound effects, and score tracking, then terminate." },
  ];

  const isFreshSession = historyTurns.length === 0 && steps.length === 0 && !submittedPrompt && status !== "running";

  const isRawTraceOutput = Boolean(
    finalResult &&
    (finalResult.includes("Observed output of cmd") || finalResult.startsWith("Step 1:"))
  );

  const lastInformativeThought = [...steps]
    .reverse()
    .find((s) => s.type === "thought" && s.content && !s.content.startsWith("Step "));

  const getLiveStatusMessage = () => {
    if (execMode === "chat") {
      return "Synthesizing conversational response...";
    }
    if (steps.length === 0) {
      return "Analyzing request and formulating execution plan...";
    }
    const lastEvt = steps[steps.length - 1];
    if (lastEvt.type === "tool_call") {
      return `Executing tool: ${lastEvt.toolName || "external tool"}...`;
    }
    if (lastEvt.type === "observation") {
      return "Processing tool observation & planning next action...";
    }
    if (lastEvt.type === "thought") {
      return "Deep reasoning and verifying solution...";
    }
    return "Agent reasoning & executing autonomously...";
  };

  const renderStepAccordion = (prefix: string, stepNum: number, stepEvents: StepEvent[]) => {
    const key = `${prefix}-${stepNum}`;
    const isExpanded = expandedSteps[key] === true;

    return (
      <div key={key} className="border border-border rounded-sm bg-card/60 overflow-hidden shadow-manus-xs transition-all my-2">
        <button
          type="button"
          onClick={() => toggleStep(key)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown size={14} className="text-manus-accent" />
            ) : (
              <ChevronRight size={14} className="text-muted-foreground" />
            )}
            <span className="text-xs font-semibold text-foreground">
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
  };

  return (
    <div className="flex h-full w-full bg-background text-foreground overflow-hidden font-sans">
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
              {submittedPrompt ? submittedPrompt : (activeChatId ? `Chat ${activeChatId}` : (activeJobId ? `Session ${activeJobId}` : "New Session"))}
            </span>

            {historyTurns.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-muted border border-border text-muted-foreground">
                <History size={10} />
                <span>Turn {historyTurns.length + 1}</span>
              </span>
            )}

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

            {currentStepNum > 0 && execMode === "agent" && (
              <span className="text-xs font-mono text-foreground font-semibold px-2 py-0.5 bg-muted rounded-md border border-border/60">
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

        {/* Dynamic Body: Fresh Landing or Centered Multi-Turn Thread */}
        {isFreshSession ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto w-full">
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground tracking-tight mb-4">
              What can I do for you?
            </h1>

            {/* Centered Glowing Mode Switcher */}
            <div className="flex items-center justify-center mb-6">
              <div className="inline-flex items-center bg-card/80 p-1.5 rounded-full border border-border/80 shadow-md backdrop-blur-md gap-1">
                <button
                  type="button"
                  onClick={() => handleModeChange("agent")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer ${
                    execMode === "agent"
                      ? "bg-card text-emerald-500 border border-emerald-500/50 shadow-[0_0_16px_rgba(16,185,129,0.38)] font-semibold ring-1 ring-emerald-500/30"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                  title="Autonomous Agent: multi-step planning, tools & execution"
                >
                  <Bot size={14} className={execMode === "agent" ? "text-emerald-500 animate-pulse" : ""} />
                  <span>Agent</span>
                  {execMode === "agent" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("chat")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer ${
                    execMode === "chat"
                      ? "bg-card text-sky-500 border border-sky-500/50 shadow-[0_0_16px_rgba(14,165,233,0.38)] font-semibold ring-1 ring-sky-500/30"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                  title="Direct Chat: fast response, no tools or execution steps"
                >
                  <MessageSquare size={14} className={execMode === "chat" ? "text-sky-500 animate-pulse" : ""} />
                  <span>Chat</span>
                  {execMode === "chat" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_#0ea5e9] animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Hidden Input for Landing Composer */}
            <input
              type="file"
              multiple
              ref={landingFileInputRef}
              onChange={handleLandingFileChange}
              className="hidden"
            />

            {/* Front Landing Omnibar Box with Drag & Drop */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsLandingDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsLandingDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsLandingDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  setLandingAttachedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                }
              }}
              className={`w-full bg-card rounded-2xl border transition-all text-left p-3.5 shadow-manus-md ${
                isLandingDragging
                  ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                  : "border-border focus-within:ring-1 focus-within:ring-primary focus-within:border-primary"
              }`}
            >
              {/* Attached Files Badges Container */}
              {landingAttachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-border/40">
                  {landingAttachedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted/60 border border-border shadow-xs text-foreground animate-in fade-in"
                    >
                      <FileText size={13} className="text-primary shrink-0" />
                      <span className="font-medium truncate max-w-[160px]" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({formatFileSize(file.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => setLandingAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer ml-1"
                        title="Remove file"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (inputValue.trim() || landingAttachedFiles.length > 0) {
                      handleStartTask(inputValue, undefined, landingAttachedFiles);
                      setLandingAttachedFiles([]);
                    }
                  }
                }}
                rows={3}
                placeholder={
                  landingAttachedFiles.length > 0
                    ? "Add instructions for attached files..."
                    : (execMode === "chat" ? "Chat directly with AI (fast response, no autonomous steps)..." : "Assign an autonomous task or type code to execute...")
                }
                className="w-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => landingFileInputRef.current?.click()}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer relative"
                    title="Attach files or images"
                  >
                    <Paperclip size={15} />
                    {landingAttachedFiles.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground border border-border">
                    <Sparkles size={12} className={execMode === "agent" ? "text-emerald-500" : "text-sky-500"} />
                    <span className="font-mono text-[11px] font-semibold text-foreground">
                      {execMode === "agent" ? "Agent Autonomous Mode" : "Direct Fast Chat"}
                    </span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleStartTask(inputValue, undefined, landingAttachedFiles);
                    setLandingAttachedFiles([]);
                  }}
                  disabled={!inputValue.trim() && landingAttachedFiles.length === 0}
                  className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-manus-xs cursor-pointer hover:bg-primary/90"
                  title="Dispatch Task (Enter)"
                >
                  <ArrowUp size={15} />
                </button>
              </div>
            </div>

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
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="w-full max-w-[1000px] mx-auto space-y-6">
              {/* 1. Render Historical Completed Turns */}
              {historyTurns.map((turn, tIdx) => {
                const isTurnRawTrace = Boolean(
                  turn.finalResult &&
                  (turn.finalResult.includes("Observed output of cmd") || turn.finalResult.startsWith("Step 1:"))
                );
                const turnLastThought = [...turn.steps]
                  .reverse()
                  .find((s) => s.type === "thought" && s.content && !s.content.startsWith("Step "));

                const turnGroupedSteps = groupStepEvents(turn.steps);

                return (
                  <div key={turn.id || tIdx} className="space-y-3 pb-4 border-b border-border/40">
                    {/* User Message — Clean & Borderless */}
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

                    {/* Historical Step Accordions */}
                    {Object.keys(turnGroupedSteps).length > 0 && (
                      <div className="space-y-1.5">
                        {Object.entries(turnGroupedSteps).map(([sNum, sEvts]) =>
                          renderStepAccordion(`turn-${tIdx}`, parseInt(sNum, 10), sEvts)
                        )}
                      </div>
                    )}

                    {/* Deliverable / Result */}
                    {turn.finalResult && (
                      <div className="p-4 rounded-sm bg-manus-success/10 border border-manus-success/30 text-xs space-y-3 shadow-manus-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-manus-success font-semibold tracking-wide text-xs">
                            {turn.status === "failed" ? "EXECUTION STATUS" : `DELIVERABLE COMPLETED #${tIdx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyText(turn.finalResult || "", `turn-res-${tIdx}`)}
                            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md hover:bg-background text-foreground cursor-pointer transition-all border border-border/40"
                          >
                            {copiedSection === `turn-res-${tIdx}` ? (
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

                        {isTurnRawTrace ? (
                          <div className="bg-background/60 p-3 rounded-lg border border-border/50 text-foreground leading-relaxed">
                            <MarkdownRenderer content={turnLastThought ? turnLastThought.content : turn.finalResult} />
                          </div>
                        ) : (
                          <div className="text-foreground leading-relaxed">
                            <MarkdownRenderer content={turn.finalResult} />
                          </div>
                        )}

                        {turn.producedFiles && turn.producedFiles.length > 0 && (
                          <div className="pt-2.5 border-t border-manus-success/20">
                            <span className="text-[11px] font-semibold text-foreground block mb-1.5">
                              Generated Files:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {turn.producedFiles.map((f) => (
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
                );
              })}

              {/* 2. Active Turn Prompt — Clean & Borderless */}
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

              {/* Human Intervention Required */}
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

              {/* Live Contextual Running Status Indicator */}
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

              {/* Active Turn Step Accordions */}
              {execMode === "agent" && Object.keys(activeGroupedSteps).length > 0 && (
                <div className="space-y-1.5">
                  {Object.entries(activeGroupedSteps).map(([stepNumStr, stepEvents]) =>
                    renderStepAccordion("active", parseInt(stepNumStr, 10), stepEvents)
                  )}
                </div>
              )}

              {/* Active Turn Deliverable / Response Card */}
              {finalResult && (
                <div className="p-4 rounded-sm bg-manus-success/10 border border-manus-success/30 text-xs space-y-3 shadow-manus-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-manus-success font-semibold tracking-wide text-xs flex items-center gap-1.5">
                      <span>{execMode === "chat" ? "RESPONSE" : "TASK DELIVERABLE COMPLETED"}</span>
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

                  {isRawTraceOutput ? (
                    <div className="space-y-3">
                      {lastInformativeThought ? (
                        <div className="bg-background/60 p-3 rounded-lg border border-border/50 text-foreground leading-relaxed">
                          <MarkdownRenderer content={lastInformativeThought.content} />
                        </div>
                      ) : (
                        <p className="text-foreground/90 font-medium">
                          Autonomous execution completed successfully. All artifacts and output files are prepared below.
                        </p>
                      )}

                      <div className="border border-border/60 rounded-lg overflow-hidden bg-background/40">
                        <button
                          type="button"
                          onClick={() => setShowRawTrace(!showRawTrace)}
                          className="w-full flex items-center justify-between px-3 py-1.5 text-muted-foreground hover:text-foreground text-[11px] font-mono cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Activity size={12} />
                            <span>Execution Trace & Observations</span>
                          </span>
                          <span>{showRawTrace ? "Hide trace" : "View diagnostic trace"}</span>
                        </button>
                        {showRawTrace && (
                          <div className="p-2.5 border-t border-border/40 font-mono text-[11px] text-muted-foreground bg-muted/30 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {finalResult}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-foreground leading-relaxed">
                      <MarkdownRenderer content={finalResult} />
                    </div>
                  )}

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

              <div ref={chatScrollBottomRef} />
            </div>
          </div>
        )}

        {/* Bottom Floating Omnibar Composer */}
        {!isFreshSession && (
          <div className="p-3 sm:p-4 border-t border-border bg-card/40 shrink-0">
            <Composer
              onSend={(textToSend, files, llmOverride) => {
                handleStartTask(textToSend, llmOverride, files);
              }}
              onStop={handleStopTask}
              isRunning={status === "running"}
              disabled={status === "running"}
            />
          </div>
        )}
      </div>

      {/* Right Sandbox Workspace Panel */}
      {showRightPanel && (
        <div className="flex-1 h-full min-w-0 transition-all">
          <WorkspacePanel
            activeJobId={activeJobId}
            overrideFile={selectedFileForEditor}
            overrideDraft={sandboxDraft}
          />
        </div>
      )}
    </div>
  );
}

export default ChatContainer;
