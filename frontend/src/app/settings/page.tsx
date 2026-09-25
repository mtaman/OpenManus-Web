"use client";

import React, { useEffect, useState } from "react";
import { Settings, Shield, Server, Globe, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data.config || data))
      .catch((err) => console.error("Failed to load config", err));
  }, []);

  const handleSave = async () => {
    try {
      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save config", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-ink)] font-mono text-xs overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
        <div className="flex items-center gap-3">
          <Settings size={18} className="text-[var(--color-accent-400)]" />
          <h1 className="text-sm font-semibold tracking-wide">Autonomous Engine Configuration</h1>
        </div>
        <Button variant="primary" size="sm" onClick={handleSave}>
          <Save size={12} className="mr-1.5" />
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl">
        <Card className="p-4 space-y-3 bg-[var(--color-surface-1)]">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-line-subtle)] text-[var(--color-accent-400)]">
            <Server size={14} />
            <span className="font-semibold uppercase tracking-wider">Inference & LLM Endpoint</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[var(--color-ink-muted)]">Model Identifier</label>
              <input
                type="text"
                value={config?.llm?.model || "gemini-2.0-flash"}
                onChange={(e) => setConfig({ ...config, llm: { ...config.llm, model: e.target.value } })}
                className="w-full mt-1 px-3 py-1.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-line)] text-[var(--color-ink)] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-ink-muted)]">API Key (Masked)</label>
              <div className="relative mt-1">
                <input
                  type="password"
                  disabled
                  value="••••••••••••••••"
                  className="w-full px-3 py-1.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-line)] text-[var(--color-ink-muted)] cursor-not-allowed"
                />
                <Shield size={12} className="absolute right-3 top-2.5 text-emerald-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3 bg-[var(--color-surface-1)]">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-line-subtle)] text-cyan-400">
            <Globe size={14} />
            <span className="font-semibold uppercase tracking-wider">Browser & Chrome CDP Target</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[var(--color-ink-muted)]">Remote Debugging Port</label>
              <input
                type="text"
                disabled
                value="http://localhost:9222"
                className="w-full mt-1 px-3 py-1.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-line)] text-[var(--color-ink-muted)] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-ink-muted)]">Local LLM Studio Target</label>
              <input
                type="text"
                disabled
                value="http://localhost:1234/v1"
                className="w-full mt-1 px-3 py-1.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-line)] text-[var(--color-ink-muted)] cursor-not-allowed"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}