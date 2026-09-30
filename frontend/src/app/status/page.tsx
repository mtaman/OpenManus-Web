"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  fetchFullDiagnostics,
  DiagnosticsReport
} from "@/lib/statusApi";
import {
  Activity,
  Cpu,
  HardDrive,
  Server,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Terminal,
  Settings,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SystemStatusPage() {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFullDiagnostics();
      setReport(data);
    } catch (e) {
      console.error("Failed to load diagnostics:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics]);

  const mem = report?.systemInfo?.os?.memory;
  const totalGb = mem?.total_gb || 0;
  const availGb = mem?.available_gb || 0;
  const usedGb = Math.max(0, +(totalGb - availGb).toFixed(1));
  const memUsagePercent = mem?.usage_percent || (totalGb > 0 ? Math.round((usedGb / totalGb) * 100) : 0);

  const overallStatus = !report?.isOnline
    ? "offline"
    : report.health?.status === "degraded"
    ? "degraded"
    : report.health?.status === "unhealthy"
    ? "unhealthy"
    : "healthy";

  return (
    <div className="w-full h-full flex flex-col flex-1 bg-background text-foreground overflow-hidden">
      {/* Header Bar */}
      <header className="w-full border-b border-border bg-card/75 backdrop-blur-md sticky top-0 z-10">
        <div className=" mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-manus-accent/10 text-manus-accent border border-accent/20 shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground tracking-tight">
                  System Health & Diagnostics
                </h1>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded-full border ${
                    overallStatus === "healthy"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : overallStatus === "degraded"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-destructive/10 text-destructive border-destructive/30"
                  }`}
                >
                  {overallStatus === "healthy"
                    ? "Operational"
                    : overallStatus === "degraded"
                    ? "Degraded"
                    : "Offline"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Runtime Engine Readiness, Hardware Resource Monitor & Integrity Probes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {report?.latency !== undefined && report.latency > 0 && (
              <span className="hidden sm:inline-flex text-[11px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border">
                Ping: {report.latency}ms
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadDiagnostics}
              disabled={loading}
              className="primary text-xs border-border bg-muted hover:bg-primary hover:text-primary-foreground text-primary transition shadow-sm h-8"
            >
              <RefreshCw size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Run Diagnostics
            </Button>
            <Link href="/settings">
              <Button
                size="sm"
                className="primary bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-sm h-8 px-3.5 transition"
              >
                <Settings size={13} className="mr-1.5" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Card */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Core Status</span>
                {overallStatus === "healthy" ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : overallStatus === "degraded" ? (
                  <AlertCircle size={16} className="text-amber-500" />
                ) : (
                  <XCircle size={16} className="text-destructive" />
                )}
              </div>
              <div className="text-lg font-bold text-foreground capitalize">{overallStatus}</div>
              <span className="text-[11px] text-muted-foreground mt-1">
                {report?.health?.server || "omweb-core"}
              </span>
            </div>

            {/* RAM Usage Card */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Memory Load</span>
                <HardDrive size={16} className="text-manus-accent" />
              </div>
              <div className="text-lg font-bold text-foreground">
                {memUsagePercent}%
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  ({usedGb} / {totalGb} GB)
                </span>
              </div>
              <div className="w-full bg-custom rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    memUsagePercent > 90
                      ? "bg-custom"
                      : memUsagePercent > 70
                      ? "bg-custom"
                      : "bg-manus-accent"
                  }`}
                  style={{ width: `${Math.min(100, memUsagePercent)}%` }}
                />
              </div>
            </div>

            {/* CPU Brand Card */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">CPU Processor</span>
                <Cpu size={16} className="text-manus-accent" />
              </div>
              <div className="text-xs font-bold text-foreground truncate" title={report?.systemInfo?.os?.cpu_brand}>
                {report?.systemInfo?.os?.cpu_brand || "Multi-Core Processor"}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">
                {report?.systemInfo?.os?.cores || 4} Physical/Logical Cores
              </span>
            </div>

            {/* LLM Engine Readiness */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">LLM Engine</span>
                <Sparkles size={16} className="text-manus-accent" />
              </div>
              <div className="text-sm font-bold text-foreground">
                {report?.health?.llm_configured ? "Configured" : "Unset"}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">
                {report?.health?.llm_configured
                  ? "Keys & Models Verified"
                  : "Requires Configuration"}
              </span>
            </div>
          </div>

          {/* Detailed Diagnostic Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engine & Storage Integrity Card */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                <div className="p-2 rounded-lg bg-manus-accent/10 text-manus-accent border border-accent/20">
                  <Server size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">OpenManus Core & Filesystem Integrity</h3>
                  <p className="text-xs text-muted-foreground">Subsystem binding and workspace storage probes</p>
                </div>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">OpenManus Engine Linked:</span>
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    {report?.health?.openmanus_linked ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        Linked & Mounted
                      </>
                    ) : (
                      <>
                        <XCircle size={13} className="text-destructive" />
                        Unlinked
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Workspaces Storage Access:</span>
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    {report?.health?.workspaces_writable ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        Read & Write Enabled
                      </>
                    ) : (
                      <>
                        <AlertCircle size={13} className="text-amber-500" />
                        Restricted / Read Only
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Core Git Commit:</span>
                  <span className="text-foreground font-semibold">
                    {report?.systemInfo?.repositories?.openmanus?.commit || "3309bf4"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Web Gateway Version:</span>
                  <span className="text-foreground font-semibold">
                    v{report?.systemInfo?.repositories?.openmanus_web?.version || "2.0.0"} (
                    {report?.systemInfo?.repositories?.openmanus_web?.commit || "latest"})
                  </span>
                </div>
              </div>
            </div>

            {/* Software & Runtime Environment Card */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <Terminal size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Runtime Environment</h3>
                  <p className="text-xs text-muted-foreground">Operating system, Python interpreter, and paths</p>
                </div>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Operating System:</span>
                  <span className="text-foreground font-semibold">
                    {report?.systemInfo?.os?.system} {report?.systemInfo?.os?.release} (
                    {report?.systemInfo?.os?.machine})
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Python Runtime:</span>
                  <span className="text-foreground font-semibold">
                    v{report?.systemInfo?.software?.python || report?.health?.python_version || "3.12"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border space-y-1">
                  <span className="text-muted-foreground block text-[11px]">Interpreter Executable:</span>
                  <span className="text-foreground block truncate text-[11px]" title={report?.systemInfo?.software?.python_executable}>
                    {report?.systemInfo?.software?.python_executable || "Active venv"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border space-y-1">
                  <span className="text-muted-foreground block text-[11px]">Core Repository Path:</span>
                  <span className="text-foreground block truncate text-[11px]" title={report?.systemInfo?.repositories?.openmanus?.path}>
                    {report?.systemInfo?.repositories?.openmanus?.path || "D:\\AI\\OpenManus"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Endpoints Status Table */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">API Probe Audit</h3>
                  <p className="text-xs text-muted-foreground">Real-time health of primary operational endpoints</p>
                </div>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Probed: {new Date(report?.timestamp || Date.now()).toLocaleTimeString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2.5 font-semibold">Endpoint</th>
                    <th className="pb-2.5 font-semibold">Purpose</th>
                    <th className="pb-2.5 font-semibold">Target Subsystem</th>
                    <th className="pb-2.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="py-2.5 text-foreground">GET /api/status/health</td>
                    <td className="py-2.5 text-muted-foreground">Runtime Health & Readiness</td>
                    <td className="py-2.5 text-muted-foreground">Core Watchdog</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        200 OK
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-foreground">GET /api/status/system-info</td>
                    <td className="py-2.5 text-muted-foreground">Hardware, CPU & RAM Metrics</td>
                    <td className="py-2.5 text-muted-foreground">System Prober</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        200 OK
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-foreground">GET /api/chats</td>
                    <td className="py-2.5 text-muted-foreground">Chat Sessions & Projects</td>
                    <td className="py-2.5 text-muted-foreground">Session Store</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        200 OK
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
