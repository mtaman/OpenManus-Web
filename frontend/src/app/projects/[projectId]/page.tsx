"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  ExternalLink,
  Layers
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
  files?: { name: string; size: number }[];
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
        const rawChats: ChatSession[] = data.chats || [];
        const enriched = await Promise.all(
          rawChats.map(async (c) => {
            const effectiveId = c.job_id || c.id;
            try {
              const fRes = await fetch(`/api/run/jobs/${effectiveId}/files`);
              if (fRes.ok) {
                const fData = await fRes.json();
                return { ...c, files: fData.files || [] };
              }
            } catch {}
            return c;
          })
        );
        setChats(enriched);
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
        body: JSON.stringify({ prompt: text, project_id: projectId, max_steps: 30 }),
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

  const totalFilesCount = chats.reduce((acc, c) => acc + (c.files?.length || 0), 0);

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-background text-foreground overflow-hidden font-sans">
      <div className="h-14 flex items-center justify-between px-8 border-b border-border bg-card/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            title="Back to all projects"
          >
            <ArrowLeft size={16} />
          </Link>
          <Folder className="h-4 w-4 text-peldrun-accent" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-semibold text-sm text-foreground">
                {project?.name || "Project Workspace"}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30">
                {projectId}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteProject}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md border-peldrun-error/30 text-peldrun-error hover:bg-peldrun-error/10 text-xs transition cursor-pointer shadow-peldrun-xs"
          >
            <Trash2 size={13} />
            <span>Delete Workspace</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-background">
        <div className="p-5 rounded-2xl border border-border bg-card space-y-3 shadow-peldrun-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-peldrun-success uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} />
              Project Objective & Context
            </span>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-background border border-border text-foreground flex items-center gap-1.5 shadow-peldrun-xs">
                <MessageSquare size={12} className="text-peldrun-success" />
                <span>{chats.length} Sessions</span>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-background border border-border text-foreground flex items-center gap-1.5 shadow-peldrun-xs">
                <Layers size={12} className="text-peldrun-accent" />
                <span>{totalFilesCount} Deliverables</span>
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl font-sans">
            {project?.description || "All chats, files, and deliverables generated in this workspace are strictly scoped and stored under this project."}
          </p>
          <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Calendar size={11} /> Created: {project?.created_at || "Recent"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MessageSquare size={13} className="text-peldrun-success" />
              <span>Project Sessions ({chats.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-xs animate-pulse font-mono">
              Loading project workspace sessions...
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-center text-muted-foreground space-y-2 border border-dashed border-border rounded-2xl bg-card/40">
              <FileCode size={34} className="text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">No chat sessions recorded inside this project yet.</p>
              <p className="text-[11px] text-muted-foreground">Use the input composer below to dispatch your first task under this workspace.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chats.map((chat) => {
                const targetJob = chat.job_id || chat.id;
                const hasDeliverables = chat.files && chat.files.length > 0;
                return (
                  <div
                    key={chat.id}
                    className="flex flex-col justify-between p-4 rounded-sm border border-border bg-card hover:border-primary/40 transition-all group shadow-peldrun-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-muted-foreground font-mono font-semibold">
                          {targetJob}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium flex items-center gap-1 ${
                            chat.status === "completed"
                              ? "bg-peldrun-success/15 text-peldrun-success border border-peldrun-success/30"
                              : chat.status === "running"
                              ? "bg-peldrun-warning/15 text-peldrun-warning border border-peldrun-warning/30 animate-pulse"
                              : "bg-peldrun-error/15 text-peldrun-error border border-peldrun-error/30"
                          }`}
                        >
                          {chat.status === "completed" && <CheckCircle2 size={10} />}
                          {chat.status === "running" && <Clock size={10} />}
                          {chat.status === "failed" && <AlertCircle size={10} />}
                          <span>{chat.status}</span>
                        </span>
                      </div>

                      <h3 className="text-xs font-semibold text-foreground line-clamp-2 mb-2 leading-relaxed font-sans group-hover:text-primary transition">
                        {chat.title || chat.prompt || "New Session"}
                      </h3>

                      {hasDeliverables && (
                        <div className="mb-3 space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                            Generated Deliverables:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {chat.files!.map((f) => (
                              <span
                                key={f.name}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-background text-primary border border-border flex items-center gap-1 shadow-peldrun-xs"
                              >
                                <FileCode size={10} />
                                <span>{f.name}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-auto text-xs">
                      <Link
                        href={`/chat/${targetJob}`}
                        className="text-primary hover:underline font-medium flex items-center gap-1"
                      >
                        <span>Open Session</span>
                        <ExternalLink size={11} />
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/api/run/jobs/${targetJob}/download-zip`}
                          title="Download ZIP"
                          className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border text-[11px] transition shadow-peldrun-xs"
                        >
                          <Download size={12} />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteChat(e, chat.id, chat.job_id)}
                          title="Delete session"
                          className="p-1.5 rounded-md bg-white-foreground hover:bg-peldrun-error/20 text-muted-foreground hover:text-peldrun-error border border-border transition cursor-pointer"
                        >
                          <Trash2 size={12} />
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

      <div className="p-4 border-t border-border bg-card/60 backdrop-blur-sm shrink-0">
        <form onSubmit={handleStartProjectChat} className="flex items-center gap-2 p-1.5 pl-3.5 rounded-sm border border-border bg-background shadow-peldrun-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary/50 transition-all">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder={`Assign a new autonomous task to ${project?.name || "this project"}...`}
            disabled={isSubmitting}
            className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground disabled:opacity-50 font-sans"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !promptInput.trim()}
            className="h-7 w-7 p-0 rounded-md shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-peldrun-xs"
          >
            <Send size={12} />
          </Button>
        </form>
      </div>
    </div>
  );
}