"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Globe, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreviewTabProps {
  currentHtmlPath?: string | null;
}

export function PreviewTab({ currentHtmlPath }: PreviewTabProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const activeFile = currentHtmlPath || null;

  const loadHtml = useCallback(async (filePath: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
                  let rawHtml = data.content || "";
          // Compute directory path of the active HTML file to resolve scoped relative assets
          const normalizedPath = filePath.replace(/\\/g, "/");
          const lastSlash = normalizedPath.lastIndexOf("/");
          const dirPath = lastSlash !== -1 ? normalizedPath.substring(0, lastSlash + 1) : "";
          const baseHref = `/api/files/raw/${dirPath}`;
          
          const baseTag = `<base href="${baseHref}">`;
          if (rawHtml.includes("<head>")) {
            rawHtml = rawHtml.replace("<head>", `<head>${baseTag}`);
          } else if (rawHtml.includes("<html>")) {
            rawHtml = rawHtml.replace("<html>", `<html><head>${baseTag}</head>`);
          } else {
            rawHtml = `<head>${baseTag}</head>` + rawHtml;
          }
          setHtmlContent(rawHtml);
      } else {
        setHtmlContent("");
      }
    } catch {
      setHtmlContent("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeFile) {
      loadHtml(activeFile);
    } else {
      setHtmlContent("");
    }
  }, [activeFile, loadHtml]);

  if (!activeFile || !htmlContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-xs font-mono text-[var(--color-ink-faint)] bg-[var(--color-canvas)] space-y-3">
        <div className="h-12 w-12 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-emerald-400">
          <Globe size={24} />
        </div>
        <div>
          <span className="font-bold text-[var(--color-ink)] block text-sm mb-1">
            Sandbox Standby
          </span>
          <p className="max-w-xs text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
            No active HTML deliverable selected for this session. Generate an HTML file to preview it live.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-1)] font-mono overflow-hidden">
      {/* Top action toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] text-xs">
        <div className="flex items-center gap-2 truncate">
          <Globe size={14} className="text-emerald-400 flex-shrink-0" />
          <span className="text-[var(--color-ink)] font-semibold truncate max-w-[200px]">
            {activeFile}
          </span>
          <span className="text-[10px] text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Live Sandbox
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadHtml(activeFile)}
            disabled={loading}
            className="h-6 px-2 text-[10px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer"
          >
            <RefreshCw size={11} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <a
            href={`/api/files/download?path=${encodeURIComponent(activeFile)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-6 px-2 text-[10px] flex items-center gap-1 rounded bg-[var(--color-surface-1)] border border-[var(--color-line)] text-[var(--color-ink-muted)] hover:text-cyan-400 transition"
          >
            <ExternalLink size={11} />
            <span>Open</span>
          </a>
        </div>
      </div>

      {/* Render canvas */}
      <div className="flex-1 w-full h-full bg-white relative overflow-hidden">
        <iframe
          title="Live Sandbox Preview"
          srcDoc={htmlContent}
          sandbox="allow-scripts allow-modals allow-forms"
          className="w-full h-full border-none"
        />
      </div>
    </div>
  );
}

