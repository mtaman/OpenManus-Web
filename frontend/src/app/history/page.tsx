"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import {
  History,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  Calendar,
  AlertCircle
} from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

interface JobRecord {
  id: string;
  prompt: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  steps_count?: number;
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const setCurrentJobId = useChatStore((state) => state.setCurrentJobId);
  const addMessage = useChatStore((state) => state.addMessage);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/run/jobs");
      if (!res.ok) {
        throw new Error("Failed to load historical execution records");
      }
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRerun = (job: JobRecord) => {
    setCurrentJobId(job.id);
    addMessage({
      id: `rerun-${Date.now()}`,
      role: "user",
      content: job.prompt,
      timestamp: new Date().toISOString(),
    });
    router.push("/chat");
  };

  const getStatusBadge = (status: JobRecord["status"]) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            {t("common.completed", "Completed")}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
            <XCircle className="h-3 w-3" />
            {t("common.failed", "Failed")}
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3 animate-spin" />
            {t("common.running", "Running")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <Clock className="h-3 w-3" />
            {t("common.pending", "Pending")}
          </span>
        );
    }
  };

  const filteredJobs = jobs.filter((job) =>
    job.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            <span>{t("common.history", "Execution History")}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("common.appName")} — Session Archives & Task Replays
          </p>
        </div>

        <button
          onClick={fetchJobs}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>{t("common.refresh", "Refresh")}</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter archived jobs by prompt content..."
          className="w-full rounded-xl border border-border bg-card ps-9 pe-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      {/* History Records Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-destructive flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : loading && jobs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Loading job archives...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {searchQuery ? "No executions match your search filter." : "No archived jobs recorded yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Task Prompt</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-foreground max-w-md">
                      <div className="truncate" title={job.prompt}>
                        {job.prompt}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        ID: {job.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {job.created_at ? new Date(job.created_at).toLocaleString() : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-end whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRerun(job)}
                          title="Re-run Prompt in Chat"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Re-run</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}