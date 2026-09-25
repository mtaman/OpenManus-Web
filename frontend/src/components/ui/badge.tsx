import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "running" | "success" | "warning" | "danger" | "thought";
}

export function Badge({ children, className, variant = "neutral", ...props }: BadgeProps) {
  const base = "inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-[var(--radius-sm)] border";

  const variantClasses = {
    neutral: "bg-[var(--color-surface-2)] border-[var(--color-line)] text-[var(--color-ink-muted)]",
    running: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    danger: "bg-red-500/10 border-red-500/30 text-red-300",
    thought: "bg-purple-500/10 border-purple-500/30 text-purple-300",
  };

  return (
    <span className={twMerge(clsx(base, variantClasses[variant], className))} {...props}>
      {children}
    </span>
  );
}