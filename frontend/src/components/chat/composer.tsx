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
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComposerProps {
  onSend: (text: string, files?: File[], llmOverride?: any) => void;
  onStop?: () => void;
  isRunning?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, onStop, isRunning, disabled, placeholder }: ComposerProps) {
  const [text, setText] = useState("");
  const [activeModel, setActiveModel] = useState<string>("qwen3-vl-8b-instruct");
  const [activeProvider, setActiveProvider] = useState<string>("LM Studio (Local)");
  const [execMode, setExecMode] = useState<"agent" | "chat">("agent");
  const [customList, setCustomList] = useState<any[]>([]);
  const [cloudList, setCloudList] = useState<any[]>([]);
  const [lmStudioItem, setLmStudioItem] = useState<any>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      mode: execMode
    };

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("omweb_active_llm_override");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...base, ...parsed, mode: execMode };
        } catch (e) {}
      }
    }
    return base;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() || isRunning || disabled) return;
    const currentPayload = getActivePayload();
    onSend(text.trim(), undefined, currentPayload);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const dynamicPlaceholder = placeholder || (
    execMode === "agent"
      ? `Ask ${activeProvider} (${activeModel}) to execute autonomous tasks...`
      : `Chat directly with ${activeProvider} (${activeModel})...`
  );

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Top Model & Provider Switcher Bar */}
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

      {/* Input Box */}
      <div className="relative flex flex-col w-full rounded-xl border border-border bg-card shadow-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder={dynamicPlaceholder}
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
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Attach files"
            >
              <Paperclip size={15} />
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
                disabled={!text.trim() || disabled}
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
