"use client";

import React from "react";
import { Package, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ArtifactsTab() {
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-[var(--color-surface-1)] text-xs font-mono">
      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
        <Package size={20} />
      </div>
      <div className="font-semibold text-sm text-[var(--color-ink)] mb-1">Generated Artifacts</div>
      <p className="max-w-xs text-[11px] text-[var(--color-ink-muted)] leading-relaxed mb-4">
        Completed execution artifacts, charts, reports, and downloaded files will populate here.
      </p>
      <Button variant="secondary" size="sm">
        <ExternalLink size={12} className="mr-1.5" />
        Explore Sandbox
      </Button>
    </div>
  );
}