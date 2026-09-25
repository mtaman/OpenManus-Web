"use client";

import React, { useState } from "react";
import { Globe, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PreviewTab() {
  const [cdpUrl] = useState("http://localhost:9222");

  return (
    <div className="flex flex-col h-full bg-[var(--color-void)] text-xs font-mono">
      {/* Browser Navigation Bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
        <Globe size={14} className="text-[var(--color-ink-muted)]" />
        <div className="flex-1 px-2.5 py-1 rounded bg-[var(--color-surface-1)] border border-[var(--color-line-subtle)] text-[var(--color-ink-muted)] truncate">
          {cdpUrl}
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Reload Target">
          <RefreshCw size={12} />
        </Button>
      </div>

      {/* Viewport Surface / Fallback */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--color-ink-muted)]">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
          <AlertCircle size={20} />
        </div>
        <div className="font-semibold text-sm text-[var(--color-ink)] mb-1">CDP Target Detached</div>
        <p className="max-w-xs text-[11px] leading-relaxed mb-4">
          Remote browser debugging port (:9222) is currently idle or awaiting target attachment.
        </p>
        <code className="px-2 py-1 rounded bg-[var(--color-surface-2)] border border-[var(--color-line)] text-[10px] text-[var(--color-code-ink)]">
          chrome.exe --remote-debugging-port=9222
        </code>
      </div>
    </div>
  );
}