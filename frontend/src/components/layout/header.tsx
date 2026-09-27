"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { Cpu, CheckCircle2, Activity } from "lucide-react";

interface HeaderProps {
  status?: "idle" | "running" | "ready" | "completed" | "error";
  sessionTitle?: string;
  stepCount?: number;
}

export function Header({
  status = "ready",
  sessionTitle = "New Autonomous Session",
  stepCount,
}: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="h-14 border-b border-border bg-card/70 backdrop-blur-md px-5 flex items-center justify-between z-10 transition-colors">
      {/* Left: Session Title & Agent Status Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 truncate">
          <Cpu className="h-4 w-4 text-manus-accent shrink-0" />
          <span className="font-heading font-medium text-xs sm:text-sm text-foreground truncate max-w-[200px] sm:max-w-md">
            {sessionTitle}
          </span>
        </div>

        {/* Semantic Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5">
          {status === "running" ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-mono font-medium bg-manus-warning/15 text-manus-warning border border-manus-warning/30">
              <span className="w-1.5 h-1.5 rounded-full bg-manus-warning animate-pulse" />
              <span>RUNNING</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-mono font-medium bg-manus-success/15 text-manus-success border border-manus-success/30">
              <span className="w-1.5 h-1.5 rounded-full bg-manus-success" />
              <span>READY</span>
            </span>
          )}

          {typeof stepCount === "number" && (
            <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded-sm bg-background border border-border">
              Step {stepCount}
            </span>
          )}
        </div>
      </div>

      {/* Right: Controls & Toggles */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-mono mr-2">
          <Activity className="h-3.5 w-3.5 text-manus-success animate-pulse" />
          <span>Core Online</span>
        </div>
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </header>
  );
}

export default Header;
