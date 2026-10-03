// settings/setup/tabs/MCPTab.tsx
"use client";

import React from "react";

interface MCPTabProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
}

export function MCPTab({ config, setConfig }: MCPTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-border pb-4">
        <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wider">
          Multi-Agent Workflow & MCP Tools
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Model Context Protocol modules and multi-agent task distribution.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.runflow.use_data_analysis_agent}
            onChange={(e) => setConfig({ ...config, runflow: { ...config.runflow, use_data_analysis_agent: e.target.checked } })}
            className="rounded border-border text-primary"
          />
          <span className="text-xs text-foreground">Use Data Analysis Specialist Agent</span>
        </label>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">MCP Server Reference</label>
          <input
            type="text"
            value={config.mcp.server_reference}
            onChange={(e) => setConfig({ ...config, mcp: { ...config.mcp, server_reference: e.target.value } })}
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-peldrun-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
}
