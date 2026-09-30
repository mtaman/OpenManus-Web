"use client";

import React from "react";
import { useServerStatus } from "@/hooks/useServerStatus";
import { RefreshCw, AlertCircle, WifiOff } from "lucide-react";

interface ServerStatusIndicatorProps {
  showLatency?: boolean;
  className?: string;
}

export function ServerStatusIndicator({
  showLatency = true,
  className = ""
}: ServerStatusIndicatorProps) {
  const { status, latency, isChecking, checkNow } = useServerStatus();

  return (
    <div
      onClick={() => checkNow()}
      title="Click to re-check server status"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && checkNow()}
      className={`group flex items-center gap-2 px-2 py-1 rounded-md text-xs font-mono select-none cursor-pointer transition-all hover:bg-muted/70 ${className}`}
    >
      {status === "checking" && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-[11px]">Connecting...</span>
        </div>
      )}

      {status === "online" && (
        <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium text-foreground">Online</span>
          {showLatency && latency > 0 && (
            <span className="text-[10px] text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded border border-border">
              {latency}ms
            </span>
          )}
        </div>
      )}

      {status === "degraded" && (
        <div className="flex items-center gap-1.5 text-amber-500">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">Degraded</span>
          {showLatency && latency > 0 && (
            <span className="text-[10px] text-amber-500/80 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">
              {latency}ms
            </span>
          )}
        </div>
      )}

      {status === "offline" && (
        <div className="flex items-center gap-1.5 text-destructive">
          <WifiOff className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">Offline</span>
          <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded border border-destructive/20 group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors">
            Retry
          </span>
        </div>
      )}

      {isChecking && status !== "checking" && (
        <RefreshCw className="h-2.5 w-2.5 animate-spin text-muted-foreground/60 ml-0.5" />
      )}
    </div>
  );
}

export default ServerStatusIndicator;
