import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx(
          "bg-[var(--color-surface-1)] border border-[var(--color-line)] rounded-[var(--radius-lg)] p-4 shadow-sm",
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}