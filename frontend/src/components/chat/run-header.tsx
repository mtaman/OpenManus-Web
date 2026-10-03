"use client";

import React from "react";
import { StatusPill, SystemStatus } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Square, Copy, Bot, Code2, Search, BarChart3, Sparkles } from "lucide-react";

interface RunHeaderProps {
  prompt: string;
  status: SystemStatus;
  currentStep: number;
  maxSteps?: number;
  onCancel?: () => void;
  agentId?: string;
}

export function RunHeader({
  prompt,
  status,
  currentStep,
  maxSteps = 20,
  onCancel,
  agentId = "peldrun",
}: RunHeaderProps) {
  const handleCopyTrace = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const getAgentInfo = (id: string) => {
    switch (id.toLowerCase()) {
      case "code_architect":
        return { name: "Code Architect", icon: <Code2 size={12} className="text-cyan-400" /> };
      case "deep_researcher":
        return { name: "Deep Researcher", icon: <Search size={12} className="text-amber-400" /> };
      case "data_scientist":
        return { name: "Data Scientist", icon: <BarChart3 size={12} className="text-purple-400" /> };
      default:
        return { name: "peldrun Generalist", icon: <Bot size={12} className="text-emerald-400" /> };
    }
  };

  const agentMeta = getAgentInfo(agentId);

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]/80 backdrop-blur-md">
      <div className="flex flex-col gap-1 min-w-0 pr-4">
        <h2 className="text-sm font-semibold truncate text-[var(--color-ink)]" title={prompt}>
          {prompt || "New Autonomous Session"}
        </h2>
        <div className="flex items-center gap-3 text-xs text-[var(--color-ink-muted)] font-mono">
          <span>Step {currentStep} / {maxSteps}</span>
          <span>•</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
            {agentMeta.icon}
            <span className="font-semibold">{agentMeta.name}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <StatusPill status={status} />
        <Button variant="ghost" size="sm" onClick={handleCopyTrace} title="Copy Trace Link">
          <Copy size={14} className="mr-1.5" />
          Trace
        </Button>
        {status === "running" && onCancel && (
          <Button variant="danger" size="sm" onClick={onCancel}>
            <Square size={12} className="mr-1.5 fill-current" />
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}

export default RunHeader;
