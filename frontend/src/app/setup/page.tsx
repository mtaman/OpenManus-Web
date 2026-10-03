"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cpu,
  CheckCircle2,
  RefreshCw,
  Download,
  FolderSearch,
  Link2,
  AlertCircle,
  HardDrive,
  FileCode2,
  FolderCheck,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  Settings,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface EngineStatus {
  engine_path: string;
  is_valid: boolean;
  is_embedded: boolean;
  has_config: boolean;
  workspace_exists: boolean;
  storage_root?: string;
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const fetchStatusAndDetect = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [statusRes, detectRes] = await Promise.all([
        fetch("/api/setup/status"),
        fetch("/api/setup/detect", { method: "POST" }),
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
    } catch {
      setMessage({ text: "Unable to communicate with peldrun setup service.", type: "error" });
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
      setMessage({ text: `Engine successfully verified and linked: ${data.engine_path}`, type: "success" });
      await fetchStatusAndDetect();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to link specified path", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleInstallEmbedded = async () => {
    setInstalling(true);
    setMessage({ text: "Provisioning embedded peldrun core engine...", type: "info" });
    try {
      const res = await fetch("/api/setup/install-embedded", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Embedded engine installation failed.");
      }
      setMessage({ text: "Embedded peldrun engine successfully installed and configured!", type: "success" });
      await fetchStatusAndDetect();
    } catch (err: any) {
      setMessage({ text: err.message || "Installation failed", type: "error" });
    } finally {
      setInstalling(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    if (!text) return;
    try {
      if (typeof window !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-999999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Safe fallback
    }
  };

  useEffect(() => {
    fetchStatusAndDetect();
  }, []);

  const isEngineReady = Boolean(status?.is_valid);

  return (
    <div className="min-h-screen w-full flex flex-col bg-background font-sans select-text">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-border/80 bg-card/60 backdrop-blur-md px-6 md:px-12 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-card border border-border p-1 shadow-peldrun-xs flex items-center justify-center">
            <img src="/peldrun-logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-sm text-foreground tracking-tight">peldrun Web</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                Setup Wizard
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground block -mt-0.5">Autonomous Agent Engine Onboarding</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatusAndDetect}
            disabled={loading || installing}
            className="h-8 text-xs font-sans border-border bg-background hover:bg-muted text-foreground cursor-pointer shadow-peldrun-xs"
          >
            <RefreshCw size={12} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Diagnostics</span>
          </Button>

          <ThemeToggle />

          <Link href="/chat">
            <Button
              variant={isEngineReady ? "primary" : "secondary"}
              size="sm"
              className="h-8 text-xs font-sans gap-1 shadow-peldrun-xs cursor-pointer"
            >
              <span>{isEngineReady ? "Go to Workspace" : "Skip Setup"}</span>
              <ArrowRight size={12} />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Setup Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 space-y-8">
        {/* Stepper Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <Sparkles size={13} className="text-primary animate-pulse" />
            <span>Autonomous Intelligence Gateway</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground tracking-tight">
            Connect Your peldrun Engine
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            peldrun Web operates alongside the core autonomous agent. Configure your runtime engine below to unlock autonomous execution, multi-modal reasoning, and sovereign workspaces.
          </p>

          {/* 3-Step Visual Progress Bar */}
          <div className="flex items-center justify-center gap-2 md:gap-4 pt-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</span>
              <span className="font-medium">Engine Link</span>
            </div>
            <div className="w-8 md:w-16 h-px bg-border" />
            <div className={`flex items-center gap-1.5 ${status?.has_config ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                status?.has_config ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"
              }`}>2</span>
              <span className="font-medium">Configuration</span>
            </div>
            <div className="w-8 md:w-16 h-px bg-border" />
            <div className={`flex items-center gap-1.5 ${isEngineReady ? "text-peldrun-success" : "text-muted-foreground"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isEngineReady ? "bg-peldrun-success text-white" : "bg-muted text-muted-foreground border border-border"
              }`}>3</span>
              <span className="font-medium">Launch</span>
            </div>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {message && (
          <div
            className={`p-3.5 rounded-sm border text-xs flex items-center gap-2.5 transition-all shadow-peldrun-xs ${
              message.type === "success"
                ? "bg-peldrun-success/10 border-peldrun-success/30 text-peldrun-success"
                : message.type === "error"
                ? "bg-peldrun-error/10 border-peldrun-error/30 text-peldrun-error"
                : "bg-primary/10 border-primary/30 text-primary"
            }`}
          >
            <AlertCircle size={15} className="shrink-0" />
            <span className="font-medium leading-relaxed">{message.text}</span>
          </div>
        )}

        {/* Diagnostic Radar Card */}
        <Card className="p-5 md:p-6 bg-card border-border shadow-peldrun-sm rounded-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-2.5">
              <Cpu size={17} className="text-primary" />
              <div>
                <h2 className="text-xs md:text-sm font-semibold text-foreground font-heading">
                  System Diagnostic Radar
                </h2>
                <span className="text-[11px] text-muted-foreground">Real-time status of agent core integration</span>
              </div>
            </div>

            {isEngineReady ? (
              <span className="px-2.5 py-1 rounded-full bg-peldrun-success/15 border border-peldrun-success/30 text-peldrun-success font-mono text-[10px] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-peldrun-success animate-ping" />
                READY & SYNCHRONIZED
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-peldrun-warning/15 border border-peldrun-warning/30 text-peldrun-warning font-mono text-[10px] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-peldrun-warning" />
                ENGINE BINDING REQUIRED
              </span>
            )}
          </div>

          <div className="space-y-3">
            {/* Dynamic Paths (Engine Core & Native Storage) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/80">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-0.5">
                    Agent Core Directory
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground truncate block select-all">
                    {status?.engine_path || "Auto-detecting engine path..."}
                  </span>
                </div>
                {status?.engine_path && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(status.engine_path, "engine")}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer shrink-0"
                    title="Copy engine path"
                  >
                    {copiedKey === "engine" ? <Check size={14} className="text-peldrun-success" /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/80">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-0.5">
                    Storage & Workspace Root
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground truncate block select-all">
                    {status?.storage_root || "storage/ (Localized)"}
                  </span>
                </div>
                {status?.storage_root && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(status.storage_root!, "storage")}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer shrink-0"
                    title="Copy storage path"
                  >
                    {copiedKey === "storage" ? <Check size={14} className="text-peldrun-success" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>

            {/* Sub-status badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-background border border-border/60">
                <HardDrive size={15} className={status?.is_embedded ? "text-primary" : "text-peldrun-accent"} />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-mono">CORE TYPE</span>
                  <span className="text-xs font-medium text-foreground">
                    {status?.is_embedded ? "Embedded Core" : status?.engine_path ? "Linked Engine" : "Unlinked"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-background border border-border/60">
                <FileCode2 size={15} className={status?.has_config ? "text-peldrun-success" : "text-peldrun-warning"} />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-mono">CONFIG TOML</span>
                  <span className="text-xs font-medium text-foreground">
                    {status?.has_config ? "config.toml Verified" : "Missing config.toml"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-background border border-border/60">
                <FolderCheck size={15} className={status?.workspace_exists ? "text-peldrun-success" : "text-muted-foreground"} />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-mono">WORKSPACE STORAGE</span>
                  <span className="text-xs font-medium text-foreground">
                    {status?.workspace_exists ? "Storage Active" : "Auto-Initialized"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pathway A: Zero-Config Embedded */}
          <Card className="p-6 bg-card border-border shadow-peldrun-sm rounded-sm flex flex-col justify-between space-y-5 relative overflow-hidden group hover:border-primary/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary w-fit">
                  <Download size={20} />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                  Recommended
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground font-heading">
                  Option 1: Embedded Core Engine
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Provisions an isolated peldrun repository directly inside the local engine workspace. Ideal for zero-dependency local setups.
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-peldrun-success" />
                  <span>Isolated sandbox environment</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-peldrun-success" />
                  <span>Automatic config synchronization</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-peldrun-success" />
                  <span>Guaranteed version compatibility</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleInstallEmbedded}
              disabled={installing || (status?.is_embedded && status?.is_valid)}
              className="w-full text-xs font-sans gap-2 shadow-peldrun-sm cursor-pointer"
            >
              <Download size={14} className={installing ? "animate-spin" : ""} />
              <span>
                {installing
                  ? "Configuring Core..."
                  : status?.is_embedded && status?.is_valid
                  ? "Embedded Engine Active"
                  : "Install Embedded Engine"}
              </span>
            </Button>
          </Card>

          {/* Pathway B: Link Existing / Detected Engine */}
          <Card className="p-6 bg-card border-border shadow-peldrun-sm rounded-sm flex flex-col justify-between space-y-5 hover:border-primary/40 transition-all">
            <div className="space-y-4">
              <div className="p-2.5 rounded-lg bg-peldrun-accent/10 border border-peldrun-accent/20 text-peldrun-accent w-fit">
                <FolderSearch size={20} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground font-heading">
                  Option 2: Connect Existing Installation
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Already have peldrun cloned elsewhere on your computer? Link its directory to reuse your existing tools and custom agents.
                </p>
              </div>

              {/* Detected Candidate Quick-Pills */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block">Detected Candidates</span>
                {candidates.length === 0 ? (
                  <div className="p-2.5 rounded-lg bg-background border border-border/60 text-center text-xs text-muted-foreground">
                    No pre-existing peldrun installations detected.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {candidates.map((cand, idx) => {
                      const isActive = status?.engine_path === cand.path;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/80 text-xs gap-2"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {cand.is_valid ? (
                              <CheckCircle2 size={13} className="text-peldrun-success shrink-0" />
                            ) : (
                              <AlertCircle size={13} className="text-muted-foreground shrink-0" />
                            )}
                            <span className="font-mono text-[11px] truncate select-all">{cand.path}</span>
                          </div>
                          {cand.is_valid ? (
                            <Button
                              variant={isActive ? "primary" : "secondary"}
                              size="sm"
                              className="h-6 px-2 text-[10px] font-sans cursor-pointer shrink-0 shadow-peldrun-xs"
                              onClick={() => handleLinkPath(cand.path)}
                              disabled={loading || isActive}
                            >
                              {isActive ? "Active" : "Connect"}
                            </Button>
                          ) : (
                            <span className="text-[9px] text-muted-foreground shrink-0">Incomplete</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dynamic Path Input (No Hardcoding) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block">Custom Directory Path</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder={candidates.length > 0 ? candidates[0].path : "Enter path to peldrun directory..."}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-peldrun-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLinkPath(customPath)}
                    disabled={loading || !customPath.trim()}
                    className="h-8 px-3 text-xs font-sans gap-1.5 cursor-pointer shadow-peldrun-xs"
                  >
                    <Link2 size={12} />
                    <span>Link</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Launch Gate & Next Steps */}
        {isEngineReady && (
          <Card className="p-6 bg-peldrun-success/5 border-peldrun-success/30 rounded-sm shadow-peldrun-md flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <CheckCircle2 size={18} className="text-peldrun-success" />
                <h3 className="text-sm font-semibold text-foreground font-heading">
                  All Systems Operational and Ready!
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                peldrun core engine is synchronized. You can now launch autonomous sessions or customize your model API keys.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link href="/settings">
                <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-sans gap-1.5 border-border shadow-peldrun-xs cursor-pointer">
                  <Settings size={13} />
                  <span>Configure API Keys</span>
                </Button>
              </Link>
              <Link href="/chat">
                <Button variant="primary" size="sm" className="h-9 px-4 text-xs font-sans gap-1.5 shadow-peldrun-sm cursor-pointer">
                  <span>Start Autonomous Session</span>
                  <ArrowRight size={13} />
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}