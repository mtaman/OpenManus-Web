"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History, Play, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill, SystemStatus } from "@/components/ui/status-pill";

interface HistoricalJob {
  job_id: string;
  prompt: string;
  status: SystemStatus;
  created_at?: string;
  result?: string;
  steps_count?: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<HistoricalJob[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/run/jobs");
      const data = await res.json();
      const jobList = Array.isArray(data) ? data : data.jobs || [];
      setJobs(jobList);
    } catch (err) {
      console.error("Failed to load historical jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleReRun = (prompt: string) => {
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-ink)] font-mono text-xs overflow-hidden">
      {/* History Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
        <div className="flex items-center gap-3">
          <History size={18} className="text-[var(--color-accent-400)]" />
          <h1 className="text-sm font-semibold tracking-wide">Historical Run Archives</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchHistory} disabled={loading}>
          <RefreshCw size={12} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Archives List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {jobs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-[var(--color-ink-muted)]">
            <Clock size={28} className="mb-2 text-[var(--color-ink-faint)]" />
            <div className="text-sm font-semibold text-[var(--color-ink)] mb-1">No execution history found</div>
            <p className="text-xs text-[var(--color-ink-faint)] max-w-sm">
              Jobs dispatched through the autonomous engine will be persisted and archived here.
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <Card
              key={job.job_id}
              className="flex items-center justify-between p-4 bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] transition-all border-[var(--color-line)]"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <StatusPill status={job.status || "completed"} />
                  <span className="text-[10px] text-[var(--color-ink-faint)] font-mono truncate">
                    ID: {job.job_id}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-ink)] truncate" title={job.prompt}>
                  {job.prompt}
                </h3>
                {job.result && (
                  <p className="text-xs text-[var(--color-ink-muted)] line-clamp-1 mt-1 font-sans">
                    {job.result}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleReRun(job.prompt)}
                  title="Re-run this prompt in chat"
                >
                  <Play size={12} className="mr-1.5 fill-current" />
                  Re-run
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}