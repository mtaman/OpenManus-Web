"use client";

import React from "react";
import { Cpu } from "lucide-react";
import { ServerStatusIndicator } from "./ServerStatusIndicator";

interface HeaderProps {
  status?: "idle" | "running" | "ready" | "completed" | "error";
  sessionTitle?: string;
  stepCount?: number;
}

export function Header({
  status = "idle",
  sessionTitle = "New Autonomous Session",
  stepCount,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-border backdrop-blur-md px-5 flex items-center justify-between z-10 transition-colors">
      {/* Left: Session Title & Agent Status Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 truncate">
          <Cpu className="h-4 w-4 text-accent shrink-0" />
          <span className="font-heading font-medium text-xs sm:text-sm text-foreground truncate max-w-[200px] sm:max-w-md">
            {sessionTitle}
          </span>
        </div>

        {/* Semantic Status Badge - Only visible when actively RUNNING */}
        {status === "running" && (
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-mono font-medium bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>RUNNING</span>
            </span>

            {typeof stepCount === "number" && (
              <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded-sm bg-background border border-border">
                Step {stepCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Live Dynamic Server Status Indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <ServerStatusIndicator showLatency={true} />
      </div>
    </header>
  );
}

export default Header;
