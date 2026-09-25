import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx(
          "animate-pulse bg-[var(--color-surface-3)] rounded-[var(--radius-md)]",
          className
        )
      )}
      {...props}
    />
  );
}