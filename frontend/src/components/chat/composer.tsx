"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Paperclip,
  StopCircle,
  ChevronDown,
  Check,
  Server,
  Terminal,
  Cpu,
  Cloud,
  Bot,
  MessageSquare,
  FileText,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentSelector } from "./agent-selector";
import { useChatStore } from "@/stores/chat-store";

interface ComposerProps {
  onSend: (text: string, files?: File[], llmOverride?: any) => void;
  onStop?: () => void;
  isRunning?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, onStop, isRunning, disabled, placeholder }: ComposerProps) {
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("qwen3-vl-8b-instruct");
  const [activeProvider, setActiveProvider] = useState<string>("LM Studio (Local)");
  const [execMode, setExecMode] = useState<"agent" | "chat">("agent");
  const [customList, setCustomList] = useState<any[]>([]);
  const [cloudList, setCloudList] = useState<any[]>([]);
  const [lmStudioItem, setLmStudioItem] = useState<any>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);

  const { selectedAgentId } = useChatStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedModel = localStorage.getItem("omweb_active_model");
      const savedProvider = localStorage.getItem("omweb_active_provider");
      const savedMode = localStorage.getItem("omweb_exec_mode") as "agent" | "chat" | null;

      if (savedModel) setActiveModel(savedModel);
      if (savedProvider) setActiveProvider(savedProvider);
      if (savedMode === "agent" || savedMode === "chat") {
        setExecMode(savedMode);
      }

      try {
        const storedLM = JSON.parse(localStorage.getItem("omweb_lmstudio_vault") || "null");
        if (storedLM) setLmStudioItem(storedLM);
      } catch (e) {}

      try {
        const storedCloud = JSON.parse(localStorage.getItem("omweb_cloud_vault") || "[]");
        if (Array.isArray(storedCloud)) setCloudList(storedCloud);
      } catch (e) {}

      try {
        const storedCustom = JSON.parse(localStorage.getItem("omweb_custom_endpoints") || "[]");
        if (Array.isArray(storedCustom)) setCustomList(storedCustom);
      } catch (e) {}
    }
  }, []);

  const handleModeChange = (mode: "agent" | "chat") => {
    setExecMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("omweb_exec_mode", mode);
      window.dispatchEvent(new CustomEvent("omweb:mode-change", { detail: mode }));
    }
  };

  const handleSelectEngine = (payload: {
    model: string;
    provider: string;
    provider_name: string;
    base_url: string;
    api_key: string;
    api_type: string;
  }) => {
    setActiveModel(payload.model);
    setActiveProvider(payload.provider_name);

    if (typeof window !== "undefined") {
      localStorage.setItem("omweb_active_model", payload.model);
      localStorage.setItem("omweb_active_provider", payload.provider_name);
      localStorage.setItem("omweb_active_llm_override", JSON.stringify(payload));
    }
    setShowModelMenu(false);
  };

  const getActivePayload = () => {
    let base = {
      model: activeModel,
      provider: activeProvider.toLowerCase().replace(/[^a-z0-9]/g, ""),
      provider_name: activeProvider,
      base_url: lmStudioItem?.baseUrl || "http://127.0.0.1:1234/v1",
      api_key: lmStudioItem?.apiKey || "",
      api_type: "",
      mode: execMode,
      agent_id: execMode === "agent" ? (selectedAgentId || "manus") : "manus"
    };

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("omweb_active_llm_override");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...base, ...parsed, mode: execMode, agent_id: base.agent_id };
        } catch (e) {}
      }
    }
    return base;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setAttachedFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!text.trim() && attachedFiles.length === 0) || isRunning || disabled) return;
    const currentPayload = getActivePayload();
    onSend(text.trim(), attachedFiles.length > 0 ? attachedFiles : undefined, currentPayload);
    setText("");
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const dynamicPlaceholder = placeholder || (
    execMode === "agent"
      ? `Ask ${activeProvider} (${activeModel}) to execute autonomous tasks...`
      : `Chat directly with ${activeProvider} (${activeModel})...`
  );

  return (
    <div className="relative w-full max-w-[1000px] mx-auto font-sans">
      {/* Hidden File Input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Model & Engine Switcher Bar */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-mono bg-card hover:bg-muted border border-border text-foreground transition-all cursor-pointer shadow-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-primary">{activeProvider}:</span>
            <span className="text-foreground">{activeModel}</span>
            <ChevronDown size={11} className="text-muted-foreground ml-0.5" />
          </button>

          {showModelMenu && (
            <div className="absolute bottom-full mb-1.5 left-0 w-80 bg-card border border-border rounded-lg shadow-xl p-2 z-50 space-y-2 max-h-80 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 flex items-center justify-between">
                <span>Select AI Provider</span>
                <Server size={11} />
              </div>

              {/* Local LM Studio Option */}
              <button
                type="button"
                onClick={() =>
                  handleSelectEngine({
                    model: lmStudioItem?.model || "qwen3-vl-8b-instruct",
                    provider: "lmstudio",
                    provider_name: "LM Studio (Local)",
                    base_url: lmStudioItem?.baseUrl || "http://127.0.0.1:1234/v1",
                    api_key: lmStudioItem?.apiKey || "",
                    api_type: ""
                  })
                }
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left hover:bg-muted text-foreground cursor-pointer"
              >
                <div>
                  <span className="font-semibold flex items-center gap-1.5">
                    <Cpu size={12} className="text-primary" /> LM Studio (Local GPU)
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono block pl-4">
                    {lmStudioItem?.model || "qwen3-vl-8b-instruct"}
                  </span>
                </div>
                {activeProvider.includes("LM Studio") && <Check size={13} className="text-emerald-500 shrink-0" />}
              </button>

              {/* Cloud Providers List */}
              {cloudList.length > 0 && (
                <div className="pt-1 border-t border-border/40">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase px-2 block mb-1">
                    Cloud Providers
                  </span>
                  {cloudList.map((cp) => (
                    <button
                      key={cp.id}
                      type="button"
                      onClick={() =>
                        handleSelectEngine({
                          model: cp.model,
                          provider: cp.id,
                          provider_name: cp.name,
                          base_url: cp.baseUrl,
                          api_key: cp.apiKey,
                          api_type: cp.type || ""
                        })
                      }
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left hover:bg-muted text-foreground cursor-pointer"
                    >
                      <div>
                        <span className="font-medium flex items-center gap-1.5">
                          <Cloud size={12} className="text-sky-500" /> {cp.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono block pl-4">{cp.model}</span>
                      </div>
                      {activeProvider === cp.name && <Check size={13} className="text-emerald-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Custom Endpoints List */}
              {customList.length > 0 && (
                <div className="pt-1 border-t border-border/40">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase px-2 block mb-1">
                    Custom Endpoints
                  </span>
                  {customList.map((ce) => (
                    <button
                      key={ce.id}
                      type="button"
                      onClick={() =>
                        handleSelectEngine({
                          model: ce.defaultModel,
                          provider: ce.providerId,
                          provider_name: ce.name,
                          base_url: ce.endpointUrl,
                          api_key: ce.apiKey || "",
                          api_type: ""
                        })
                      }
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left hover:bg-muted text-foreground cursor-pointer"
                    >
                      <div>
                        <span className="font-medium flex items-center gap-1.5">
                          <Terminal size={12} className="text-amber-500" /> {ce.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono block pl-4">{ce.defaultModel}</span>
                      </div>
                      {activeProvider === ce.name && <Check size={13} className="text-emerald-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <span className="text-[10px] text-muted-foreground">Press Enter to send, Shift+Enter for new line</span>
      </div>

      {/* Floating Omnibar Input Box with Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col w-full rounded-xl border bg-card shadow-lg transition-all ${
          isDragging
            ? "border-primary ring-2 ring-primary/40 bg-primary/5"
            : "border-border focus-within:ring-1 focus-within:ring-primary focus-within:border-primary"
        }`}
      >
        {/* Attached Files Badges Container */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2.5 pb-1 border-b border-border/40 bg-muted/20">
            {attachedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-card border border-border shadow-xs text-foreground animate-in fade-in"
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
                  onClick={() => handleRemoveFile(idx)}
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
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder={attachedFiles.length > 0 ? "Add instructions for attached files..." : dynamicPlaceholder}
          rows={1}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none max-h-[220px] font-sans"
        />

        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted relative"
              title="Attach files or images"
            >
              <Paperclip size={15} />
              {attachedFiles.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>

            {/* Mode Toggle Control */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-[11px]">
              <button
                type="button"
                onClick={() => handleModeChange("agent")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                  execMode === "agent"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Autonomous Agent: multi-step planning, tool execution, bash & browser"
              >
                <Bot size={13} className={execMode === "agent" ? "text-primary" : ""} />
                <span>Agent</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("chat")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                  execMode === "chat"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Direct Chat: fast response, no tools or execution steps"
              >
                <MessageSquare size={13} className={execMode === "chat" ? "text-primary" : ""} />
                <span>Chat</span>
              </button>
            </div>

            {/* Agent Selector: CONDITIONAL (Visible ONLY when execMode === 'agent') */}
            {execMode === "agent" && (
              <div className="animate-in fade-in duration-150">
                <AgentSelector disabled={disabled || isRunning} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button
                type="button"
                onClick={onStop}
                size="sm"
                className="h-8 px-3 text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <StopCircle size={14} />
                <span>Stop</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSend}
                disabled={(!text.trim() && attachedFiles.length === 0) || disabled}
                size="sm"
                className="h-8 px-3.5 text-xs bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
              >
                <span>Send</span>
                <Send size={13} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Composer;
