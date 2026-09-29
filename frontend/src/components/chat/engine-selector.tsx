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
  Settings,
  Plus
} from "lucide-react";

interface ProviderPayload {
  model: string;
  provider: string;
  provider_name: string;
  base_url: string;
  api_key: string;
  api_type: string;
}

export function EngineSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("qwen3-vl-8b-instruct");
  const [activeProvider, setActiveProvider] = useState<string>("LM Studio (Local)");
  const [activeCloudProviders, setActiveCloudProviders] = useState<any[]>([]);
  const [activeCustomEndpoints, setActiveCustomEndpoints] = useState<any[]>([]);
  const [lmStudioItem, setLmStudioItem] = useState<any>(null);
  const [backendConfig, setBackendConfig] = useState<any>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadRealProviders = async () => {
    if (typeof window === "undefined") return;

    // 1. Fetch Backend Default Configuration from config.toml
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        if (data.llm) {
          setBackendConfig(data.llm);
        }
      }
    } catch (err) {
      console.warn("Could not fetch backend /api/config:", err);
    }

    // 2. Load Local GPU (LM Studio) Vault
    try {
      const storedLM = JSON.parse(localStorage.getItem("omweb_lmstudio_vault") || "null");
      if (storedLM) {
        setLmStudioItem(storedLM);
      } else {
        setLmStudioItem({
          baseUrl: "http://127.0.0.1:1234/v1",
          model: "qwen3-vl-8b-instruct",
          apiKey: ""
        });
      }
    } catch (e) {}

    // 3. Load ONLY Cloud Providers that have a real, saved API Key
    try {
      const storedCloud = JSON.parse(localStorage.getItem("omweb_cloud_vault") || "[]");
      if (Array.isArray(storedCloud)) {
        // Filter strictly: API key must be non-empty string
        const configuredOnly = storedCloud.filter(
          (cp: any) => typeof cp.apiKey === "string" && cp.apiKey.trim() !== ""
        );
        setActiveCloudProviders(configuredOnly);
      } else {
        setActiveCloudProviders([]);
      }
    } catch (e) {
      setActiveCloudProviders([]);
    }

    // 4. Load Custom Endpoints configured by user
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

    // 5. Restore current active selection
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
        type="button"
        onClick={() => {
          loadRealProviders();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-mono rounded-md border border-border bg-card hover:bg-muted text-foreground transition-all shadow-manus-xs cursor-pointer"
        title="Select Active AI Provider and Model"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-semibold text-primary truncate max-w-[130px]">{activeProvider}:</span>
        <span className="text-foreground truncate max-w-[140px]">{activeModel}</span>
        <ChevronDown size={11} className={`text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 w-80 bg-card border border-border rounded-lg shadow-xl p-2 z-50 space-y-2.5 max-h-84 overflow-y-auto font-sans animate-in fade-in">
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 flex items-center justify-between">
            <span>Verified AI Providers</span>
            <Server size={11} />
          </div>

          {/* 1. Local GPU (LM Studio) Provider */}
          <div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase px-2 block mb-1">
              Local Hardware GPU
            </span>
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
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left hover:bg-muted text-foreground cursor-pointer transition-colors"
            >
              <div>
                <span className="font-semibold flex items-center gap-1.5 text-foreground">
                  <Cpu size={12} className="text-primary" /> LM Studio (Local GPU)
                </span>
                <span className="text-[10px] text-muted-foreground font-mono block pl-4 mt-0.5">
                  {lmStudioItem?.model || "qwen3-vl-8b-instruct"}
                </span>
              </div>
              {activeProvider.includes("LM Studio") && <Check size={13} className="text-emerald-500 shrink-0" />}
            </button>
          </div>

          {/* 2. Real Cloud Providers (Rendered ONLY if API Key is configured) */}
          {activeCloudProviders.length > 0 && (
            <div className="pt-1 border-t border-border/40">
              <span className="text-[9px] font-bold text-muted-foreground uppercase px-2 block mb-1">
                Active Cloud Providers
              </span>
              {activeCloudProviders.map((cp) => (
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
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left hover:bg-muted text-foreground cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-medium flex items-center gap-1.5 text-foreground">
                      <Cloud size={12} className="text-sky-500" /> {cp.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono block pl-4 mt-0.5">{cp.model}</span>
                  </div>
                  {activeProvider === cp.name && <Check size={13} className="text-emerald-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* 3. Custom Endpoints (User-added servers) */}
          {activeCustomEndpoints.length > 0 && (
            <div className="pt-1 border-t border-border/40">
              <span className="text-[9px] font-bold text-muted-foreground uppercase px-2 block mb-1">
                Custom Endpoints
              </span>
              {activeCustomEndpoints.map((ce) => (
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
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left hover:bg-muted text-foreground cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-medium flex items-center gap-1.5 text-foreground">
                      <Terminal size={12} className="text-amber-500" /> {ce.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono block pl-4 mt-0.5">{ce.defaultModel}</span>
                  </div>
                  {activeProvider === ce.name && <Check size={13} className="text-emerald-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* 4. Settings Shortcut if no Cloud API keys are configured */}
          {activeCloudProviders.length === 0 && (
            <div className="p-2 rounded bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>No Cloud API Keys configured yet.</span>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-[10px]"
              >
                <Plus size={10} /> Add in Settings
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EngineSelector;
