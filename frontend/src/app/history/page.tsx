"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { History, Trash2, Download, ExternalLink, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";

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
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-mono">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-400" />
            <h1 className="font-bold text-base text-slate-100">Session History & Archives</h1>
          </div>
          <span className="text-xs text-slate-400">Total Sessions: {jobs.length}</span>
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-slate-950">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs animate-pulse">
              Loading session history...
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500 space-y-2">
              <History size={32} className="text-slate-600" />
              <p className="text-sm">No recorded chat sessions found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => {
                if (!job || !job.id) return null;
                return (
                  <div
                    key={job.id}
                    className="flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition group shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                          <Calendar size={11} /> {job.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                            job.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : job.status === "running"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {job.status === "completed" && <CheckCircle2 size={10} />}
                          {job.status === "running" && <Clock size={10} />}
                          {job.status === "failed" && <AlertCircle size={10} />}
                          {job.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 line-clamp-3 mb-4 leading-relaxed font-sans">
                        {job.prompt || "No prompt recorded"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 mt-auto">
                      <Link
                        href={`/chat/${job.id}`}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
                      >
                        <ExternalLink size={13} />
                        <span>Open Session</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/api/run/jobs/${job.id}/download-zip`}
                          title="Download ZIP"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
                        >
                          <Download size={13} />
                        </a>
                        <button
                          onClick={(e) => handleDelete(e, job.id)}
                          title="Delete session"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 transition"
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
    </div>
  );
}