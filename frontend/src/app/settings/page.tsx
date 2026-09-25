"use client";

import React, { useState, useEffect } from "react";
import { 
  Save, 
  RefreshCw, 
  Cpu, 
  Globe, 
  Search, 
  Box, 
  Share2, 
  Info, 
  Check, 
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Bot,
  ArrowUpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SettingsTab = "llm" | "browser" | "search" | "sandbox" | "mcp" | "system";

interface ProviderPreset {
  id: string;
  name: string;
  type: string;
  defaultBaseUrl: string;
  defaultModel: string;
  badge: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: "lmstudio", name: "LM Studio (Local)", type: "", defaultBaseUrl: "http://127.0.0.1:1234/v1", defaultModel: "qwen3-vl-8b-instruct", badge: "Local GPU" },
  { id: "ollama", name: "Ollama (Local)", type: "ollama", defaultBaseUrl: "http://localhost:11434/v1", defaultModel: "llama3.2", badge: "Local" },
  { id: "anthropic", name: "Anthropic Claude", type: "", defaultBaseUrl: "https://api.anthropic.com/v1/", defaultModel: "claude-3-7-sonnet-20250219", badge: "Cloud" },
  { id: "openai", name: "OpenAI", type: "", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o", badge: "Cloud" },
  { id: "google", name: "Google Gemini", type: "", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/", defaultModel: "gemini-2.0-flash", badge: "Cloud" },
  { id: "ppio", name: "DeepSeek / PPIO", type: "ppio", defaultBaseUrl: "https://api.ppinfra.com/v3/openai", defaultModel: "deepseek/deepseek-v3-0324", badge: "Cloud" },
  { id: "jiekou", name: "Jiekou.AI", type: "jiekou", defaultBaseUrl: "https://api.jiekou.ai/openai", defaultModel: "claude-sonnet-4-5-20250929", badge: "Cloud" },
  { id: "azure", name: "Azure OpenAI", type: "azure", defaultBaseUrl: "https://your-resource.openai.azure.com/openai/deployments/your-deployment", defaultModel: "gpt-4o-mini", badge: "Enterprise" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("llm");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [testingLLM, setTestingLLM] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latency?: number } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  const [config, setConfig] = useState<any>({
    llm: {
      model: "qwen3-vl-8b-instruct",
      base_url: "http://127.0.0.1:1234/v1",
      api_key: "",
      max_tokens: 8192,
      temperature: 0.0,
      api_type: ""
    },
    llm_vision: {
      model: "qwen3-vl-8b-instruct",
      base_url: "http://127.0.0.1:1234/v1",
      api_key: "",
      max_tokens: 8192,
      temperature: 0.0
    },
    browser: {
      headless: false,
      disable_security: true,
      chrome_instance_path: "",
      cdp_url: "http://localhost:9222",
      wss_url: "",
      max_content_length: 2000,
      proxy: { server: "", username: "", password: "" }
    },
    search: {
      engine: "Google",
      fallback_engines: ["DuckDuckGo", "Baidu", "Bing"],
      retry_delay: 60,
      max_retries: 3,
      lang: "en",
      country: "us"
    },
    sandbox: {
      use_sandbox: false,
      image: "python:3.12-slim",
      work_dir: "/workspace",
      memory_limit: "1g",
      cpu_limit: 2.0,
      timeout: 300,
      network_enabled: false
    },
    daytona: {
      daytona_api_key: "",
      daytona_server_url: "https://app.daytona.io/api",
      daytona_target: "us",
      sandbox_image_name: "whitezxj/sandbox:0.1.0",
      VNC_password: ""
    },
    mcp: { server_reference: "app.mcp.server" },
    runflow: { use_data_analysis_agent: false }
  });

  const [customModels, setCustomModels] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch("http://localhost:8088/api/config");
      if (res.ok) {
        const data = await res.json();
        const cfg = data.config || {};
        setConfig((prev: any) => ({
          ...prev,
          llm: { ...prev.llm, ...(cfg.llm || {}) },
          llm_vision: { ...prev.llm_vision, ...(cfg["llm.vision"] || cfg.llm_vision || {}) },
          browser: { 
            ...prev.browser, 
            ...(cfg.browser || {}),
            proxy: { ...prev.browser.proxy, ...(cfg["browser.proxy"] || (cfg.browser && cfg.browser.proxy) || {}) }
          },
          search: { ...prev.search, ...(cfg.search || {}) },
          sandbox: { ...prev.sandbox, ...(cfg.sandbox || {}) },
          daytona: { ...prev.daytona, ...(cfg.daytona || {}) },
          mcp: { ...prev.mcp, ...(cfg.mcp || {}) },
          runflow: { ...prev.runflow, ...(cfg.runflow || {}) }
        }));

        if (data.custom_models && Array.isArray(data.custom_models)) {
          setCustomModels(data.custom_models);
        }
      }
    } catch (e) {
      console.error("Failed to load config", e);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const res = await fetch("http://localhost:8088/api/status/system-info");
      if (res.ok) {
        const data = await res.json();
        setSystemInfo(data);
      }
    } catch (e) {
      console.error("Failed to fetch system info", e);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchSystemInfo();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const llmDict: any = { ...config.llm };
      llmDict["vision"] = config.llm_vision;

      customModels.forEach((cm) => {
        if (cm.name.trim()) {
          llmDict[cm.name.trim()] = {
            model: cm.model,
            base_url: cm.base_url,
            api_key: cm.api_key,
            max_tokens: cm.max_tokens,
            temperature: cm.temperature,
            api_type: cm.api_type || ""
          };
        }
      });

      const payload: any = {
        llm: llmDict,
        browser: {
          headless: config.browser.headless,
          disable_security: config.browser.disable_security,
          chrome_instance_path: config.browser.chrome_instance_path || null,
          cdp_url: config.browser.cdp_url || null,
          wss_url: config.browser.wss_url || null,
          max_content_length: parseInt(config.browser.max_content_length, 10) || 2000,
          proxy: config.browser.proxy
        },
        search: config.search,
        sandbox: config.sandbox,
        daytona: config.daytona,
        mcp: config.mcp,
        runflow: config.runflow
      };

      const res = await fetch("http://localhost:8088/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveStatus("Saved successfully to config.toml!");
        setTimeout(() => setSaveStatus(null), 3500);
      } else {
        setSaveStatus("Error saving: Server rejected payload.");
      }
    } catch (e: any) {
      setSaveStatus(`Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestLLM = async (customBaseUrl?: string, customKey?: string, customModel?: string) => {
    setTestingLLM(true);
    setTestResult(null);
    try {
      const res = await fetch("http://localhost:8088/api/config/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_url: customBaseUrl || config.llm.base_url,
          api_key: customKey || config.llm.api_key,
          model: customModel || config.llm.model,
          api_type: config.llm.api_type
        }),
      });
      const data = await res.json();
      setTestResult({ ok: data.ok, message: data.message, latency: data.latency_ms });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || "Endpoint unreachable." });
    } finally {
      setTestingLLM(false);
    }
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    try {
      const res = await fetch("http://localhost:8088/api/config/fetch-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: config.llm.base_url, api_key: config.llm.api_key }),
      });
      const data = await res.json();
      if (data.ok && data.models.length > 0) {
        setAvailableModels(data.models);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingModels(false);
    }
  };

  const selectProviderPreset = (preset: ProviderPreset) => {
    setConfig((p: any) => ({
      ...p,
      llm: {
        ...p.llm,
        model: preset.defaultModel,
        base_url: preset.defaultBaseUrl,
        api_type: preset.type
      },
      llm_vision: {
        ...p.llm_vision,
        model: preset.defaultModel,
        base_url: preset.defaultBaseUrl
      }
    }));
  };

  const assignDetectedModel = (modelName: string, target: "primary" | "vision") => {
    if (target === "primary") {
      setConfig((p: any) => ({ ...p, llm: { ...p.llm, model: modelName } }));
    } else {
      setConfig((p: any) => ({ ...p, llm_vision: { ...p.llm_vision, model: modelName } }));
    }
  };

  // Promote a custom profile to become the active Primary LLM
  const promoteToPrimary = (cm: any) => {
    setConfig((prev: any) => ({
      ...prev,
      llm: {
        ...prev.llm,
        model: cm.model,
        base_url: cm.base_url,
        api_key: cm.api_key,
        max_tokens: cm.max_tokens || 8192,
        temperature: cm.temperature ?? 0.0,
        api_type: cm.api_type || ""
      }
    }));
    setSaveStatus(`Applied '${cm.name}' as the Primary Active Model. Click 'Save Config' to confirm.`);
  };

  const addCustomModel = () => {
    setCustomModels((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        name: `agent_${prev.length + 1}`,
        model: availableModels[0] || config.llm.model,
        base_url: config.llm.base_url,
        api_key: config.llm.api_key,
        max_tokens: 8192,
        temperature: 0.0,
        api_type: ""
      }
    ]);
  };

  const removeCustomModel = (id: string) => {
    setCustomModels((prev) => prev.filter((m) => m.id !== id));
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "llm", label: "Model Hub [LLM]", icon: <Cpu size={14} /> },
    { id: "browser", label: "Browser & CDP", icon: <Globe size={14} /> },
    { id: "search", label: "Search Engine", icon: <Search size={14} /> },
    { id: "sandbox", label: "Docker & Daytona", icon: <Box size={14} /> },
    { id: "mcp", label: "MCP & Agents", icon: <Share2 size={14} /> },
    { id: "system", label: "Diagnostics & HW", icon: <Info size={14} /> },
  ];

  return (
    <div className="flex h-full w-full bg-[var(--color-canvas)] text-[var(--color-ink)] font-mono overflow-hidden">
      {/* Sub-Sidebar */}
      <div className="w-56 border-r border-[var(--color-line)] bg-[var(--color-surface-1)] flex flex-col p-3 space-y-1">
        <span className="text-[11px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider px-3 py-2">
          Configuration
        </span>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs transition cursor-pointer ${
              activeTab === tab.id
                ? "bg-[var(--color-surface-2)] text-cyan-400 border border-[var(--color-line)] shadow-sm font-semibold"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]/60"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}

        <div className="pt-4 mt-auto border-t border-[var(--color-line-subtle)] space-y-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 h-8 bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs cursor-pointer"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{saving ? "Saving..." : "Save Config"}</span>
          </Button>

          {saveStatus && (
            <div className={`p-2 rounded text-[11px] font-sans leading-tight border ${
              saveStatus.includes("Error") || saveStatus.includes("Failed")
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}>
              {saveStatus}
            </div>
          )}
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        
        {/* TAB 1: 2026 MODERN MODEL HUB */}
        {activeTab === "llm" && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-[var(--color-line)] pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                <h2 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">
                  2026 Model Hub & Multi-Provider Architecture
                </h2>
              </div>
              <p className="text-xs text-[var(--color-ink-faint)] font-sans mt-0.5">
                Centralized orchestration for local inference engines, cloud APIs, and specialized sub-agents.
              </p>
            </div>

            {/* Provider Grid Selector */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[var(--color-ink-muted)] block">
                Select Provider Preset:
              </span>
              <div className="grid grid-cols-4 gap-2.5">
                {PROVIDER_PRESETS.map((p) => {
                  const isCurrent = config.llm.base_url.includes(p.id) || (p.id === "lmstudio" && config.llm.base_url.includes("1234"));
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectProviderPreset(p)}
                      className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition cursor-pointer ${
                        isCurrent
                          ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-sm"
                          : "bg-[var(--color-surface-1)] border-[var(--color-line)] hover:border-cyan-500/30 text-[var(--color-ink)]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold">{p.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-ink-faint)] border border-[var(--color-line-subtle)]">
                          {p.badge}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--color-ink-faint)] truncate w-full">{p.defaultModel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detected Models Bar */}
            <div className="p-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-1)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-cyan-400" />
                  <span className="text-xs font-bold text-[var(--color-ink)] uppercase">
                    Detected Local Models ({availableModels.length})
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFetchModels}
                  disabled={fetchingModels}
                  className="h-7 text-[11px] border-[var(--color-line)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] cursor-pointer"
                >
                  {fetchingModels ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  <span>Scan Models</span>
                </Button>
              </div>

              {availableModels.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] text-[var(--color-ink-faint)] block">
                    Click any badge to select, or use Quick Assign buttons:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {availableModels.map((m) => (
                      <div
                        key={m}
                        className="flex items-center gap-1.5 p-1.5 px-2.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs text-[var(--color-ink)]"
                      >
                        <span className="font-bold text-cyan-300">{m}</span>
                        <div className="flex items-center gap-1 ml-2 border-l border-[var(--color-line)] pl-2">
                          <button
                            onClick={() => assignDetectedModel(m, "primary")}
                            className="px-1.5 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 text-[10px] cursor-pointer"
                            title="Set as Primary Model"
                          >
                            Primary
                          </button>
                          <button
                            onClick={() => assignDetectedModel(m, "vision")}
                            className="px-1.5 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600 text-purple-200 text-[10px] cursor-pointer"
                            title="Set as Vision Model"
                          >
                            Vision
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-[var(--color-ink-faint)] font-sans">
                  No local models scanned yet. Click "Scan Models" to retrieve models loaded in LM Studio or Ollama.
                </div>
              )}
            </div>

            {/* Active Primary Reasoning Model Card */}
            <div className="p-5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-1)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-line-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-[var(--color-ink)] uppercase">
                    ACTIVE PRIMARY REASONING MODEL [LLM]
                  </span>
                </div>

                {/* Quick Profile Selector */}
                {customModels.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--color-ink-muted)]">Switch to Profile:</span>
                    <select
                      onChange={(e) => {
                        const selected = customModels.find((m) => m.name === e.target.value);
                        if (selected) promoteToPrimary(selected);
                      }}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-2 py-1 text-xs text-amber-300 font-mono"
                    >
                      <option value="">Select custom profile...</option>
                      {customModels.map((cm) => (
                        <option key={cm.id} value={cm.name}>{cm.name} ({cm.model})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Model ID</label>
                  <input
                    type="text"
                    value={config.llm.model}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, model: e.target.value } })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Base Endpoint URL</label>
                  <input
                    type="text"
                    value={config.llm.base_url}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, base_url: e.target.value } })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">API Key</label>
                  <input
                    type="password"
                    value={config.llm.api_key}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, api_key: e.target.value } })}
                    placeholder="Leave masked to retain key"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Provider Tag (api_type)</label>
                  <input
                    type="text"
                    value={config.llm.api_type || ""}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, api_type: e.target.value } })}
                    placeholder="ollama / azure / aws / jiekou (blank for OpenAI)"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Context Window (max_tokens)</label>
                  <input
                    type="number"
                    value={config.llm.max_tokens}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, max_tokens: parseInt(e.target.value, 10) } })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.llm.temperature}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, temperature: parseFloat(e.target.value) } })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                  />
                </div>
              </div>

              {/* Latency & Connectivity Test */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestLLM()}
                  disabled={testingLLM}
                  className="flex items-center gap-1.5 text-xs border-[var(--color-line)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] cursor-pointer"
                >
                  {testingLLM ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} className="text-amber-400" />}
                  <span>Test Primary Endpoint</span>
                </Button>

                {testResult && (
                  <span className={`text-xs font-sans flex items-center gap-1.5 ${testResult.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {testResult.ok ? <Check size={13} /> : <AlertTriangle size={13} />}
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>

            {/* Vision Model Override Card */}
            <div className="p-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-1)] space-y-3">
              <span className="text-xs font-bold text-[var(--color-ink-muted)] uppercase tracking-wider block">
                Visual Perception Model [llm.vision]
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Vision Model ID</label>
                  <input
                    type="text"
                    value={config.llm_vision.model}
                    onChange={(e) => setConfig({ ...config, llm_vision: { ...config.llm_vision, model: e.target.value } })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Vision Base URL</label>
                  <input
                    type="text"
                    value={config.llm_vision.base_url}
                    onChange={(e) => setConfig({ ...config, llm_vision: { ...config.llm_vision, base_url: e.target.value } })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                  />
                </div>
              </div>
            </div>

            {/* Specialized Agent Profiles [llm.*] */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Bot size={15} className="text-cyan-400" />
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      Specialized Agent Profiles [llm.*]
                    </h3>
                  </div>
                  <p className="text-[11px] text-[var(--color-ink-faint)] font-sans">
                    Configure dedicated models & independent endpoints for task-specific sub-agents.
                  </p>
                </div>
                <Button
                  onClick={addCustomModel}
                  size="sm"
                  className="flex items-center gap-1 h-7 px-2.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-semibold cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add Dedicated Agent</span>
                </Button>
              </div>

              {customModels.map((cm, idx) => (
                <div key={cm.id} className="p-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-1)] space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--color-line-subtle)] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400 uppercase">
                        [llm.{cm.name || `agent_${idx + 1}`}]
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* PROMOTE TO PRIMARY BUTTON */}
                      <button
                        onClick={() => promoteToPrimary(cm)}
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold cursor-pointer"
                        title="Set this profile as the active Primary Model"
                      >
                        <ArrowUpCircle size={12} />
                        <span>Set as Primary Active</span>
                      </button>

                      <button
                        onClick={() => handleTestLLM(cm.base_url, cm.api_key, cm.model)}
                        className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        <Zap size={11} />
                        <span>Test Endpoint</span>
                      </button>
                      <button
                        onClick={() => removeCustomModel(cm.id)}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                        title="Remove Agent Profile"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-[var(--color-ink-muted)] block mb-1">Section Identifier</label>
                      <input
                        type="text"
                        value={cm.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomModels((prev) => prev.map((m) => m.id === cm.id ? { ...m, name: val } : m));
                        }}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-2.5 py-1 text-xs text-[var(--color-ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--color-ink-muted)] block mb-1">Model ID</label>
                      <input
                        type="text"
                        value={cm.model}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomModels((prev) => prev.map((m) => m.id === cm.id ? { ...m, model: val } : m));
                        }}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-2.5 py-1 text-xs text-[var(--color-ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--color-ink-muted)] block mb-1">Base Endpoint URL</label>
                      <input
                        type="text"
                        value={cm.base_url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomModels((prev) => prev.map((m) => m.id === cm.id ? { ...m, base_url: val } : m));
                        }}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-2.5 py-1 text-xs text-[var(--color-ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--color-ink-muted)] block mb-1">API Key</label>
                      <input
                        type="password"
                        value={cm.api_key}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomModels((prev) => prev.map((m) => m.id === cm.id ? { ...m, api_key: val } : m));
                        }}
                        placeholder="Leave masked or blank"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-2.5 py-1 text-xs text-[var(--color-ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--color-ink-muted)] block mb-1">Max Tokens</label>
                      <input
                        type="number"
                        value={cm.max_tokens || 8192}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setCustomModels((prev) => prev.map((m) => m.id === cm.id ? { ...m, max_tokens: val } : m));
                        }}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-2.5 py-1 text-xs text-[var(--color-ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--color-ink-muted)] block mb-1">Temperature</label>
                      <input
                        type="number"
                        step="0.1"
                        value={cm.temperature ?? 0.0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCustomModels((prev) => prev.map((m) => m.id === cm.id ? { ...m, temperature: val } : m));
                        }}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-line)] rounded px-2.5 py-1 text-xs text-[var(--color-ink)]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: BROWSER */}
        {activeTab === "browser" && (
          <div className="space-y-6 max-w-3xl">
            <div className="border-b border-[var(--color-line)] pb-4">
              <h2 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">
                Browser Automation & CDP [browser]
              </h2>
              <p className="text-xs text-[var(--color-ink-faint)] font-sans mt-0.5">
                Headless flags, Playwright security toggles, and remote DevTools debugging.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">CDP URL (Live View Target)</label>
                <input
                  type="text"
                  value={config.browser.cdp_url}
                  onChange={(e) => setConfig({ ...config, browser: { ...config.browser, cdp_url: e.target.value } })}
                  placeholder="http://localhost:9222"
                  className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Custom Chrome Path</label>
                <input
                  type="text"
                  value={config.browser.chrome_instance_path || ""}
                  onChange={(e) => setConfig({ ...config, browser: { ...config.browser, chrome_instance_path: e.target.value } })}
                  placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe"
                  className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="headless"
                  checked={config.browser.headless}
                  onChange={(e) => setConfig({ ...config, browser: { ...config.browser, headless: e.target.checked } })}
                  className="rounded border-[var(--color-line)]"
                />
                <label htmlFor="headless" className="text-xs text-[var(--color-ink)] font-sans cursor-pointer">
                  Headless Mode (Run browser invisibly in background)
                </label>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="disable_sec"
                  checked={config.browser.disable_security}
                  onChange={(e) => setConfig({ ...config, browser: { ...config.browser, disable_security: e.target.checked } })}
                  className="rounded border-[var(--color-line)]"
                />
                <label htmlFor="disable_sec" className="text-xs text-[var(--color-ink)] font-sans cursor-pointer">
                  Disable Browser Security (Bypass CORS and certificate blocks)
                </label>
              </div>
            </div>

            <div className="border-t border-[var(--color-line)] pt-4 space-y-3">
              <h3 className="text-xs font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">
                Proxy Settings [browser.proxy]
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-[var(--color-ink-muted)] block mb-1">Server URL</label>
                  <input
                    type="text"
                    value={config.browser.proxy.server || ""}
                    onChange={(e) => setConfig({ ...config, browser: { ...config.browser, proxy: { ...config.browser.proxy, server: e.target.value } } })}
                    placeholder="http://proxy:8080"
                    className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-2.5 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--color-ink-muted)] block mb-1">Username</label>
                  <input
                    type="text"
                    value={config.browser.proxy.username || ""}
                    onChange={(e) => setConfig({ ...config, browser: { ...config.browser, proxy: { ...config.browser.proxy, username: e.target.value } } })}
                    className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-2.5 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--color-ink-muted)] block mb-1">Password</label>
                  <input
                    type="password"
                    value={config.browser.proxy.password || ""}
                    onChange={(e) => setConfig({ ...config, browser: { ...config.browser, proxy: { ...config.browser.proxy, password: e.target.value } } })}
                    className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-2.5 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SEARCH */}
        {activeTab === "search" && (
          <div className="space-y-6 max-w-3xl">
            <div className="border-b border-[var(--color-line)] pb-4">
              <h2 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">
                Search Engine Orchestration [search]
              </h2>
              <p className="text-xs text-[var(--color-ink-faint)] font-sans mt-0.5">
                Primary search engine, fallback chain, and rate limit retries.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Primary Engine</label>
                <select
                  value={config.search.engine}
                  onChange={(e) => setConfig({ ...config, search: { ...config.search, engine: e.target.value } })}
                  className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                >
                  <option value="Google">Google</option>
                  <option value="DuckDuckGo">DuckDuckGo</option>
                  <option value="Bing">Bing</option>
                  <option value="Baidu">Baidu</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Fallback Chain (comma-separated)</label>
                <input
                  type="text"
                  value={Array.isArray(config.search.fallback_engines) ? config.search.fallback_engines.join(", ") : ""}
                  onChange={(e) => setConfig({ ...config, search: { ...config.search, fallback_engines: e.target.value.split(",").map((s) => s.trim()) } })}
                  className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs text-[var(--color-ink)]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Max Retries</label>
                <input
                  type="number"
                  value={config.search.max_retries}
                  onChange={(e) => setConfig({ ...config, search: { ...config.search, max_retries: parseInt(e.target.value, 10) } })}
                  className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Retry Delay (seconds)</label>
                <input
                  type="number"
                  value={config.search.retry_delay}
                  onChange={(e) => setConfig({ ...config, search: { ...config.search, retry_delay: parseInt(e.target.value, 10) } })}
                  className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SANDBOX */}
        {activeTab === "sandbox" && (
          <div className="space-y-6 max-w-3xl">
            <div className="border-b border-[var(--color-line)] pb-4">
              <h2 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">
                Execution Sandboxing [sandbox / daytona]
              </h2>
              <p className="text-xs text-[var(--color-ink-faint)] font-sans mt-0.5">
                Local Docker container sandbox and Daytona remote cloud workspaces.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="use_sb"
                  checked={config.sandbox.use_sandbox}
                  onChange={(e) => setConfig({ ...config, sandbox: { ...config.sandbox, use_sandbox: e.target.checked } })}
                  className="rounded border-[var(--color-line)]"
                />
                <label htmlFor="use_sb" className="text-xs text-[var(--color-ink)] font-sans cursor-pointer">
                  Enable Local Docker Sandbox (Requires Docker Desktop running)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Docker Image</label>
                  <input
                    type="text"
                    value={config.sandbox.image}
                    onChange={(e) => setConfig({ ...config, sandbox: { ...config.sandbox, image: e.target.value } })}
                    className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">Memory Limit</label>
                  <input
                    type="text"
                    value={config.sandbox.memory_limit}
                    onChange={(e) => setConfig({ ...config, sandbox: { ...config.sandbox, memory_limit: e.target.value } })}
                    className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MCP & AGENTS */}
        {activeTab === "mcp" && (
          <div className="space-y-6 max-w-3xl">
            <div className="border-b border-[var(--color-line)] pb-4">
              <h2 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">
                Multi-Agent Workflow & MCP Tools
              </h2>
              <p className="text-xs text-[var(--color-ink-faint)] font-sans mt-0.5">
                Model Context Protocol modules and multi-agent task distribution.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="data_agent"
                  checked={config.runflow.use_data_analysis_agent}
                  onChange={(e) => setConfig({ ...config, runflow: { ...config.runflow, use_data_analysis_agent: e.target.checked } })}
                  className="rounded border-[var(--color-line)]"
                />
                <label htmlFor="data_agent" className="text-xs text-[var(--color-ink)] font-sans cursor-pointer">
                  Use Data Analysis Specialist Agent (runflow.use_data_analysis_agent)
                </label>
              </div>

              <div>
                <label className="text-[11px] text-[var(--color-ink-muted)] block mb-1">MCP Server Reference</label>
                <input
                  type="text"
                  value={config.mcp.server_reference}
                  onChange={(e) => setConfig({ ...config, mcp: { ...config.mcp, server_reference: e.target.value } })}
                  className="w-full bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DIAGNOSTICS & ACCURATE HARDWARE */}
        {activeTab === "system" && (
          <div className="space-y-6 max-w-3xl">
            <div className="border-b border-[var(--color-line)] pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">
                  Hardware Diagnostics & Sync
                </h2>
                <p className="text-xs text-[var(--color-ink-faint)] font-sans mt-0.5">
                  Accurate CPU name, RAM telemetry, and repository commit status.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchSystemInfo} className="h-7 w-7 p-0 cursor-pointer">
                <RefreshCw size={13} />
              </Button>
            </div>

            {systemInfo ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-line)] space-y-3">
                  <div className="flex items-center gap-2">
                    <Cpu size={15} className="text-cyan-400" />
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      Host Hardware Telemetry
                    </span>
                  </div>

                  <div className="p-3 rounded bg-[var(--color-surface-2)] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-ink-muted)]">Processor:</span>
                      <span className="text-[var(--color-ink)] font-bold text-emerald-400">{systemInfo.os.cpu_brand}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-ink-muted)]">Physical Cores / Threads:</span>
                      <span className="text-[var(--color-ink)] font-bold">{systemInfo.os.cores} Cores</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-ink-muted)]">System RAM:</span>
                      <span className="text-[var(--color-ink)] font-bold">
                        {systemInfo.os.memory?.available_gb} GB free / {systemInfo.os.memory?.total_gb} GB total ({systemInfo.os.memory?.usage_percent}% load)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-ink-muted)]">OS Architecture:</span>
                      <span className="text-[var(--color-ink)] font-bold">{systemInfo.os.system} {systemInfo.os.release} ({systemInfo.os.machine})</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-line)] space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity size={15} className="text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Ecosystem & Repositories
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded bg-[var(--color-surface-2)] space-y-1">
                      <span className="text-[11px] text-[var(--color-ink-muted)] font-bold block">OpenManus (Core)</span>
                      <div>Commit: <span className="font-bold text-emerald-400">{systemInfo.repositories.openmanus.commit}</span></div>
                      <div className="text-[10px] text-[var(--color-ink-faint)]">Target: {systemInfo.repositories.openmanus.target_commit}</div>
                      <div className="text-[10px] text-[var(--color-ink-faint)] truncate">Path: {systemInfo.repositories.openmanus.path}</div>
                    </div>

                    <div className="p-3 rounded bg-[var(--color-surface-2)] space-y-1">
                      <span className="text-[11px] text-[var(--color-ink-muted)] font-bold block">OpenManus Web (PWA)</span>
                      <div>Commit: <span className="font-bold text-cyan-400">{systemInfo.repositories.openmanus_web.commit}</span></div>
                      <div className="text-[10px] text-[var(--color-ink-faint)]">Version: {systemInfo.repositories.openmanus_web.version}</div>
                      <div className="text-[10px] text-[var(--color-ink-faint)] truncate">Path: {systemInfo.repositories.openmanus_web.path}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-line)] text-xs space-y-1">
                  <div className="text-[var(--color-ink-muted)]">Python Runtime: <span className="text-[var(--color-ink)] font-bold">{systemInfo.software.python}</span></div>
                  <div className="text-[10px] text-[var(--color-ink-faint)] truncate">Path: {systemInfo.software.python_executable}</div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[var(--color-ink-faint)]">
                Loading accurate telemetry...
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}