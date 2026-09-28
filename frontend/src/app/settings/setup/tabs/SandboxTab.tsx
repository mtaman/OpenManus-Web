// settings/setup/tabs/SandboxTab.tsx
"use client";

import React from "react";

interface SandboxTabProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
}

export function SandboxTab({ config, setConfig }: SandboxTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-border pb-4">
        <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wider">
          Execution Sandboxing [sandbox / daytona]
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Local Docker container sandbox and Daytona remote cloud workspaces.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.sandbox.use_sandbox}
            onChange={(e) => setConfig({ ...config, sandbox: { ...config.sandbox, use_sandbox: e.target.checked } })}
            className="rounded border-border text-primary"
          />
          <span className="text-xs text-foreground">Enable Local Docker Sandbox (Requires Docker running)</span>
        </label>

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
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
