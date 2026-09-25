"use client";

import React from "react";
import { StepGroup } from "@/lib/types";
import { ThoughtCard } from "./thought-card";
import { ToolCallCard } from "./tool-call-card";

export function StepTimeline({ steps }: { steps: StepGroup[] }) {
  if (!steps || steps.length === 0) return null;

  // Filter out any step groups that do not have actual items (thoughts or tools)
  const populatedSteps = steps.filter((group) => group.items && group.items.length > 0);

  if (populatedSteps.length === 0) return null;

  return (
    <div className="space-y-3 my-4">
      {populatedSteps.map((group) => (
        <div
          key={group.step}
          className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-1)] p-3.5 shadow-sm"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-line-subtle)] text-xs font-mono text-[var(--color-ink-muted)]">
            <span className="font-semibold text-[var(--color-ink)]">Execution Step {group.step}</span>
            {group.durationMs ? <span>{group.durationMs}ms</span> : null}
          </div>

          <div className="space-y-1.5">
            {group.items.map((item) => {
              if (item.kind === "thought") {
                return <ThoughtCard key={item.id} thought={item.text} />;
              }
              if (item.kind === "tool") {
                return <ToolCallCard key={item.id} tool={item} />;
              }
              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}