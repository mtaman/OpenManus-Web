import React from "react";
import { clsx } from "clsx";

export type SystemStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "idle";

export function StatusPill({ status, label }: { status: SystemStatus; label?: string }) {
  const indicatorColor: Record<SystemStatus, string> = {
    pending: "bg-[var(--color-warning)] animate-pulse",
    running: "bg-[var(--color-agent-running)] animate-pulse",
    idle: "bg-[var(--color-ink-faint)]",
    completed: "bg-[var(--color-success)]",
    failed: "bg-[var(--color-danger)]",
    cancelled: "bg-[var(--color-cancelled)]",
  };

  const displayLabel = label || status.toUpperCase();

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs font-mono text-[var(--color-ink)]">
      <span className={clsx("w-2 h-2 rounded-full", indicatorColor[status] || "bg-[var(--color-ink-faint)]")} />
      <span>{displayLabel}</span>
    </div>
  );
}