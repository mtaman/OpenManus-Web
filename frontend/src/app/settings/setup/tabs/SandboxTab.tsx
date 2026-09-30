"use client";

import React, { useState } from "react";
import { Box, Cloud, Eye, EyeOff } from "lucide-react";

interface SandboxTabProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
}

export function SandboxTab({ config, setConfig }: SandboxTabProps) {
  const [showDaytonaKey, setShowDaytonaKey] = useState(false);
  const [showVncPass, setShowVncPass] = useState(false);

  return (
    <div className="llm-tab w-full space-y-6 max-auto font-sans pb-6">
      <div className="border-b border-border w-full pb-4 pt-4 bg-custom">
        <div className="flex items-center gap-2 pr-4 pl-4">
          <Box size={16} className="text-primary" />
          <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wide">
            Execution Sandboxing [sandbox / daytona]
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 pr-4 pl-4">
          Local Docker containers and remote Daytona cloud workspaces for secure code execution.
        </p>
      </div>

      <div className="w-full max-w-7xl space-y-9 pt-8 m-auto">
        <div className="p-5 rounded-md border border-border bg-card space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
              Local Docker Sandbox [sandbox]
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.sandbox.use_sandbox}
                onChange={(e) => setConfig({ ...config, sandbox: { ...config.sandbox, use_sandbox: e.target.checked } })}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-xs text-foreground font-medium">Enable Docker Sandbox</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Docker Image</label>
              <input
                type="text"
                value={config.sandbox.image}
                onChange={(e) => setConfig({ ...config, sandbox: { ...config.sandbox, image: e.target.value } })}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Memory Limit</label>
              <input
                type="text"
                value={config.sandbox.memory_limit}
                onChange={(e) => setConfig({ ...config, sandbox: { ...config.sandbox, memory_limit: e.target.value } })}
                placeholder="1g or 2g"
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">CPU Cores Limit</label>
              <input
                type="number"
                step="0.5"
                value={config.sandbox.cpu_limit || 2.0}
                onChange={(e) => setConfig({ ...config, sandbox: { ...config.sandbox, cpu_limit: parseFloat(e.target.value) || 2.0 } })}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Timeout (seconds)</label>
              <input
                type="number"
                value={config.sandbox.timeout || 300}
                onChange={(e) => setConfig({ ...config, sandbox: { ...config.sandbox, timeout: parseInt(e.target.value, 10) || 300 } })}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/60">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.sandbox.network_enabled}
                onChange={(e) => setConfig({ ...config, sandbox: { ...config.sandbox, network_enabled: e.target.checked } })}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-xs text-foreground font-medium">Enable Outbound Network Access inside Sandbox</span>
            </label>
          </div>
        </div>

        <div className="p-5 rounded-md border border-border bg-card space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Cloud size={14} className="text-primary" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
              Daytona Cloud Workspace [daytona]
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-muted-foreground">Daytona API Key</label>
                <button
                  type="button"
                  onClick={() => setShowDaytonaKey(!showDaytonaKey)}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showDaytonaKey ? <EyeOff size={11} /> : <Eye size={11} />}
                  <span>{showDaytonaKey ? "Hide" : "Show"}</span>
                </button>
              </div>
              <input
                type={showDaytonaKey ? "text" : "password"}
                value={config.daytona.daytona_api_key || ""}
                onChange={(e) => setConfig({ ...config, daytona: { ...config.daytona, daytona_api_key: e.target.value } })}
                placeholder="dtn_..."
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Daytona Server URL</label>
              <input
                type="text"
                value={config.daytona.daytona_server_url || "https://app.daytona.io/api"}
                onChange={(e) => setConfig({ ...config, daytona: { ...config.daytona, daytona_server_url: e.target.value } })}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Daytona Target Region</label>
              <input
                type="text"
                value={config.daytona.daytona_target || "us"}
                onChange={(e) => setConfig({ ...config, daytona: { ...config.daytona, daytona_target: e.target.value } })}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Daytona Image Name</label>
              <input
                type="text"
                value={config.daytona.sandbox_image_name || "whitezxj/sandbox:0.1.0"}
                onChange={(e) => setConfig({ ...config, daytona: { ...config.daytona, sandbox_image_name: e.target.value } })}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-muted-foreground">VNC Remote Password (optional)</label>
                <button
                  type="button"
                  onClick={() => setShowVncPass(!showVncPass)}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showVncPass ? <EyeOff size={11} /> : <Eye size={11} />}
                  <span>{showVncPass ? "Hide" : "Show"}</span>
                </button>
              </div>
              <input
                type={showVncPass ? "text" : "password"}
                value={config.daytona.VNC_password || ""}
                onChange={(e) => setConfig({ ...config, daytona: { ...config.daytona, VNC_password: e.target.value } })}
                placeholder="Leave empty or set VNC password"
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}