"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import {
  Folder,
  MessageSquare,
  Send,
  Trash2,
  Calendar,
  Download,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectMeta {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface ChatSession {
  id: string;
  job_id: string;
  project_id: string;
  title: string;
  prompt: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [promptInput, setPromptInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjectData = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/chats/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project || null);
        setChats(data.chats || []);
      }
    } catch (e) {
      console.error("Failed to load project details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const handleStartProjectChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = promptInput.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, project_id: projectId }),
      });

      if (!res.ok) throw new Error("Failed to dispatch project task");
      const data = await res.json();

      setPromptInput("");
      if (data.job_id) {
        router.push(`/chat/${data.job_id}`);
      } else {
        fetchProjectData();
      }
    } catch (err) {
      console.error("Error creating project chat session:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this session from this project?")) return;
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      setChats((prev) => prev.filter((c) => c.id !== chatId && c.job_id !== jobId));
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to delete this entire project workspace?")) return;
    try {
      await fetch(`/api/chats/projects/${projectId}`, { method: "DELETE" });
      router.push("/projects");
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Top Header */}
        <div className="h-16 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
              title="Back to all projects"
            >
              <ArrowLeft size={16} />
            </Link>
            <Folder className="h-5 w-5 text-cyan-400" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm text-slate-100">
                  {project?.name || "Project Workspace"}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {projectId}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDeleteProject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs transition"
            >
              <Trash2 size={13} />
              <span>Delete Workspace</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-6">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-2">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} />
              Project Objective & Context
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {project?.description || "All chats and generated deliverables within this workspace are strictly scoped and stored under this project."}
            </p>
            <div className="flex items-center gap-4 pt-2 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Calendar size={11} /> Created: {project?.created_at?.split(" ")[0] || "Recent"}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={11} /> Sessions: {chats.length}
              </span>
            </div>
          </div>

          {/* Sessions Section */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <MessageSquare size={13} className="text-emerald-400" />
                Project Chat Sessions ({chats.length})
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-xs animate-pulse">
                Loading project sessions...
              </div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                <FileCode size={32} className="text-slate-600" />
                <p className="text-xs">No chat sessions have been started inside this project yet.</p>
                <p className="text-[11px] text-slate-600">Type a task prompt below to launch an autonomous run.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className="flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition group shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-500 font-mono font-semibold">
                          {chat.job_id || chat.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                            chat.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : chat.status === "running"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {chat.status === "completed" && <CheckCircle2 size={10} />}
                          {chat.status === "running" && <Clock size={10} />}
                          {chat.status === "failed" && <AlertCircle size={10} />}
                          {chat.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-3 mb-3 leading-relaxed font-sans">
                        {chat.title || chat.prompt || "New Session"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 mt-auto text-xs">
                      <Link
                        href={`/chat/${chat.job_id || chat.id}`}
                        className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        <span>Open Session</span>
                        <ChevronRight size={12} />
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(`/api/run/jobs/${chat.job_id}/download-zip`, "_blank");
                          }}
                          title="Download ZIP"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
                        >
                          <Download size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteChat(e, chat.id, chat.job_id)}
                          title="Delete session"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project-Scoped Chat Composer */}
          <div className="pt-4 border-t border-slate-800 shrink-0">
            <form onSubmit={handleStartProjectChat} className="relative flex items-center">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder={`Assign a task under '${project?.name || "this project"}'...`}
                disabled={isSubmitting}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 shadow-inner"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !promptInput.trim()}
                className="absolute right-2 h-7 w-7 p-0 flex items-center justify-center cursor-pointer"
              >
                <Send size={12} />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}