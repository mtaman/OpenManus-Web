"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles, Layers, RefreshCw, Check, AlertTriangle,
  Zap, Bot, Plus, ArrowUpCircle, Trash2, Eye, EyeOff, Sliders,
  Search, CheckCircle2, ShieldCheck, KeyRound, Globe, Server, Radio,
  HelpCircle, XCircle, ShieldAlert, Cpu, Cloud, Terminal, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  HubSubTab,
  CustomEndpoint,
  CloudProviderVaultItem,
  LMStudioSettings,
  FullAppConfig,
  ApiModeType
} from "../types";

interface LLMTabProps {
  config: FullAppConfig;
  setConfig: React.Dispatch<React.SetStateAction<FullAppConfig>>;
  lmStudioSettings: LMStudioSettings;
  setLmStudioSettings: React.Dispatch<React.SetStateAction<LMStudioSettings>>;
  cloudProviders: CloudProviderVaultItem[];
  setCloudProviders: React.Dispatch<React.SetStateAction<CloudProviderVaultItem[]>>;
  customEndpoints: CustomEndpoint[];
  setCustomEndpoints: React.Dispatch<React.SetStateAction<CustomEndpoint[]>>;
  availableModels: string[];
  fetchingModels: boolean;
  scanError: string | null;
  handleFetchModels: () => void;
  assignDetectedModel: (model: string, target: "primary" | "vision") => void;
  activateEngine: (providerId: string, providerName: string, model: string, baseUrl: string, apiKey: string, apiType: string) => void;
  testEndpoint: (baseUrl: string, apiKey: string, model: string, apiType?: string) => Promise<{ ok: boolean; message: string; latency?: number }>;
}

