"use client";

import React from "react";
import { Package, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ArtifactsTab() {
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-background text-xs font-sans">
      <div className="w-11 h-11 rounded-2xl bg-card border border-border shadow-manus-sm flex items-center justify-center text-manus-accent mb-3">
        <Package size={22} />
      </div>
      <div className="font-semibold text-sm font-heading text-foreground mb-1">Generated Artifacts</div>
      <p className="max-w-xs text-xs text-muted-foreground leading-relaxed mb-4">
        Completed execution artifacts, charts, reports, and downloaded deliverables will populate here.
      </p>
      <Button variant="secondary" size="sm" className="shadow-manus-xs">
        <ExternalLink size={12} className="mr-1.5" />
        Explore Sandbox
      </Button>
    </div>
  );
}

export default ArtifactsTab;
