"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./setup/Sidebar";
import { LLMTab } from "./setup/tabs/LLMTab";
import { BrowserTab } from "./setup/tabs/BrowserTab";
import { SearchTab } from "./setup/tabs/SearchTab";
import { SandboxTab } from "./setup/tabs/SandboxTab";
import { MCPTab } from "./setup/tabs/MCPTab";
import { SystemTab } from "./setup/tabs/SystemTab";
import { ToastContainer, showToast } from "@/components/ui/ToastNotification";
import {
  INITIAL_CLOUD_PROVIDERS,
  INITIAL_LMSTUDIO_SETTINGS,
  type SettingsTab,
  type CloudProviderVaultItem,
  type LMStudioSettings,
  type CustomEndpoint,
  type FullAppConfig
} from "./setup/types";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("llm");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const initialLoadedRef = useRef<string>("");

  const [lmStudioSettings, setLmStudioSettings] = useState<LMStudioSettings>(INITIAL_LMSTUDIO_SETTINGS);
  const [cloudProviders, setCloudProviders] = useState<CloudProviderVaultItem[]>(INITIAL_CLOUD_PROVIDERS);
  const [customEndpoints, setCustomEndpoints] = useState<CustomEndpoint[]>([
    {
      id: "gigachat_1",
      name: "GigaChat-3-Ultra",
      providerId: "gigachat-3-ultra",
      endpointUrl: "http://127.0.0.1:8090/v1",
      apiMode: "Auto-detect",
      defaultModel: "GigaChat-3-Ultra",
      contextWindow: "Auto",
      apiKey: "",
      status: "untested",
      useForNewChats: true
    }
  ]);

  const [config, setConfig] = useState<FullAppConfig>({
    llm: {
      provider: "lmstudio",
      provider_name: "LM Studio (Local)",
      model: "qwen3-vl-8b-instruct",
      base_url: "http://127.0.0.1:1234/v1",
      api_key: "",
      max_tokens: 8192,
      temperature: 0.0,
      api_type: ""
    },
    llm_vision: {
      provider: "lmstudio",
      provider_name: "LM Studio (Local)",
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

  const [systemInfo, setSystemInfo] = useState<any>(null);

  const currentSnapshot = JSON.stringify({ config, lmStudioSettings, cloudProviders, customEndpoints });
  const isDirty = initialLoadedRef.current !== "" && initialLoadedRef.current !== currentSnapshot;

  const getApiUrl = (endpoint: string) => `http://localhost:8088${endpoint}`;

  const sanitizeTokens = (raw: any): number => {
    const num = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || num <= 0 || num > 2000000) return 8192;
    return num;
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(getApiUrl("/api/config"));
      if (res.ok) {
        const data = await res.json();
        const cfg = data.config || {};

        let storedCloud = INITIAL_CLOUD_PROVIDERS;
        let storedLM = INITIAL_LMSTUDIO_SETTINGS;
        let storedCustom = customEndpoints;

        if (typeof window !== "undefined") {
          const sc = localStorage.getItem("omweb_cloud_vault");
          if (sc) {
            try {
              const parsed = JSON.parse(sc);
              if (Array.isArray(parsed)) {
                storedCloud = INITIAL_CLOUD_PROVIDERS.map((base) => {
                  const match = parsed.find((p: any) => p.id === base.id);
                  return match ? { ...base, ...match } : base;
                });
              }
            } catch (e) {}
          }
          const sl = localStorage.getItem("omweb_lmstudio_vault");
          if (sl) {
            try {
              storedLM = JSON.parse(sl);
            } catch (e) {}
          }
          const sCust = localStorage.getItem("omweb_custom_endpoints");
          if (sCust) {
            try {
              const parsed = JSON.parse(sCust);
              if (Array.isArray(parsed)) storedCustom = parsed;
            } catch (e) {}
          }
        }

        const loadedConfig: FullAppConfig = {
          llm: {
            provider: cfg.llm?.provider || "lmstudio",
            provider_name: cfg.llm?.provider_name || "LM Studio (Local)",
            model: cfg.llm?.model || storedLM.model,
            base_url: cfg.llm?.base_url || storedLM.baseUrl,
            api_key: cfg.llm?.api_key || storedLM.apiKey || "",
            max_tokens: sanitizeTokens(cfg.llm?.max_tokens || 8192),
            temperature: cfg.llm?.temperature ?? 0.0,
            api_type: cfg.llm?.api_type || ""
          },
          llm_vision: {
            provider: cfg["llm.vision"]?.provider || "lmstudio",
            provider_name: cfg["llm.vision"]?.provider_name || "LM Studio (Local)",
            model: cfg["llm.vision"]?.model || cfg.llm_vision?.model || storedLM.model,
            base_url: cfg["llm.vision"]?.base_url || cfg.llm_vision?.base_url || storedLM.baseUrl,
            api_key: cfg["llm.vision"]?.api_key || cfg.llm_vision?.api_key || "",
            max_tokens: sanitizeTokens(cfg["llm.vision"]?.max_tokens || 8192),
            temperature: cfg["llm.vision"]?.temperature ?? 0.0
          },
          browser: {
            headless: cfg.browser?.headless ?? false,
            disable_security: cfg.browser?.disable_security ?? true,
            chrome_instance_path: cfg.browser?.chrome_instance_path || "",
            cdp_url: cfg.browser?.cdp_url || "http://localhost:9222",
            wss_url: cfg.browser?.wss_url || "",
            max_content_length: cfg.browser?.max_content_length || 2000,
            proxy: {
              server: cfg["browser.proxy"]?.server || cfg.browser?.proxy?.server || "",
              username: cfg["browser.proxy"]?.username || cfg.browser?.proxy?.username || "",
              password: cfg["browser.proxy"]?.password || cfg.browser?.proxy?.password || ""
            }
          },
          search: {
            engine: cfg.search?.engine || "Google",
            fallback_engines: Array.isArray(cfg.search?.fallback_engines) ? cfg.search.fallback_engines : ["DuckDuckGo", "Baidu", "Bing"],
            retry_delay: cfg.search?.retry_delay ?? 60,
            max_retries: cfg.search?.max_retries ?? 3,
            lang: cfg.search?.lang || "en",
            country: cfg.search?.country || "us"
          },
          sandbox: {
            use_sandbox: cfg.sandbox?.use_sandbox ?? false,
            image: cfg.sandbox?.image || "python:3.12-slim",
            work_dir: cfg.sandbox?.work_dir || "/workspace",
            memory_limit: cfg.sandbox?.memory_limit || "1g",
            cpu_limit: cfg.sandbox?.cpu_limit ?? 2.0,
            timeout: cfg.sandbox?.timeout ?? 300,
            network_enabled: cfg.sandbox?.network_enabled ?? false
          },
          daytona: {
            daytona_api_key: cfg.daytona?.daytona_api_key || "",
            daytona_server_url: cfg.daytona?.daytona_server_url || "https://app.daytona.io/api",
            daytona_target: cfg.daytona?.daytona_target || "us",
            sandbox_image_name: cfg.daytona?.sandbox_image_name || "whitezxj/sandbox:0.1.0",
            VNC_password: cfg.daytona?.VNC_password || ""
          },
          mcp: { server_reference: cfg.mcp?.server_reference || "app.mcp.server" },
          runflow: { use_data_analysis_agent: cfg.runflow?.use_data_analysis_agent ?? false }
        };

        setLmStudioSettings(storedLM);
        setCloudProviders(storedCloud);
        setCustomEndpoints(storedCustom);
        setConfig(loadedConfig);
        initialLoadedRef.current = JSON.stringify({ config: loadedConfig, lmStudioSettings: storedLM, cloudProviders: storedCloud, customEndpoints: storedCustom });

        if (typeof window !== "undefined") {
          localStorage.setItem("omweb_active_model", loadedConfig.llm.model);
          localStorage.setItem("omweb_active_provider", loadedConfig.llm.provider_name);
        }
      }
    } catch (e: any) {
      console.error("Failed to load config", e);
      showToast.error("Backend Connection Error", e.message);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const res = await fetch(getApiUrl("/api/status/system-info"));
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

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (initialLoadedRef.current !== "" && initialLoadedRef.current !== JSON.stringify({ config, lmStudioSettings, cloudProviders, customEndpoints })) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleReset = () => {
    if (initialLoadedRef.current) {
      const parsed = JSON.parse(initialLoadedRef.current);
      setConfig(parsed.config);
      setLmStudioSettings(parsed.lmStudioSettings);
      setCloudProviders(parsed.cloudProviders);
      setCustomEndpoints(parsed.customEndpoints);
      showToast.info("Changes Reverted", "Restored last saved vault configuration.");
    }
  };

  const activateEngine = (providerId: string, providerName: string, model: string, baseUrl: string, apiKey: string, apiType: string) => {
    setConfig((prev) => ({
      ...prev,
      llm: {
        ...prev.llm,
        provider: providerId,
        provider_name: providerName,
        model,
        base_url: baseUrl,
        api_key: apiKey,
        api_type: apiType || "",
        max_tokens: 8192
      }
    }));
    showToast.success("Active Engine Set", `${providerName} (${model}) is now primary.`);
  };

  const deactivateToDefault = () => {
    setConfig((prev) => ({
      ...prev,
      llm: {
        ...prev.llm,
        provider: "lmstudio",
        provider_name: "LM Studio (Local)",
        model: lmStudioSettings.model,
        base_url: lmStudioSettings.baseUrl,
        api_key: lmStudioSettings.apiKey,
        api_type: "",
        max_tokens: 8192
      }
    }));
    showToast.info("Reverted to Local Engine", "LM Studio (Local GPU) is now active primary.");
  };

  const testEndpoint = async (baseUrl: string, apiKey: string, model: string, apiType?: string) => {
    try {
      const res = await fetch(getApiUrl("/api/config/test-llm"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: baseUrl, api_key: apiKey, model, api_type: apiType || "" }),
      });
      const data = await res.json();
      return { ok: Boolean(data.ok), message: data.message || (data.ok ? "Connected" : "Rejected"), latency: data.latency_ms };
    } catch (e: any) {
      return { ok: false, message: e.message || "Endpoint unreachable" };
    }
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    setScanError(null);
    try {
      const res = await fetch(getApiUrl("/api/config/fetch-models"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: lmStudioSettings.baseUrl, api_key: lmStudioSettings.apiKey }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
        showToast.success("Models Detected", `Retrieved ${data.models.length} local models!`);
      } else {
        const msg = data.message || "No models returned from local endpoint.";
        setScanError(msg);
        showToast.warning("Scan Notice", msg);
      }
    } catch (e: any) {
      const msg = `Connection failed: ${e.message}`;
      setScanError(msg);
      showToast.error("Scan Failed", msg);
    } finally {
      setFetchingModels(false);
    }
  };

  const assignDetectedModel = (modelName: string, target: "primary" | "vision") => {
    if (target === "primary") {
      setConfig((p) => ({ ...p, llm: { ...p.llm, model: modelName } }));
      setLmStudioSettings((p) => ({ ...p, model: modelName }));
      showToast.success("Primary Model Set", modelName);
    } else {
      setConfig((p) => ({ ...p, llm_vision: { ...p.llm_vision, model: modelName } }));
      showToast.info("Vision Model Set", modelName);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const llmDict: any = { ...config.llm };
      llmDict["vision"] = config.llm_vision;
      llmDict.max_tokens = sanitizeTokens(config.llm.max_tokens);

      const payload = {
        llm: llmDict,
        browser: {
          headless: config.browser.headless,
          disable_security: config.browser.disable_security,
          chrome_instance_path: config.browser.chrome_instance_path || null,
          cdp_url: config.browser.cdp_url || null,
          wss_url: config.browser.wss_url || null,
          max_content_length: parseInt(String(config.browser.max_content_length), 10) || 2000,
          proxy: config.browser.proxy
        },
        search: config.search,
        sandbox: config.sandbox,
        daytona: config.daytona,
        mcp: config.mcp,
        runflow: config.runflow
      };

      const res = await fetch(getApiUrl("/api/config"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        initialLoadedRef.current = JSON.stringify({ config, lmStudioSettings, cloudProviders, customEndpoints });
        setSaveStatus({ ok: true, message: "Configuration saved to config.toml!" });
        showToast.success("Saved Successfully", `Active: ${config.llm.provider_name} (${config.llm.model})`);

        if (typeof window !== "undefined") {
          localStorage.setItem("omweb_active_model", config.llm.model);
          localStorage.setItem("omweb_active_provider", config.llm.provider_name);
          localStorage.setItem("omweb_cloud_vault", JSON.stringify(cloudProviders));
          localStorage.setItem("omweb_lmstudio_vault", JSON.stringify(lmStudioSettings));
          localStorage.setItem("omweb_custom_endpoints", JSON.stringify(customEndpoints));
        }

        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.detail || "Server rejected configuration payload.";
        setSaveStatus({ ok: false, message: msg });
        showToast.error("Save Failed", msg);
      }
    } catch (e: any) {
      setSaveStatus({ ok: false, message: `Save failed: ${e.message}` });
      showToast.error("Save Failed", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-background text-foreground font-sans overflow-hidden">
      <ToastContainer />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleSave={handleSave}
        handleReset={handleReset}
        saving={saving}
        isDirty={isDirty}
        saveStatus={saveStatus}
      />

      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-background">
        {activeTab === "llm" && (
          <LLMTab
            config={config}
            setConfig={setConfig}
            lmStudioSettings={lmStudioSettings}
            setLmStudioSettings={setLmStudioSettings}
            cloudProviders={cloudProviders}
            setCloudProviders={setCloudProviders}
            customEndpoints={customEndpoints}
            setCustomEndpoints={setCustomEndpoints}
            availableModels={availableModels}
            fetchingModels={fetchingModels}
            scanError={scanError}
            handleFetchModels={handleFetchModels}
            assignDetectedModel={assignDetectedModel}
            activateEngine={activateEngine}
            deactivateToDefault={deactivateToDefault}
            testEndpoint={testEndpoint}
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
