"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "glow" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  className,
  variant = "secondary",
  size = "md",
  disabled,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:translate-y-px";

  const sizeClasses = {
    sm: "h-7 px-2.5 text-xs rounded-[var(--radius-sm)]",
    md: "h-8 px-3.5 text-xs rounded-[var(--radius-md)]",
    lg: "h-10 px-5 text-sm rounded-[var(--radius-lg)]",
  };

  const variantClasses = {
    primary: "bg-[var(--color-accent-500)] hover:bg-[var(--color-accent-400)] active:bg-[var(--color-accent-600)] text-white shadow-sm",
    glow: "bg-[var(--color-accent-500)] hover:bg-[var(--color-accent-400)] text-white shadow-[0_0_20px_var(--color-accent-glow)]",
    secondary: "bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-line)] text-[var(--color-ink)]",
    ghost: "bg-transparent hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
    danger: "bg-[var(--color-surface-2)] hover:bg-red-500/10 border border-red-500/30 text-red-400",
  };

  return (
    <button
      className={twMerge(clsx(base, sizeClasses[size], variantClasses[variant], className))}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}