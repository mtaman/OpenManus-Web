// settings/setup/tabs/SystemTab.tsx
"use client";

import React from "react";
import { RefreshCw, Cpu, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SystemTabProps {
  systemInfo: any;
  fetchSystemInfo: () => void;
}

export function SystemTab({ systemInfo, fetchSystemInfo }: SystemTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wider">
            Hardware Diagnostics & Sync
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Accurate CPU name, RAM telemetry, and repository commit status.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchSystemInfo} className="h-7 w-7 p-0 cursor-pointer">
          <RefreshCw size={13} />
        </Button>
      </div>

      {systemInfo ? (
        <div className="space-y-4">
          <div className="p-4 rounded-sm bg-card border border-border space-y-3 shadow-manus-xs">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-manus-accent" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Host Hardware Telemetry
              </span>
            </div>

            <div className="p-3 rounded-lg bg-background border border-border/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Processor:</span>
                <span className="text-foreground font-semibold font-mono">{systemInfo.os.cpu_brand}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Physical Cores / Threads:</span>
                <span className="text-foreground font-semibold font-mono">{systemInfo.os.cores} Cores</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">System RAM:</span>
                <span className="text-foreground font-semibold font-mono">
                  {systemInfo.os.memory?.available_gb} GB free / {systemInfo.os.memory?.total_gb} GB total ({systemInfo.os.memory?.usage_percent}% load)
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-sm bg-card border border-border space-y-3 shadow-manus-xs">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-manus-warning" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Ecosystem & Repositories
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-background border border-border/60 space-y-1">
                <span className="text-[11px] text-muted-foreground font-bold block font-sans">OpenManus (Core)</span>
                <div>Commit: <span className="font-bold text-manus-success">{systemInfo.repositories.openmanus.commit}</span></div>
              </div>
              <div className="p-3 rounded-lg bg-background border border-border/60 space-y-1">
                <span className="text-[11px] text-muted-foreground font-bold block font-sans">OpenManus Web (PWA)</span>
                <div>Commit: <span className="font-bold text-primary">{systemInfo.repositories.openmanus_web.commit}</span></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading hardware telemetry...
        </div>
      )}
    </div>
  );
}
