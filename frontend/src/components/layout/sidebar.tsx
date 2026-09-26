"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, History, FolderOpen, Settings, Bot, Trash2, Pin, Download } from "lucide-react";

interface JobItem {
  id: string;
  prompt: string;
  status: string;
  created_at?: string;
  pinned?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobItem[]>([]);

  const fetchJobsList = async () => {
    try {
      const res = await fetch("/api/run/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (e) {
      console.error("Failed to fetch jobs list", e);
    }
  };

  useEffect(() => {
    fetchJobsList();
    const interval = setInterval(fetchJobsList, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteJob = async (e: React.MouseEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      await fetch(`/api/run/jobs/${jobId}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      if (pathname && pathname.includes(jobId)) {
        router.push("/chat");
      }
    } catch (err) {
      console.error("Failed to delete job", err);
    }
  };

  const handleTogglePin = (e: React.MouseEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, pinned: !j.pinned } : j))
    );
  };

  const navItems = [
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/files", label: "Files", icon: FolderOpen },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <aside className="w-64 border-e border-slate-800 bg-slate-900 flex flex-col h-screen select-none shrink-0">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="p-2 rounded-lg bg-emerald-600 text-white">
          <Bot className="h-5 w-5" />
        </div>
        <span className="font-bold text-base tracking-tight text-slate-100">
          OpenManus
        </span>
      </div>

      <nav className="p-4 space-y-1 border-b border-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* History Sessions List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-2 uppercase tracking-wider">
          <span>Recent History</span>
          <History size={13} />
        </div>

        <div className="space-y-1 mt-2">
          {sortedJobs.length === 0 ? (
            <div className="text-xs text-slate-500 px-2 py-4 text-center">No past sessions found.</div>
          ) : (
            sortedJobs.map((job) => {
              if (!job || !job.id) return null;
              const active = pathname === `/chat/${job.id}`;
              return (
                <Link
                  key={job.id}
                  href={`/chat/${job.id}`}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${
                    active
                      ? "bg-slate-800 text-emerald-400 font-semibold border border-emerald-500/30"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 mr-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${job.status === "completed" ? "bg-emerald-500" : job.status === "running" ? "bg-amber-500 animate-pulse" : "bg-slate-600"}`} />
                    <span className="truncate">{job.prompt || job.id}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleTogglePin(e, job.id)}
                      title="Pin session"
                      className={`p-1 hover:text-emerald-400 ${job.pinned ? "text-emerald-400 opacity-100" : "text-slate-400"}`}
                    >
                      <Pin size={11} />
                    </button>
                    <a
                      href={`/api/run/jobs/${job.id}/download-zip`}
                      title="Download ZIP"
                      className="p-1 text-slate-400 hover:text-cyan-400"
                    >
                      <Download size={11} />
                    </a>
                    <button
                      onClick={(e) => handleDeleteJob(e, job.id)}
                      title="Delete session"
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center font-mono">
        v2.0.0-PROD
      </div>
    </aside>
  );
}