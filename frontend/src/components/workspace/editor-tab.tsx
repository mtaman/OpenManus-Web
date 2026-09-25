"use client";

import React from "react";
import { Code2, ShieldAlert } from "lucide-react";

export function EditorTab({ filePath }: { filePath?: string | null }) {
  return (
    <div className="flex flex-col h-full bg-[var(--color-void)] text-xs font-mono">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
        <div className="flex items-center gap-2 text-[var(--color-code-ink)]">
          <Code2 size={14} />
          <span>{filePath || "No active file selected"}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-mono">
          <ShieldAlert size={12} />
          <span>Read-Only Guard</span>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto text-[var(--color-ink-faint)] leading-relaxed">
        {filePath ? (
          <pre className="text-[var(--color-ink)] font-mono text-[11px]">
            // Content viewer for: {filePath}
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            Select a file from the Files tab to inspect source code.
          </div>
        )}
      </div>
    </div>
  );
}