export function LLMTab({
  config,
  setConfig,
  lmStudioSettings,
  setLmStudioSettings,
  cloudProviders,
  setCloudProviders,
  customEndpoints,
  setCustomEndpoints,
  availableModels,
  fetchingModels,
  scanError,
  handleFetchModels,
  assignDetectedModel,
  activateEngine,
  testEndpoint,
}: LLMTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<HubSubTab>("overview");
  const [modelSearch, setModelSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [testingId, setTestingId] = useState<string | null>(null);

  // New/Edit Custom Endpoint State (Direct Reference: image_be6941.png)
  const [endpointForm, setEndpointForm] = useState<{
    name: string;
    providerId: string;
    endpointUrl: string;
    apiMode: ApiModeType;
    defaultModel: string;
    contextWindow: string;
    apiKey: string;
    useForNewChats: boolean;
  }>({
    name: "GigaChat-3-Ultra",
    providerId: "gigachat-3-ultra",
    endpointUrl: "http://127.0.0.1:8090/v1",
    apiMode: "Auto-detect",
    defaultModel: "GigaChat-3-Ultra",
    contextWindow: "Auto",
    apiKey: "",
    useForNewChats: true,
  });

  const [showKeys, setShowKeys] = useState<{ [id: string]: boolean }>({});

  const tokenPresets = [4096, 8192, 16384, 32768, 65536, 131072];

  const categories = [
    { id: "all", label: "All Models" },
    { id: "qwen", label: "Qwen" },
    { id: "deepseek", label: "DeepSeek" },
    { id: "claude", label: "Claude" },
    { id: "gpt", label: "GPT / OpenAI" },
    { id: "glm", label: "GLM" },
    { id: "gemini", label: "Gemini" },
  ];

  const toggleKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sanitizeTokenInput = (raw: any): number => {
    const clean = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
    if (isNaN(clean) || clean <= 0) return 8192;
    if (clean > 2000000) return 8192;
    return clean;
  };

  const filteredModels = useMemo(() => {
    return availableModels.filter((m) => {
      const matchSearch = m.toLowerCase().includes(modelSearch.toLowerCase().trim());
      if (!matchSearch) return false;
      if (selectedCategory === "all") return true;
      if (selectedCategory === "qwen") return m.toLowerCase().includes("qwen");
      if (selectedCategory === "deepseek") return m.toLowerCase().includes("deepseek");
      if (selectedCategory === "claude") return m.toLowerCase().includes("claude");
      if (selectedCategory === "gpt") return m.toLowerCase().includes("gpt");
      if (selectedCategory === "glm") return m.toLowerCase().includes("glm");
      if (selectedCategory === "gemini") return m.toLowerCase().includes("gemini");
      return true;
    });
  }, [availableModels, modelSearch, selectedCategory]);

  // Test LM Studio Local
  const handleTestLMStudio = async () => {
    setTestingId("lmstudio");
    try {
      const res = await testEndpoint(lmStudioSettings.baseUrl, lmStudioSettings.apiKey, lmStudioSettings.model, "");
      setLmStudioSettings((prev) => ({
        ...prev,
        status: res.ok ? "online" : "offline",
        latency: res.latency,
        lastError: res.ok ? undefined : res.message
      }));
    } finally {
      setTestingId(null);
    }
  };

  // Test Cloud Provider
  const handleTestCloud = async (providerId: string) => {
    const cp = cloudProviders.find((p) => p.id === providerId);
    if (!cp) return;
    setTestingId(providerId);
    try {
      const res = await testEndpoint(cp.baseUrl, cp.apiKey, cp.model, cp.type);
      setCloudProviders((prev) =>
        prev.map((item) =>
          item.id === providerId
            ? { ...item, status: res.ok ? "online" : "offline", latency: res.latency, lastError: res.ok ? undefined : res.message }
            : item
        )
      );
    } finally {
      setTestingId(null);
    }
  };

  // Test and Save Custom Endpoint (Reference: image_be6941.png)
  const handleTestCustomForm = async () => {
    setTestingId("custom_form");
    try {
      const res = await testEndpoint(endpointForm.endpointUrl, endpointForm.apiKey, endpointForm.defaultModel, "");
      alert(res.ok ? `Success! Connected in ${res.latency} ms` : `Failed: ${res.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleSaveCustomEndpoint = () => {
    if (!endpointForm.name.trim() || !endpointForm.endpointUrl.trim()) {
      alert("Name and Endpoint URL are required.");
      return;
    }
    const newEndpoint: CustomEndpoint = {
      id: `custom_${Date.now()}`,
      name: endpointForm.name.trim(),
      providerId: endpointForm.providerId.trim() || endpointForm.name.toLowerCase().replace(/\s+/g, "-"),
      endpointUrl: endpointForm.endpointUrl.trim(),
      apiMode: endpointForm.apiMode,
      defaultModel: endpointForm.defaultModel.trim() || "default",
      contextWindow: endpointForm.contextWindow,
      apiKey: endpointForm.apiKey.trim(),
      status: "untested",
      useForNewChats: endpointForm.useForNewChats
    };

    setCustomEndpoints((prev) => [newEndpoint, ...prev]);
    alert(`Endpoint '${newEndpoint.name}' saved successfully!`);
  };

  const handleDeleteCustomEndpoint = (id: string) => {
    setCustomEndpoints((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6 max-w-4xl font-sans">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wide">
            Model Hub & Multi-Provider Architecture
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Dedicated engines for local GPUs, cloud credentials, custom endpoints, and role routing.
        </p>

        {/* 4 Professional Sub-Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-border/60">
          <button
            type="button"
            onClick={() => setActiveSubTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeSubTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio size={13} />
            <span>Overview & Ops</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("lmstudio")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeSubTab === "lmstudio"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cpu size={13} />
            <span>LM Studio & Local</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("cloud")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeSubTab === "cloud"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cloud size={13} />
            <span>Cloud Providers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("custom")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeSubTab === "custom"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal size={13} />
            <span>Custom Endpoints</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: OVERVIEW & OPS (الحالة العامة ومصفوفة الاتصال) */}
      {/* ========================================================================= */}
      {activeSubTab === "overview" && (
        <div className="space-y-5">
          {/* Active Engines Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card space-y-2 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Primary Autonomous Engine [llm]
              </span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono text-foreground">{config.llm.model}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {config.llm.provider_name || config.llm.provider}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono block truncate">
                {config.llm.base_url}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-2 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Visual Perception Engine [llm.vision]
              </span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono text-foreground">{config.llm_vision.model}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-500">
                  {config.llm_vision.provider_name || config.llm_vision.provider}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono block truncate">
                {config.llm_vision.base_url}
              </span>
            </div>
          </div>

          {/* Providers Connectivity Health Matrix */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Connectivity Health Matrix
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Truthful live verification. Switch active primary with one click.
                </span>
              </div>
            </div>

            <div className="divide-y divide-border/60 text-xs">
              {/* Row: LM Studio */}
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {lmStudioSettings.status === "online" ? (
                      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    ) : lmStudioSettings.status === "offline" ? (
                      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                    ) : (
                      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
                    )}
                  </span>
                  <span className="font-semibold text-foreground">LM Studio (Local GPU)</span>
                  <span className="text-[10px] text-muted-foreground font-mono">({lmStudioSettings.model})</span>
                </div>
                <div className="flex items-center gap-2">
                  {lmStudioSettings.status === "online" && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                      {lmStudioSettings.latency} ms
                    </span>
                  )}
                  <button
                    onClick={() =>
                      activateEngine("lmstudio", "LM Studio (Local)", lmStudioSettings.model, lmStudioSettings.baseUrl, lmStudioSettings.apiKey, "")
                    }
                    className="px-2 py-0.5 rounded text-[10px] bg-primary/10 hover:bg-primary/20 text-primary font-medium cursor-pointer"
                  >
                    Activate
                  </button>
                </div>
              </div>

              {/* Rows: Cloud Providers */}
              {cloudProviders.map((cp) => (
                <div key={cp.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      {cp.status === "online" ? (
                        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      ) : cp.status === "offline" ? (
                        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                      ) : (
                        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
                      )}
                    </span>
                    <span className="font-semibold text-foreground">{cp.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">({cp.model})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cp.status === "online" && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                        {cp.latency} ms
                      </span>
                    )}
                    <button
                      onClick={() =>
                        activateEngine(cp.id, cp.name, cp.model, cp.baseUrl, cp.apiKey, cp.type)
                      }
                      className="px-2 py-0.5 rounded text-[10px] bg-primary/10 hover:bg-primary/20 text-primary font-medium cursor-pointer"
                    >
                      Activate
                    </button>
                  </div>
                </div>
              ))}

              {/* Rows: Custom Endpoints */}
              {customEndpoints.map((ce) => (
                <div key={ce.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span className="font-semibold text-foreground">{ce.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">({ce.defaultModel})</span>
                  </div>
                  <button
                    onClick={() =>
                      activateEngine(ce.providerId, ce.name, ce.defaultModel, ce.endpointUrl, ce.apiKey, "")
                    }
                    className="px-2 py-0.5 rounded text-[10px] bg-primary/10 hover:bg-primary/20 text-primary font-medium cursor-pointer"
                  >
                    Activate
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Hyperparameters */}
          <div className="p-4 rounded-xl border border-border bg-card grid grid-cols-1 md:grid-cols-2 gap-4 shadow-xs">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Context Window (max_tokens)</label>
              <input
                type="number"
                value={sanitizeTokenInput(config.llm.max_tokens)}
                onChange={(e) => setConfig({ ...config, llm: { ...config.llm, max_tokens: sanitizeTokenInput(e.target.value) } })}
                className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground font-mono shadow-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Temperature: {Number(config.llm.temperature).toFixed(2)}
              </label>
              <input
                type="range"
                min="0.0"
                max="1.5"
                step="0.05"
                value={config.llm.temperature}
                onChange={(e) => setConfig({ ...config, llm: { ...config.llm, temperature: parseFloat(e.target.value) || 0 } })}
                className="w-full accent-primary cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: LM STUDIO & LOCAL MODELS (مطابق تماماً للمرجع image_be69de.png) */}
      {/* ========================================================================= */}
      {activeSubTab === "lmstudio" && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  LM Studio Local Server (OpenAI-compatible)
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">Local GPU Inference</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  LM Studio base URL override
                </label>
                <input
                  type="text"
                  value={lmStudioSettings.baseUrl}
                  onChange={(e) => setLmStudioSettings({ ...lmStudioSettings, baseUrl: e.target.value })}
                  placeholder="http://127.0.0.1:1234/v1"
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground font-mono shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  API Key (Optional for local auth)
                </label>
                <input
                  type="password"
                  value={lmStudioSettings.apiKey}
                  onChange={(e) => setLmStudioSettings({ ...lmStudioSettings, apiKey: e.target.value })}
                  placeholder="Leave blank for standard local server"
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground font-mono shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Default Local Model
                </label>
                <input
                  type="text"
                  value={lmStudioSettings.model}
                  onChange={(e) => setLmStudioSettings({ ...lmStudioSettings, model: e.target.value })}
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground font-mono shadow-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestLMStudio}
                    disabled={testingId === "lmstudio"}
                    className="h-7 text-xs border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-xs"
                  >
                    <Zap size={11} className={`text-amber-500 mr-1 ${testingId === "lmstudio" ? "animate-spin" : ""}`} />
                    <span>{testingId === "lmstudio" ? "Connecting..." : "Test Connection"}</span>
                  </Button>

                  {lmStudioSettings.status === "online" && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Connected ({lmStudioSettings.latency} ms)
                    </span>
                  )}
                  {lmStudioSettings.status === "offline" && (
                    <span className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                      <XCircle size={12} /> {lmStudioSettings.lastError || "Unreachable"}
                    </span>
                  )}
                </div>

                <Button
                  onClick={() =>
                    activateEngine("lmstudio", "LM Studio (Local)", lmStudioSettings.model, lmStudioSettings.baseUrl, lmStudioSettings.apiKey, "")
                  }
                  className="h-7 text-xs bg-primary text-primary-foreground font-medium cursor-pointer shadow-xs"
                >
                  Set as Active Primary
                </Button>
              </div>
            </div>
          </div>

          {/* Local Model Discovery Card */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Loaded GPU Models ({availableModels.length})
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchModels}
                disabled={fetchingModels}
                className="h-7 text-xs border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-xs"
              >
                <RefreshCw size={11} className={`mr-1.5 ${fetchingModels ? "animate-spin" : ""}`} />
                <span>Scan Models</span>
              </Button>
            </div>

            {availableModels.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                  {availableModels.map((m) => (
                    <div key={m} className="p-2 rounded border border-border bg-background flex items-center justify-between text-xs font-mono">
                      <span className="truncate pr-2">{m}</span>
                      <div className="flex items-center gap-1 shrink-0 font-sans">
                        <button
                          onClick={() => assignDetectedModel(m, "primary")}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium hover:bg-primary/20"
                        >
                          Primary
                        </button>
                        <button
                          onClick={() => assignDetectedModel(m, "vision")}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-500 font-medium hover:bg-violet-500/20"
                        >
                          Vision
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: CLOUD PROVIDERS (المزودون السحابيون المعتمدون بمفاتيح معزولة) */}
      {/* ========================================================================= */}
      {activeSubTab === "cloud" && (
        <div className="space-y-4">
          {cloudProviders.map((cp) => (
            <div key={cp.id} className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{cp.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                    {cp.badge}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestCloud(cp.id)}
                    disabled={testingId === cp.id}
                    className="h-6 px-2 text-[10px] border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-xs"
                  >
                    <Zap size={10} className={`text-amber-500 mr-1 ${testingId === cp.id ? "animate-spin" : ""}`} />
                    <span>{testingId === cp.id ? "Testing..." : "Test Connection"}</span>
                  </Button>
                  <button
                    onClick={() => activateEngine(cp.id, cp.name, cp.model, cp.baseUrl, cp.apiKey, cp.type)}
                    className="px-2 py-1 rounded text-[10px] bg-primary text-primary-foreground font-medium cursor-pointer hover:opacity-90"
                  >
                    Set Primary
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Model ID</label>
                  <input
                    type="text"
                    value={cp.model}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCloudProviders((prev) => prev.map((p) => (p.id === cp.id ? { ...p, model: val } : p)));
                    }}
                    className="w-full bg-background border border-border rounded px-2.5 py-1 text-xs text-foreground font-mono shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Base Endpoint URL</label>
                  <input
                    type="text"
                    value={cp.baseUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCloudProviders((prev) => prev.map((p) => (p.id === cp.id ? { ...p, baseUrl: val } : p)));
                    }}
                    className="w-full bg-background border border-border rounded px-2.5 py-1 text-xs text-foreground font-mono shadow-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-medium text-muted-foreground">API Key</label>
                    <button
                      type="button"
                      onClick={() => toggleKey(cp.id)}
                      className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                    >
                      {showKeys[cp.id] ? <EyeOff size={10} /> : <Eye size={10} />}
                      <span>{showKeys[cp.id] ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <input
                    type={showKeys[cp.id] ? "text" : "password"}
                    value={cp.apiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCloudProviders((prev) => prev.map((p) => (p.id === cp.id ? { ...p, apiKey: val, status: "untested" } : p)));
                    }}
                    placeholder={`Paste key for ${cp.name}...`}
                    className="w-full bg-background border border-border rounded px-2.5 py-1 text-xs text-foreground font-mono shadow-xs"
                  />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <HelpCircle size={10} /> {cp.keyPrefixHint}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: CUSTOM ENDPOINTS (تطبيق مطابق 100% للمرجع image_be6941.png) */}
      {/* ========================================================================= */}
      {activeSubTab === "custom" && (
        <div className="space-y-6">
          {/* Breadcrumbs matching image_be6941.png */}
          <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
            <span>Settings</span>
            <span>&gt;</span>
            <span>Providers</span>
            <span>&gt;</span>
            <span className="text-foreground font-bold">Custom Endpoints</span>
          </div>

          {/* Existing Endpoints List (image_be6941.png top block) */}
          <div className="space-y-3">
            {customEndpoints.map((ce) => (
              <div key={ce.id} className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{ce.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                      {ce.defaultModel}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono block">{ce.endpointUrl}</span>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    {ce.name} &#36;&#123;HERMES_CUSTOM_{ce.providerId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY&#125;
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() =>
                      activateEngine(ce.providerId, ce.name, ce.defaultModel, ce.endpointUrl, ce.apiKey, "")
                    }
                    className="h-8 px-3 text-xs bg-primary text-primary-foreground font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Zap size={12} />
                    <span>Use</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCustomEndpoint(ce.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit/Add Endpoint Form (image_be6941.png lower form) */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-border/60">
              <Plus size={14} className="text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Edit Endpoint
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Name</label>
                  <input
                    type="text"
                    value={endpointForm.name}
                    onChange={(e) => setEndpointForm({ ...endpointForm, name: e.target.value })}
                    placeholder="GigaChat-3-Ultra"
                    className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Provider ID</label>
                  <input
                    type="text"
                    value={endpointForm.providerId}
                    onChange={(e) => setEndpointForm({ ...endpointForm, providerId: e.target.value })}
                    placeholder="gigachat-3-ultra"
                    className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground shadow-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Endpoint URL</label>
                <input
                  type="text"
                  value={endpointForm.endpointUrl}
                  onChange={(e) => setEndpointForm({ ...endpointForm, endpointUrl: e.target.value })}
                  placeholder="http://127.0.0.1:8090/v1"
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground shadow-xs font-mono"
                />
              </div>

              {/* API Mode Selector matching image_be6941.png */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">API Mode</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1 p-1 rounded-lg bg-background border border-border">
                  {(["Auto-detect", "Chat Completions", "Responses API", "Anthropic Messages"] as ApiModeType[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setEndpointForm({ ...endpointForm, apiMode: mode })}
                      className={`py-1.5 px-2 rounded text-[11px] font-medium transition-all cursor-pointer ${
                        endpointForm.apiMode === mode
                          ? "bg-card text-foreground shadow-xs font-bold border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Default Model</label>
                  <input
                    type="text"
                    value={endpointForm.defaultModel}
                    onChange={(e) => setEndpointForm({ ...endpointForm, defaultModel: e.target.value })}
                    placeholder="GigaChat-3-Ultra"
                    className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground shadow-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">Context</label>
                  <input
                    type="text"
                    value={endpointForm.contextWindow}
                    onChange={(e) => setEndpointForm({ ...endpointForm, contextWindow: e.target.value })}
                    placeholder="Auto"
                    className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground shadow-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">API Key</label>
                <input
                  type="password"
                  value={endpointForm.apiKey}
                  onChange={(e) => setEndpointForm({ ...endpointForm, apiKey: e.target.value })}
                  placeholder="Leave blank to keep current key or for unauthenticated local servers"
                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground shadow-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={endpointForm.useForNewChats}
                    onChange={(e) => setEndpointForm({ ...endpointForm, useForNewChats: e.target.checked })}
                    className="rounded border-border text-primary"
                  />
                  <span className="text-xs text-foreground">Use for new chats</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-border text-primary" />
                  <span className="text-xs text-foreground">Discover models</span>
                </label>
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestCustomForm}
                  disabled={testingId === "custom_form"}
                  className="h-8 px-3 text-xs border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Zap size={12} className={`text-amber-500 ${testingId === "custom_form" ? "animate-spin" : ""}`} />
                  <span>Test</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveCustomEndpoint}
                  className="h-8 px-4 text-xs bg-primary text-primary-foreground font-medium cursor-pointer shadow-xs"
                >
                  Save
                </Button>

                <span className="text-[11px] text-muted-foreground ml-2">New endpoint</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
