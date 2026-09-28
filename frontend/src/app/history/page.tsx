"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  Trash2,
  Download,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";

interface JobItem {
  id: string;
  prompt: string;
  status: string;
  created_at?: string;
  pinned?: boolean;
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/run/jobs", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (e) {
      console.error("Failed to load history sessions", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      await fetch(`/api/run/jobs/${jobId}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      console.error("Failed to delete job", err);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Header Bar */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-card/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <History className="h-4 w-4 text-manus-accent" />
          <h1 className="font-heading font-semibold text-sm text-foreground">
            Session History & Archives
          </h1>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          Total Sessions: {jobs.length}
        </span>
      </div>

      {/* Sessions Content */}
      <div className="flex-1 p-6 overflow-y-auto bg-background">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-xs animate-pulse">
            Loading session history...
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-card border border-border shadow-manus-sm flex items-center justify-center text-muted-foreground">
              <History size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No recorded sessions found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a new task from the chat dashboard to create a session.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => {
              if (!job || !job.id) return null;
              return (
                <div
                  key={job.id}
                  className="flex flex-col justify-between p-4 rounded-sm border border-border bg-card hover:border-primary/40 transition-all group shadow-manus-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-1">
                        <Calendar size={11} /> {job.id}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium flex items-center gap-1 ${
                          job.status === "completed"
                            ? "bg-manus-success/15 text-manus-success border border-manus-success/30"
                            : job.status === "running"
                            ? "bg-manus-warning/15 text-manus-warning border border-manus-warning/30 animate-pulse"
                            : "bg-manus-error/15 text-manus-error border border-manus-error/30"
                        }`}
                      >
                        {job.status === "completed" && <CheckCircle2 size={10} />}
                        {job.status === "running" && <Clock size={10} />}
                        {job.status === "failed" && <AlertCircle size={10} />}
                        <span>{job.status}</span>
                      </span>
                    </div>

                    <p className="text-xs text-foreground line-clamp-3 mb-4 leading-relaxed font-sans">
                      {job.prompt || "No prompt recorded"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-auto">
                    <Link
                      href={`/chat/${job.id}`}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium transition-all"
                    >
                      <ExternalLink size={13} />
                      <span>Open Session</span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/api/run/jobs/${job.id}/download-zip`}
                        title="Download ZIP"
                        className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border text-[11px] transition shadow-manus-xs"
                      >
                        <Download size={13} />
                      </a>
                      <button
                        onClick={(e) => handleDelete(e, job.id)}
                        title="Delete session"
                        className="p-1.5 rounded-md bg-muted hover:bg-manus-error/20 text-muted-foreground hover:text-manus-error border border-border transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
