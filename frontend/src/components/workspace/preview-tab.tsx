"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Monitor, RefreshCw, ExternalLink, Code2, Sparkles } from "lucide-react";

export interface PreviewTabProps {
  jobId?: string | null;
  activeJobId?: string | null;
  currentHtmlPath?: string | null;
  filePath?: string | null;
  overrideFile?: string | null;
}

export function PreviewTab({
  jobId,
  activeJobId,
  currentHtmlPath,
  filePath,
  overrideFile
}: PreviewTabProps) {
  const effectiveJobId = jobId || activeJobId || null;
  const [autoFile, setAutoFile] = useState<string | null>(null);

  const explicitFile = overrideFile || currentHtmlPath || filePath || null;
  const effectiveFile = explicitFile || autoFile;

  const [rawHtml, setRawHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Auto-discover HTML deliverable if none is explicitly passed
  useEffect(() => {
    if (effectiveJobId && !explicitFile) {
      fetch(`/api/run/jobs/${effectiveJobId}/files`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.files && Array.isArray(data.files)) {
            const html = data.files.find((f: { name: string }) => {
              const lower = f.name.toLowerCase();
              return lower.endsWith(".html") || lower.endsWith(".htm");
            });
            if (html) {
              setAutoFile(html.name);
            }
          }
        })
        .catch(() => {});
    }
  }, [effectiveJobId, explicitFile]);

  const fetchHtml = useCallback(async () => {
    if (!effectiveJobId || !effectiveFile) {
      setRawHtml("");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/run/jobs/${effectiveJobId}/content?path=${encodeURIComponent(effectiveFile)}`);
      if (res.ok) {
        const data = await res.json();
        setRawHtml(data.content || "");
      } else {
        setRawHtml("");
      }
    } catch (e) {
      console.error("Failed to load preview content", e);
      setRawHtml("");
    } finally {
      setLoading(false);
    }
  }, [effectiveJobId, effectiveFile, refreshKey]);

  useEffect(() => {
    fetchHtml();
  }, [fetchHtml]);

  // Inject scoped base tag so relative assets resolve directly to this job's storage
  const sandboxedHtml = useMemo(() => {
    if (!rawHtml || !effectiveJobId) return "";
    const baseHref = `/api/run/jobs/${effectiveJobId}/raw/`;
    const baseTag = `<base href="${baseHref}">`;

    if (rawHtml.includes("<head>")) {
      return rawHtml.replace("<head>", `<head>${baseTag}`);
    }
    return `${baseTag}${rawHtml}`;
  }, [rawHtml, effectiveJobId]);

  if (!effectiveJobId || !effectiveFile || !rawHtml) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950 text-slate-400 p-8 select-none">
        <div className="flex flex-col items-center max-w-sm text-center space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative">
            <Code2 className="w-10 h-10 text-emerald-400" />
            <Sparkles className="w-4 h-4 text-cyan-400 absolute top-2 right-2 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Sandbox Standby</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Live web applications and HTML deliverables generated for this session will appear here in real time.
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Loading deliverables...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const rawUrl = `/api/run/jobs/${effectiveJobId}/raw/${effectiveFile}`;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden">
      <div className="h-10 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Monitor className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-slate-200 truncate max-w-[200px]">{effectiveFile}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            Isolated
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            title="Refresh Sandbox"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <a
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new window"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition flex items-center gap-1 text-[11px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="flex-1 w-full h-full bg-white relative overflow-hidden">
        <iframe
          key={`${effectiveJobId}-${effectiveFile}-${refreshKey}`}
          title="Sandbox Preview"
          srcDoc={sandboxedHtml}
          sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}

export default PreviewTab;