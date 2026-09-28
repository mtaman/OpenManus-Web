"use client";

import React from "react";
import { Share2, Bot } from "lucide-react";

interface MCPTabProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
}

export function MCPTab({ config, setConfig }: MCPTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-primary" />
          <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wider">
            Multi-Agent Workflow & MCP Tools
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Model Context Protocol (MCP) server endpoints and automated specialist sub-agents.
        </p>
      </div>

      <div className="p-5 rounded-lg border border-border bg-card space-y-4 shadow-manus-xs">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
          Agent Delegation [runflow]
        </span>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={config.runflow.use_data_analysis_agent}
            onChange={(e) => setConfig({ ...config, runflow: { ...config.runflow, use_data_analysis_agent: e.target.checked } })}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
          />
          <div className="flex items-center gap-1.5">
            <Bot size={14} className="text-primary" />
            <span className="text-xs text-foreground font-medium">Use Data Analysis Specialist Agent</span>
          </div>
        </label>
      </div>

      <div className="p-5 rounded-lg border border-border bg-card space-y-4 shadow-manus-xs">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
          Model Context Protocol [mcp]
        </span>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">MCP Server Reference Module</label>
          <input
            type="text"
            value={config.mcp.server_reference || ""}
            onChange={(e) => setConfig({ ...config, mcp: { ...config.mcp, server_reference: e.target.value } })}
            placeholder="app.mcp.server"
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground shadow-manus-xs font-mono"
          />
          <span className="text-[10px] text-muted-foreground mt-1.5 block">
            Points to the backend Python module implementing the MCP server tools for external integrations.
          </span>
        </div>
      </div>
    </div>
  );
}
