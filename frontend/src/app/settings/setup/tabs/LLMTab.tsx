// settings/setup/tabs/LLMTab.tsx
"use client";

import React from "react";
import {
  Sparkles, Layers, RefreshCw, Check, AlertTriangle,
  Zap, Bot, Plus, ArrowUpCircle, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROVIDER_PRESETS, type ProviderPreset } from "../types";

interface LLMTabProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  availableModels: string[];
  fetchingModels: boolean;
  handleFetchModels: () => void;
  selectProviderPreset: (preset: ProviderPreset) => void;
  assignDetectedModel: (model: string, target: "primary" | "vision") => void;
  promoteToPrimary: (cm: any) => void;
  customModels: any[];
  setCustomModels: React.Dispatch<React.SetStateAction<any[]>>;
  addCustomModel: () => void;
  removeCustomModel: (id: string) => void;
  handleTestLLM: (baseUrl?: string, key?: string, model?: string) => void;
  testingLLM: boolean;
  testResult: { ok: boolean; message: string; latency?: number } | null;
}

export function LLMTab({
  config, setConfig,
  availableModels, fetchingModels, handleFetchModels,
  selectProviderPreset, assignDetectedModel, promoteToPrimary,
  customModels, setCustomModels, addCustomModel, removeCustomModel,
  handleTestLLM, testingLLM, testResult,
}: LLMTabProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-manus-accent" />
          <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wide">
            Model Hub & Multi-Provider Architecture
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Centralized orchestration for local inference engines, cloud APIs, and specialized sub-agents.
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground block">Select Provider Preset:</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {PROVIDER_PRESETS.map((p) => {
            const isCurrent = config.llm.base_url.includes(p.id) || (p.id === "lmstudio" && config.llm.base_url.includes("1234"));
            return (
              <button
                key={p.id}
                onClick={() => selectProviderPreset(p)}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-muted border-primary shadow-manus-xs text-foreground"
                    : "bg-card border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold">{p.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-background border border-border text-muted-foreground font-mono">
                    {p.badge}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/80 truncate w-full font-mono">
                  {p.defaultModel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-sm border border-border bg-card space-y-3 shadow-manus-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-manus-accent" />
            <span className="text-xs font-medium text-foreground uppercase tracking-wider">
              Detected Local Models ({availableModels.length})
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFetchModels}
            disabled={fetchingModels}
            className="h-7 text-xs border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-manus-xs"
          >
            {fetchingModels ? <RefreshCw size={11} className="animate-spin mr-1" /> : <RefreshCw size={11} className="mr-1" />}
            <span>Scan Models</span>
          </Button>
        </div>

        {availableModels.length > 0 ? (
          <div className="space-y-2">
            <span className="text-[10px] text-muted-foreground block">Click badge to assign detected model:</span>
            <div className="flex flex-wrap gap-2">
              {availableModels.map((m) => (
                <div
                  key={m}
                  className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-md bg-background border border-border text-xs text-foreground shadow-manus-xs font-mono"
                >
                  <span className="font-semibold text-primary">{m}</span>
                  <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
                    <button
                      onClick={() => assignDetectedModel(m, "primary")}
                      className="px-1.5 py-0.5 rounded-sm bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-sans font-medium cursor-pointer"
                      title="Set as Primary Model"
                    >
                      Primary
                    </button>
                    <button
                      onClick={() => assignDetectedModel(m, "vision")}
                      className="px-1.5 py-0.5 rounded-sm bg-manus-accent/10 hover:bg-manus-accent/20 text-manus-accent text-[10px] font-sans font-medium cursor-pointer"
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
          <div className="text-[11px] text-muted-foreground">
            No local models scanned yet. Click "Scan Models" to retrieve models loaded in LM Studio or Ollama.
          </div>
        )}
      </div>

      <div className="p-5 rounded-sm border border-border bg-card space-y-4 shadow-manus-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-manus-success animate-pulse" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Active Primary Reasoning Model [LLM]
            </span>
          </div>

          {customModels.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Profile:</span>
              <select
                onChange={(e) => {
                  const selected = customModels.find((m) => m.name === e.target.value);
                  if (selected) promoteToPrimary(selected);
                }}
                className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary shadow-manus-xs"
              >
                <option value="">Select custom profile...</option>
                {customModels.map((cm) => (
                  <option key={cm.id} value={cm.name}>{cm.name} ({cm.model})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Model ID</label>
            <input
              type="text"
              value={config.llm.model}
              onChange={(e) => setConfig({ ...config, llm: { ...config.llm, model: e.target.value } })}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-manus-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Base Endpoint URL</label>
            <input
              type="text"
              value={config.llm.base_url}
              onChange={(e) => setConfig({ ...config, llm: { ...config.llm, base_url: e.target.value } })}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-manus-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">API Key</label>
            <input
              type="password"
              value={config.llm.api_key}
              onChange={(e) => setConfig({ ...config, llm: { ...config.llm, api_key: e.target.value } })}
              placeholder="Leave masked to retain key"
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-manus-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Provider Tag (api_type)</label>
            <input
              type="text"
              value={config.llm.api_type || ""}
              onChange={(e) => setConfig({ ...config, llm: { ...config.llm, api_type: e.target.value } })}
              placeholder="ollama / azure / aws / jiekou (blank for OpenAI)"
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-manus-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Context Window (max_tokens)</label>
            <input
              type="number"
              value={config.llm.max_tokens}
              onChange={(e) => setConfig({ ...config, llm: { ...config.llm, max_tokens: parseInt(e.target.value, 10) } })}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-manus-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Temperature</label>
            <input
              type="number"
              step="0.1"
              value={config.llm.temperature}
              onChange={(e) => setConfig({ ...config, llm: { ...config.llm, temperature: parseFloat(e.target.value) } })}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-manus-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTestLLM()}
            disabled={testingLLM}
            className="flex items-center gap-1.5 text-xs border-border bg-background hover:bg-muted text-foreground rounded-md shadow-manus-xs cursor-pointer"
          >
            {testingLLM ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} className="text-manus-warning" />}
            <span>Test Primary Endpoint</span>
          </Button>

          {testResult && (
            <span className={`text-xs flex items-center gap-1.5 ${testResult.ok ? "text-manus-success" : "text-manus-error"}`}>
              {testResult.ok ? <Check size={13} /> : <AlertTriangle size={13} />}
              <span>{testResult.message}</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-4 rounded-sm border border-border bg-card space-y-3 shadow-manus-xs">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
          Visual Perception Model [llm.vision]
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Vision Model ID</label>
            <input
              type="text"
              value={config.llm_vision.model}
              onChange={(e) => setConfig({ ...config, llm_vision: { ...config.llm_vision, model: e.target.value } })}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-manus-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Vision Base URL</label>
            <input
              type="text"
              value={config.llm_vision.base_url}
              onChange={(e) => setConfig({ ...config, llm_vision: { ...config.llm_vision, base_url: e.target.value } })}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-manus-xs"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-manus-accent" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Specialized Agent Profiles [llm.*]
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Configure dedicated models & independent endpoints for task-specific sub-agents.
            </p>
          </div>
          <Button
            onClick={addCustomModel}
            size="sm"
            className="flex items-center gap-1 h-7 px-2.5 text-xs bg-primary text-primary-foreground font-medium rounded-md shadow-manus-xs cursor-pointer"
          >
            <Plus size={12} />
            <span>Add Dedicated Agent</span>
          </Button>
        </div>

        {customModels.map((cm, idx) => (
          <div key={cm.id} className="p-4 rounded-sm border border-border bg-card space-y-3 shadow-manus-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-xs font-semibold text-manus-warning font-mono">
                [llm.{cm.name || `agent_${idx + 1}`}]
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => promoteToPrimary(cm)}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-manus-success/15 hover:bg-manus-success/25 text-manus-success border border-manus-success/30 font-medium cursor-pointer transition-all"
                  title="Set this profile as the active Primary Model"
                >
                  <ArrowUpCircle size={12} />
                  <span>Set as Primary Active</span>
                </button>
                <button
                  onClick={() => handleTestLLM(cm.base_url, cm.api_key, cm.model)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Zap size={11} />
                  <span>Test</span>
                </button>
                <button
                  onClick={() => removeCustomModel(cm.id)}
                  className="text-muted-foreground hover:text-manus-error p-1 cursor-pointer"
                  title="Remove Agent Profile"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Identifier</label>
                <input
                  type="text"
                  value={cm.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomModels((prev) => prev.map((m) => m.id === cm.id ? { ...m, name: val } : m));
                  }}
                  className="w-full bg-background border border-border rounded-md px-2.5 py-1 text-xs text-foreground font-mono shadow-manus-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Model ID</label>
                <input
                  type="text"
                  value={cm.model}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomModels((prev) => prev.map((m) => m.id === cm.id ? { ...m, model: val } : m));
                  }}
                  className="w-full bg-background border border-border rounded-md px-2.5 py-1 text-xs text-foreground font-mono shadow-manus-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Endpoint URL</label>
                <input
                  type="text"
                  value={cm.base_url}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomModels((prev) => prev.map((m) => m.id === cm.id ? { ...m, base_url: val } : m));
                  }}
                  className="w-full bg-background border border-border rounded-md px-2.5 py-1 text-xs text-foreground font-mono shadow-manus-xs"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
