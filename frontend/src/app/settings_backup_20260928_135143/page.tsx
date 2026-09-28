// settings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./setup/Sidebar";
import { LLMTab } from "./setup/tabs/LLMTab";
import { BrowserTab } from "./setup/tabs/BrowserTab";
import { SearchTab } from "./setup/tabs/SearchTab";
import { SandboxTab } from "./setup/tabs/SandboxTab";
import { MCPTab } from "./setup/tabs/MCPTab";
import { SystemTab } from "./setup/tabs/SystemTab";
import type { SettingsTab, ProviderPreset } from "./setup/types";

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

  return (
    <div className="flex h-full w-full bg-background text-foreground font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleSave={handleSave}
        saving={saving}
        saveStatus={saveStatus}
      />

      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-background">
        {activeTab === "llm" && (
          <LLMTab
            config={config}
            setConfig={setConfig}
            availableModels={availableModels}
            fetchingModels={fetchingModels}
            handleFetchModels={handleFetchModels}
            selectProviderPreset={selectProviderPreset}
            assignDetectedModel={assignDetectedModel}
            promoteToPrimary={promoteToPrimary}
            customModels={customModels}
            setCustomModels={setCustomModels}
            addCustomModel={addCustomModel}
            removeCustomModel={removeCustomModel}
            handleTestLLM={handleTestLLM}
            testingLLM={testingLLM}
            testResult={testResult}
          />
        )}

        {activeTab === "browser" && <BrowserTab config={config} setConfig={setConfig} />}
        {activeTab === "search" && <SearchTab config={config} setConfig={setConfig} />}
        {activeTab === "sandbox" && <SandboxTab config={config} setConfig={setConfig} />}
        {activeTab === "mcp" && <MCPTab config={config} setConfig={setConfig} />}
        {activeTab === "system" && <SystemTab systemInfo={systemInfo} fetchSystemInfo={fetchSystemInfo} />}
      </div>
    </div>
  );
}
