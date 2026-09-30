"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Cpu,
  Cloud,
  Terminal,
  Server,
  ChevronDown,
  Check,
  Plus
} from "lucide-react";

export interface EngineOption {
  id: string;
  name: string;
  mode: "agent" | "chat";
  description?: string;
  icon?: any;
  [key: string]: any;
}

export interface ProviderPayload {
  model: string;
  provider: string;
  provider_name: string;
  base_url: string;
  api_key: string;
  api_type: string;
}

export interface EngineSelectorProps {
  direction?: "up" | "down" | "auto";
}

export function EngineSelector({ direction = "auto" }: EngineSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("qwen3-vl-8b-instruct");
  const [activeProvider, setActiveProvider] = useState<string>("LM Studio (Local)");
  const [activeCloudProviders, setActiveCloudProviders] = useState<any[]>([]);
  const [activeCustomEndpoints, setActiveCustomEndpoints] = useState<any[]>([]);
  const [lmStudioItem, setLmStudioItem] = useState<any>(null);
  const [localGPUModels, setLocalGPUModels] = useState<string[]>([]);
  const [ollamaItem, setOllamaItem] = useState<any>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const loadRealProviders = () => {
    if (typeof window === "undefined") return;

    // 1. Load LM Studio Local Models
    try {
      const storedLM = JSON.parse(localStorage.getItem("omweb_lmstudio_vault") || "null");
      const scanned = JSON.parse(localStorage.getItem("omweb_scanned_models") || "[]");

      const baseModel = storedLM?.model || "qwen3-vl-8b-instruct";
      const combined = Array.from(new Set([
        baseModel,
        ...(Array.isArray(scanned) ? scanned : []),
        ...(storedLM?.savedModels && Array.isArray(storedLM.savedModels) ? storedLM.savedModels : [])
      ])).filter(Boolean);

      setLocalGPUModels(combined);
      setLmStudioItem(storedLM || {
        baseUrl: "http://127.0.0.1:1234/v1",
        model: baseModel,
        apiKey: ""
      });
    } catch (e) {}

    // 2. Load Ollama ONLY IF it has saved/scanned models
    try {
      const storedOllama = JSON.parse(localStorage.getItem("omweb_ollama_vault") || "null");
      if (storedOllama && Array.isArray(storedOllama.savedModels) && storedOllama.savedModels.length > 0) {
        setOllamaItem(storedOllama);
      } else {
        setOllamaItem(null);
      }
    } catch (e) {
      setOllamaItem(null);
    }

    // 3. Load Cloud Providers
    try {
      const storedCloud = JSON.parse(localStorage.getItem("omweb_cloud_vault") || "[]");
      if (Array.isArray(storedCloud)) {
        const configuredOnly = storedCloud.filter(
          (cp: any) =>
            cp.id !== "ollama" &&
            typeof cp.apiKey === "string" &&
            cp.apiKey.trim() !== ""
        );
        setActiveCloudProviders(configuredOnly);
      } else {
        setActiveCloudProviders([]);
      }
    } catch (e) {
      setActiveCloudProviders([]);
    }

    // 4. Load Custom Endpoints
    try {
      const storedCustom = JSON.parse(localStorage.getItem("omweb_custom_endpoints") || "[]");
      if (Array.isArray(storedCustom)) {
        setActiveCustomEndpoints(storedCustom);
      } else {
        setActiveCustomEndpoints([]);
      }
    } catch (e) {
      setActiveCustomEndpoints([]);
    }

    // 5. Restore active selection
    const savedModel = localStorage.getItem("omweb_active_model");
    const savedProvider = localStorage.getItem("omweb_active_provider");
    if (savedModel) setActiveModel(savedModel);
    if (savedProvider) setActiveProvider(savedProvider);
  };

  useEffect(() => {
    loadRealProviders();

    const onModelChange = (e: any) => {
      if (e.detail?.model) setActiveModel(e.detail.model);
      if (e.detail?.provider_name) setActiveProvider(e.detail.provider_name);
    };

    window.addEventListener("omweb:model-change", onModelChange);
    return () => window.removeEventListener("omweb:model-change", onModelChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      loadRealProviders();
      if (direction === "up") {
        setOpenUpward(true);
      } else if (direction === "down") {
        setOpenUpward(false);
      } else if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpward(spaceBelow < 360);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleSelectEngine = (payload: ProviderPayload) => {
    setActiveModel(payload.model);
    setActiveProvider(payload.provider_name);

    if (typeof window !== "undefined") {
      localStorage.setItem("omweb_active_model", payload.model);
      localStorage.setItem("omweb_active_provider", payload.provider_name);
      localStorage.setItem("omweb_active_llm_override", JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent("omweb:model-change", { detail: payload }));
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-mono rounded-md border border-border bg-card hover:bg-muted text-foreground transition-all shadow-manus-xs cursor-pointer"
        title="Select Active AI Provider & Model"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-semibold text-primary truncate max-w-[130px]">{activeProvider}:</span>
        <span className="text-foreground truncate max-w-[140px]">{activeModel}</span>
        <ChevronDown size={11} className={`text-muted-foreground transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 w-88 bg-card border border-border rounded-lg shadow-xl p-2 z-50 space-y-2.5 max-h-96 overflow-y-auto font-sans animate-in fade-in ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 flex items-center justify-between">
            <span>Verified AI Providers & Models</span>
            <Server size={11} />
          </div>

          {/* 1. LM STUDIO LOCAL GPU SECTION */}
          <div className="rounded-md bg-muted/20 border border-border/40 p-1.5 space-y-1">
            <div className="flex items-center justify-between px-1 py-0.5 text-[11px] font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Cpu size={12} className="text-primary" />
                <span>LM Studio (Local GPU)</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {localGPUModels.length} {localGPUModels.length === 1 ? "model" : "models"}
              </span>
            </div>

            <div className="space-y-0.5 pl-3">
              {localGPUModels.map((m) => {
                const isSelected = activeProvider.includes("LM Studio") && activeModel === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      handleSelectEngine({
                        model: m,
                        provider: "lmstudio",
                        provider_name: "LM Studio (Local)",
                        base_url: lmStudioItem?.baseUrl || "http://127.0.0.1:1234/v1",
                        api_key: lmStudioItem?.apiKey || "",
                        api_type: ""
                      })
                    }
                    className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 text-primary font-medium border border-primary/30"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="font-mono truncate">{m}</span>
                    {isSelected && <Check size={12} className="text-primary shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. OLLAMA LOCAL SECTION */}
          {ollamaItem && ollamaItem.savedModels && ollamaItem.savedModels.length > 0 && (
            <div className="rounded-md bg-muted/20 border border-border/40 p-1.5 space-y-1">
              <div className="flex items-center justify-between px-1 py-0.5 text-[11px] font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Terminal size={12} className="text-amber-500" />
                  <span>Ollama (Local Server)</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {ollamaItem.savedModels.length} {ollamaItem.savedModels.length === 1 ? "model" : "models"}
                </span>
              </div>

              <div className="space-y-0.5 pl-3">
                {ollamaItem.savedModels.map((m: string) => {
                  const isSelected = activeProvider.includes("Ollama") && activeModel === m;
                  const bUrl = ollamaItem.baseUrl.endsWith("/v1") ? ollamaItem.baseUrl : `${ollamaItem.baseUrl}/v1`;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        handleSelectEngine({
                          model: m,
                          provider: "ollama",
                          provider_name: "Ollama (Local)",
                          base_url: bUrl,
                          api_key: "",
                          api_type: ""
                        })
                      }
                      className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 text-primary font-medium border border-primary/30"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="font-mono truncate">{m}</span>
                      {isSelected && <Check size={12} className="text-primary shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. ACTIVE CLOUD PROVIDERS */}
          {activeCloudProviders.length > 0 && (
            <div className="pt-1 border-t border-border/40 space-y-1.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase px-2 block mb-1">
                Cloud Providers & Saved Models
              </span>
              {activeCloudProviders.map((cp) => {
                const modelsList = cp.savedModels && cp.savedModels.length > 0 ? cp.savedModels : [cp.model];
                return (
                  <div key={cp.id} className="rounded-md bg-muted/20 border border-border/40 p-1.5 space-y-1">
                    <div className="flex items-center justify-between px-1 py-0.5 text-[11px] font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Cloud size={12} className="text-sky-500" />
                        <span>{cp.name}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {modelsList.length} {modelsList.length === 1 ? "model" : "models"}
                      </span>
                    </div>

                    <div className="space-y-0.5 pl-3">
                      {modelsList.map((m: string) => {
                        const isSelected = activeProvider === cp.name && activeModel === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() =>
                              handleSelectEngine({
                                model: m,
                                provider: cp.id,
                                provider_name: cp.name,
                                base_url: cp.baseUrl,
                                api_key: cp.apiKey,
                                api_type: cp.type || ""
                              })
                            }
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs text-left transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 text-primary font-medium border border-primary/30"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="font-mono truncate">{m}</span>
                            {isSelected && <Check size={12} className="text-primary shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. CUSTOM ENDPOINTS */}
          {activeCustomEndpoints.length > 0 && (
            <div className="pt-1 border-t border-border/40 space-y-1.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase px-2 block mb-1">
                Custom Endpoints
              </span>
              {activeCustomEndpoints.map((ce) => {
                const modelsList = ce.savedModels && ce.savedModels.length > 0 ? ce.savedModels : [ce.defaultModel];
                return (
                  <div key={ce.id} className="rounded-md bg-muted/20 border border-border/40 p-1.5 space-y-1">
                    <div className="flex items-center justify-between px-1 py-0.5 text-[11px] font-semibold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Terminal size={12} className="text-amber-500" />
                        <span>{ce.name}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {modelsList.length} {modelsList.length === 1 ? "model" : "models"}
                      </span>
                    </div>

                    <div className="space-y-0.5 pl-3">
                      {modelsList.map((m: string) => {
                        const isSelected = activeProvider === ce.name && activeModel === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() =>
                              handleSelectEngine({
                                model: m,
                                provider: ce.providerId,
                                provider_name: ce.name,
                                base_url: ce.endpointUrl,
                                api_key: ce.apiKey || "",
                                api_type: ""
                              })
                            }
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs text-left transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 text-primary font-medium border border-primary/30"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="font-mono truncate">{m}</span>
                            {isSelected && <Check size={12} className="text-primary shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EngineSelector;
