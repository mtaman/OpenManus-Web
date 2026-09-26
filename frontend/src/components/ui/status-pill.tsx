"use client";

import React from "react";

interface StatusPillProps {
  status?: string;
  label?: string;
}

export function StatusPill({ status = "idle", label }: StatusPillProps) {
  const safeStatus = (status || "idle").toLowerCase();

  const getStatusColor = (st: string) => {
    switch (st) {
      case "running":
        return "bg-amber-500 animate-pulse";
      case "completed":
        return "bg-emerald-500";
      case "failed":
        return "bg-rose-500";
      default:
        return "bg-muted-foreground/60";
    }
  };

  const displayLabel = label || (status ? status.toUpperCase() : "IDLE");

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-card border border-border text-xs font-mono text-foreground shadow-sm">
      <span className={`w-2 h-2 rounded-full ${getStatusColor(safeStatus)}`} />
      <span className="font-semibold text-[10px] tracking-wider">{displayLabel}</span>
    </div>
  );
}

export default StatusPill;