"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  History, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Search, 
  RefreshCw,
  Eye,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

interface JobRecord {
  job_id: string;
  prompt: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: number;
  updated_at: number;
  steps_count: number;
  final_result?: string;
  error?: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/run/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to load jobs history", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async (jobId: string) => {
    setRerunningId(jobId);
    try {
      const res = await fetch(`/api/run/jobs/${jobId}/rerun`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        router.push(`/chat?job_id=${data.job_id}`);
      }
    } catch (err) {
      console.error("Failed to rerun task", err);
    } finally {
      setRerunningId(null);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((j) => 
    j.prompt.toLowerCase().includes(search.toLowerCase()) ||
    j.job_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-ink)] font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
        <div className="flex items-center gap-3">
          <History size={18} className="text-cyan-400" />
          <h1 className="text-sm font-semibold tracking-wide">Autonomous Task Execution History</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchJobs} disabled={loading}>
          <RefreshCw size={12} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Job List */}
        <div className="w-1/2 flex flex-col border-r border-[var(--color-line)] p-4 space-y-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--color-void)] border border-[var(--color-line)]">
            <Search size={14} className="text-[var(--color-ink-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by prompt or ID..."
              className="bg-transparent border-none text-xs text-[var(--color-ink)] focus:outline-none w-full font-mono"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-ink-faint)]">
                No execution records found.
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.job_id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-3 rounded border transition cursor-pointer ${
                    selectedJob?.job_id === job.job_id
                      ? "border-[var(--color-thought)] bg-[var(--color-surface-2)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface-1)] hover:border-[var(--color-line-subtle)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] text-[var(--color-ink-muted)]">{job.job_id}</span>
                    <StatusPill status={job.status} />
                  </div>
                  <p className="text-xs text-[var(--color-ink)] line-clamp-2 mb-2 font-sans font-medium">
                    {job.prompt}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[var(--color-ink-faint)]">
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{new Date(job.created_at * 1000).toLocaleTimeString()}</span>
                    </div>
                    <span>{job.steps_count} steps</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Job Inspection & Replay */}
        <div className="w-1/2 flex flex-col p-6 overflow-y-auto bg-[var(--color-void)]">
          {selectedJob ? (
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line)]">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--color-ink)]">{selectedJob.job_id}</h2>
                  <span className="text-[10px] text-[var(--color-ink-faint)]">
                    Created: {new Date(selectedJob.created_at * 1000).toLocaleString()}
                  </span>
                </div>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => handleRerun(selectedJob.job_id)}
                  disabled={rerunningId === selectedJob.job_id}
                >
                  <RotateCcw size={12} className={`mr-1.5 ${rerunningId === selectedJob.job_id ? "animate-spin" : ""}`} />
                  Re-run Task
                </Button>
              </div>

              <div>
                <span className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wider block mb-1">Original Prompt</span>
                <div className="p-3 rounded bg-[var(--color-surface-1)] border border-[var(--color-line)] text-xs text-[var(--color-ink)] font-sans">
                  {selectedJob.prompt}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wider block mb-1">Execution Status</span>
                <div className="flex items-center gap-3 p-3 rounded bg-[var(--color-surface-1)] border border-[var(--color-line)] text-xs">
                  <StatusPill status={selectedJob.status} />
                  <span>Steps executed: {selectedJob.steps_count}</span>
                </div>
              </div>

              {selectedJob.final_result && (
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider block mb-1">Final Result</span>
                  <div className="p-3 rounded bg-[var(--color-surface-1)] border border-emerald-500/30 text-xs text-[var(--color-ink)] whitespace-pre-wrap font-sans">
                    {selectedJob.final_result}
                  </div>
                </div>
              )}

              {selectedJob.error && (
                <div>
                  <span className="text-[10px] text-red-400 uppercase tracking-wider block mb-1">Execution Error</span>
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400 whitespace-pre-wrap">
                    {selectedJob.error}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-xs text-[var(--color-ink-faint)] text-center">
              <Eye size={28} className="mb-2 opacity-40" />
              <p>Select any execution task from the left to view details or re-run.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}