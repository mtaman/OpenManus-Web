"use client";

import React, { useEffect, useState } from "react";
import { 
  Activity, 
  CheckCircle2, 
  RefreshCw, 
  Download, 
  FolderSearch, 
  Link2, 
  AlertCircle, 
  Cpu, 
  FolderCheck,
  FileCode2,
  HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EngineStatus {
  engine_path: string;
  is_valid: boolean;
  is_embedded: boolean;
  has_config: boolean;
  workspace_exists: boolean;
}

interface DetectedCandidate {
  path: string;
  is_valid: boolean;
  is_embedded: boolean;
}

export default function SetupPage() {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [candidates, setCandidates] = useState<DetectedCandidate[]>([]);
  const [customPath, setCustomPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const fetchStatusAndDetect = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [statusRes, detectRes] = await Promise.all([
        fetch("/api/setup/status"),
        fetch("/api/setup/detect", { method: "POST" })
      ]);
      
      if (statusRes.ok) {
        const statusData: EngineStatus = await statusRes.json();
        setStatus(statusData);
        if (statusData.engine_path) {
          setCustomPath(statusData.engine_path);
        }
      }

      if (detectRes.ok) {
        const detectData = await detectRes.json();
        setCandidates(detectData.candidates || []);
      }
    } catch (err: any) {
      setMessage({ text: "Failed to connect to backend setup API.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPath = async (targetPath: string) => {
    if (!targetPath.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/setup/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine_path: targetPath.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Validation failed for selected directory.");
      }
      setMessage({ text: `Engine successfully linked to: ${data.engine_path}`, type: "success" });
      await fetchStatusAndDetect();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to link path", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleInstallEmbedded = async () => {
    setInstalling(true);
    setMessage({ text: "Cloning OpenManus core repository into engine/openmanus...", type: "info" });
    try {
      const res = await fetch("/api/setup/install-embedded", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Installation failed.");
      }
      setMessage({ text: "Embedded OpenManus engine successfully installed & configured!", type: "success" });
      await fetchStatusAndDetect();
    } catch (err: any) {
      setMessage({ text: err.message || "Installation failed", type: "error" });
    } finally {
      setInstalling(false);
    }
  };

  useEffect(() => {
    fetchStatusAndDetect();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-ink)] font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
        <div className="flex items-center gap-3">
          <Activity size={18} className="text-emerald-400" />
          <h1 className="text-sm font-semibold tracking-wide">OpenManus Engine Onboarding & Resolver</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchStatusAndDetect} disabled={loading || installing}>
          <RefreshCw size={12} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-4xl">
        {/* Banner notification */}
        {message && (
          <div className={`p-3 rounded border text-xs flex items-center gap-2 ${
            message.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : message.type === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
          }`}>
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Current Active Engine Status */}
        <Card className="p-4 bg-[var(--color-surface-1)] border-[var(--color-line)]">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line-subtle)] mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-[var(--color-thought)]" />
              <span className="font-semibold text-sm">Active Engine Status</span>
            </div>
            {status?.is_valid ? (
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
                READY & SYNCHRONIZED
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px]">
                ACTION REQUIRED
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-[var(--color-surface-2)]">
              <span className="text-[var(--color-ink-muted)]">Active Path:</span>
              <span className="font-semibold text-[var(--color-code-ink)] select-all">{status?.engine_path || "None"}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
              <div className="flex items-center gap-2 p-2 rounded bg-[var(--color-surface-2)]">
                <HardDrive size={13} className={status?.is_embedded ? "text-cyan-400" : "text-emerald-400"} />
                <span className="text-[11px]">Type: {status?.is_embedded ? "Embedded" : "External"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-[var(--color-surface-2)]">
                <FileCode2 size={13} className={status?.has_config ? "text-emerald-400" : "text-amber-400"} />
                <span className="text-[11px]">Config: {status?.has_config ? "config.toml Found" : "Missing config"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-[var(--color-surface-2)]">
                <FolderCheck size={13} className={status?.workspace_exists ? "text-emerald-400" : "text-amber-400"} />
                <span className="text-[11px]">Workspace: {status?.workspace_exists ? "Active" : "Auto-created"}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Option A: One-Click Embedded Engine Setup */}
        <Card className="p-4 bg-[var(--color-surface-1)] border-[var(--color-line)]">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[var(--color-line-subtle)]">
            <Download size={15} className="text-cyan-400" />
            <span className="font-semibold text-xs">Option A: Zero-Config Embedded Engine</span>
          </div>
          <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed mb-3">
            If you do not have OpenManus installed elsewhere, install an isolated embedded engine inside this project directory (`engine/openmanus`).
          </p>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleInstallEmbedded} 
            disabled={installing || (status?.is_embedded && status?.is_valid)}
          >
            <Download size={13} className={`mr-1.5 ${installing ? "animate-spin" : ""}`} />
            {installing ? "Cloning Engine..." : (status?.is_embedded && status?.is_valid) ? "Embedded Engine Active" : "Install Embedded Engine"}
          </Button>
        </Card>

        {/* Option B: Link Existing / Detected Engine */}
        <Card className="p-4 bg-[var(--color-surface-1)] border-[var(--color-line)]">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[var(--color-line-subtle)]">
            <FolderSearch size={15} className="text-emerald-400" />
            <span className="font-semibold text-xs">Option B: Link Existing OpenManus Installation</span>
          </div>

          <div className="space-y-3">
            {/* Detected Candidates */}
            <div>
              <span className="text-[10px] text-[var(--color-ink-faint)] uppercase tracking-wider block mb-2">Detected Locations on Machine</span>
              <div className="space-y-1.5">
                {candidates.map((cand, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-[var(--color-surface-2)] text-[11px]">
                    <div className="flex items-center gap-2 truncate max-w-lg">
                      {cand.is_valid ? <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" /> : <AlertCircle size={13} className="text-zinc-500 flex-shrink-0" />}
                      <span className="truncate select-all">{cand.path}</span>
                    </div>
                    {cand.is_valid ? (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-6 text-[10px]" 
                        onClick={() => handleLinkPath(cand.path)}
                        disabled={loading || status?.engine_path === cand.path}
                      >
                        {status?.engine_path === cand.path ? "Active" : "Use Path"}
                      </Button>
                    ) : (
                      <span className="text-[9px] text-[var(--color-ink-faint)]">Not Installed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Path Input */}
            <div className="pt-2">
              <span className="text-[10px] text-[var(--color-ink-faint)] uppercase tracking-wider block mb-1.5">Custom Path</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="e.g. D:\AI\OpenManus"
                  className="flex-1 px-3 py-1.5 text-xs rounded bg-[var(--color-void)] border border-[var(--color-line)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-thought)] font-mono"
                />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => handleLinkPath(customPath)} 
                  disabled={loading || !customPath.trim()}
                >
                  <Link2 size={12} className="mr-1.5" />
                  Validate & Link
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}