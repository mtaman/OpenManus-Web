"use client";

import React from "react";
import {
  X,
  Cpu,
  Brain,
  Eye,
  Wrench,
  Database,
  Layers,
  HardDrive,
  FileCode,
  Zap
} from "lucide-react";
import { inferModelCapabilities, getModelMetadata } from "@/lib/modelMetadata";
import type { ModelMetadata } from "@/lib/types";

interface ModelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelKey: string;
  explicitMeta?: ModelMetadata | null;
}

export function ModelInfoModal({ isOpen, onClose, modelKey, explicitMeta }: ModelInfoModalProps) {
  if (!isOpen || !modelKey) return null;

  const meta = explicitMeta || getModelMetadata(modelKey) || { key: modelKey, type: "llm" };
  const caps = inferModelCapabilities(modelKey, meta);

  const formatBytes = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return null;
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const loadedConfig = meta.loaded_instances && meta.loaded_instances[0]?.config;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm text-foreground truncate max-w-[280px]" title={meta.display_name || modelKey}>
                {meta.display_name || modelKey}
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[280px]">
                {meta.key || modelKey}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Capabilities Pill Row */}
        <div className="px-5 py-3 border-b border-border/60 bg-background/50 flex flex-wrap items-center gap-2">
          {caps.isReasoning && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Brain size={13} /> Reasoning / Deep Thinking
            </span>
          )}
          {caps.isVision && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30">
              <Eye size={13} /> Vision & Multimodal
            </span>
          )}
          {caps.isTools && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              <Wrench size={13} /> Tool Calling / Function Use
            </span>
          )}
        </div>

        {/* Technical Specs Grid */}
        <div className="p-5 space-y-3.5 text-xs overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg border border-border/70 bg-card/60 space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block flex items-center gap-1">
                <Database size={11} className="text-primary" /> Context Window
              </span>
              <span className="font-mono font-bold text-foreground">
                {meta.max_context_length
                  ? `${meta.max_context_length.toLocaleString()} tokens (${Math.round(meta.max_context_length / 1024)}K)`
                  : caps.contextDisplay || "Server Default"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg border border-border/70 bg-card/60 space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block flex items-center gap-1">
                <Layers size={11} className="text-primary" /> Parameters
              </span>
              <span className="font-mono font-bold text-foreground">
                {meta.params_string || caps.paramsDisplay || "Standard"}
              </span>
              {meta.publisher && (
                <span className="text-[10px] text-muted-foreground font-mono block truncate">
                  By {meta.publisher}
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-lg border border-border/70 bg-card/60 space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block flex items-center gap-1">
                <HardDrive size={11} className="text-primary" /> Quantization
              </span>
              <span className="font-mono font-bold text-foreground">
                {meta.quantization?.name || caps.quantDisplay || "Native"}
              </span>
              {meta.quantization?.bits_per_weight && (
                <span className="text-[10px] text-muted-foreground font-mono block">
                  {meta.quantization.bits_per_weight} bits per weight
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-lg border border-border/70 bg-card/60 space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block flex items-center gap-1">
                <FileCode size={11} className="text-primary" /> Architecture
              </span>
              <span className="font-mono font-bold text-foreground capitalize">
                {meta.architecture || caps.archDisplay || "Transformer"}
              </span>
              {meta.format && (
                <span className="text-[10px] text-muted-foreground font-mono uppercase block">
                  Format: {meta.format}
                </span>
              )}
            </div>
          </div>

          {formatBytes(meta.size_bytes) && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 font-mono text-[11px]">
              <span className="text-muted-foreground">Disk Size:</span>
              <span className="font-bold text-foreground">{formatBytes(meta.size_bytes)}</span>
            </div>
          )}

          {loadedConfig && (
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
              <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block flex items-center gap-1">
                <Zap size={12} className="text-amber-500" /> Loaded Instance Runtime Config
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-muted-foreground">KV Cache GPU: </span>
                  <span className="font-semibold">{loadedConfig.offload_kv_cache_to_gpu ? "Yes" : "No"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Flash Attention: </span>
                  <span className="font-semibold">{loadedConfig.flash_attention ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/20 text-xs text-muted-foreground font-mono">
          <span>Type: {meta.type || "llm"}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground font-sans font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModelInfoModal;
