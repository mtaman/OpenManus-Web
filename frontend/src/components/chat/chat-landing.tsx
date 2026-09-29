"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Bot,
  MessageSquare,
  Paperclip,
  Sparkles,
  ArrowUp,
  Layout,
  Globe,
  Palette,
  Gamepad2,
  FileText,
  X
} from "lucide-react";

interface QuickPill {
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

const QUICK_PILLS: QuickPill[] = [
  { label: "Create slides", icon: <Layout size={13} />, prompt: "Create an interactive presentation in HTML with modern slide navigation and CSS styling, then terminate." },
  { label: "Build website", icon: <Globe size={13} />, prompt: "Build a responsive modern single-page website in HTML and Tailwind CSS with a clean hero section and pricing cards, then terminate." },
  { label: "Design", icon: <Palette size={13} />, prompt: "In workspace, create an animated SVG dashboard widget with modern cards and dark mode styling, then terminate." },
  { label: "Create games", icon: <Gamepad2 size={13} />, prompt: "Create a playable HTML5 canvas retro game with keyboard controls, sound effects, and score tracking, then terminate." },
];

interface ChatLandingProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  execMode: "agent" | "chat";
  handleModeChange: (mode: "agent" | "chat") => void;
  landingAttachedFiles: File[];
  setLandingAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onStartTask: (prompt?: string, override?: any, files?: File[]) => void;
  formatFileSize: (bytes: number) => string;
}

export function ChatLanding({
  inputValue,
  setInputValue,
  execMode,
  handleModeChange,
  landingAttachedFiles,
  setLandingAttachedFiles,
  onStartTask,
  formatFileSize,
}: ChatLandingProps) {
  const [isLandingDragging, setIsLandingDragging] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("qwen3-vl-8b-instruct");
  const [activeProvider, setActiveProvider] = useState<string>("LM Studio (Local)");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const landingFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedModel = localStorage.getItem("omweb_active_model");
      const savedProvider = localStorage.getItem("omweb_active_provider");
      if (savedModel) setActiveModel(savedModel);
      if (savedProvider) setActiveProvider(savedProvider);

      const onModelChange = (e: any) => {
        if (e.detail?.model) setActiveModel(e.detail.model);
        if (e.detail?.provider_name) setActiveProvider(e.detail.provider_name);
      };

      window.addEventListener("omweb:model-change", onModelChange);
      return () => window.removeEventListener("omweb:model-change", onModelChange);
    }
  }, []);

  const handleLandingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLandingAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (landingFileInputRef.current) {
      landingFileInputRef.current.value = "";
    }
  };

  const dynamicPlaceholder =
    execMode === "agent"
      ? `Ask ${activeProvider} (${activeModel}) to execute autonomous tasks...`
      : `Chat directly with ${activeProvider} (${activeModel})...`;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto w-full">
      <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground tracking-tight mb-4">
        What can I do for you?
      </h1>

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

      <input
        type="file"
        multiple
        ref={landingFileInputRef}
        onChange={handleLandingFileChange}
        className="hidden"
      />

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
                onStartTask(inputValue, undefined, landingAttachedFiles);
                setLandingAttachedFiles([]);
              }
            }
          }}
          rows={3}
          placeholder={
            landingAttachedFiles.length > 0
              ? "Add instructions for attached files..."
              : dynamicPlaceholder
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
              onStartTask(inputValue, undefined, landingAttachedFiles);
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
        {QUICK_PILLS.map((pill, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onStartTask(pill.prompt)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/60 hover:bg-muted text-xs text-foreground transition-all cursor-pointer shadow-manus-xs"
          >
            <span className="text-muted-foreground">{pill.icon}</span>
            <span>{pill.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ChatLanding;
