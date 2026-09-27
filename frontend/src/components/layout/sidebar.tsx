"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Folder,
  Plus,
  Pin,
  Download,
  Trash2,
  FolderOpen
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

interface ChatItem {
  id: string;
  job_id: string;
  project_id?: string;
  title: string;
  prompt: string;
  status: string;
  created_at?: string;
  pinned?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/chats/projects"),
        fetch("/api/chats")
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProjects(pData.projects || []);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setChats(cData.chats || []);
      }
    } catch (e) {
      console.error("Failed to load sidebar data", e);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch("/api/chats/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() })
      });
      if (res.ok) {
        setNewProjectName("");
        setIsCreatingProject(false);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to create project", err);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      setChats((prev) => prev.filter((c) => c.id !== chatId && c.job_id !== jobId));
      if (pathname.includes(jobId) || pathname.includes(chatId)) {
        router.push("/chat");
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const handleTogglePin = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const standaloneChats = chats.filter(
    (c) => !c.project_id || c.project_id === "default_project"
  );

  const sortedChats = [...standaloneChats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <aside className="w-[260px] border-r border-border bg-card/60 backdrop-blur-md flex flex-col h-screen select-none shrink-0 font-sans transition-all duration-200">
      {/* Workspace Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        <span className="font-heading font-semibold text-xs tracking-wider text-muted-foreground uppercase">
          Workspaces & Chats
        </span>
        <button
          type="button"
          onClick={() => setIsCreatingProject((v) => !v)}
          className="p-1 hover:text-foreground text-muted-foreground rounded-sm hover:bg-muted transition cursor-pointer"
          title="Create New Workspace"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Scrollable Workspaces & Sessions */}
      <div className="flex-1 p-3 overflow-y-auto space-y-4">
        {/* Workspaces Section */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-2 uppercase tracking-wider mb-1.5">
            <span>Workspaces</span>
          </div>

          {isCreatingProject && (
            <form onSubmit={handleCreateProject} className="mb-2 px-1">
              <input
                type="text"
                autoFocus
                placeholder="Workspace name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-background text-xs border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
              />
            </form>
          )}

          <div className="space-y-0.5">
            {projects.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/70 px-2 py-1">
                No workspaces yet.
              </div>
            ) : (
              projects.map((proj) => {
                const isActiveProj = pathname === `/projects/${proj.id}`;
                const projChatsCount = chats.filter((c) => c.project_id === proj.id).length;
                return (
                  <Link
                    key={proj.id}
                    href={`/projects/${proj.id}`}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all ${
                      isActiveProj
                        ? "bg-muted text-foreground font-medium border border-border/80 shadow-manus-xs"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder size={13} className="text-manus-info shrink-0" />
                      <span className="truncate">{proj.name}</span>
                    </div>
                    {projChatsCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-background border border-border text-muted-foreground font-mono">
                        {projChatsCount}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Chats Section */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-2 uppercase tracking-wider mb-1.5">
            <span>Recent Chats</span>
          </div>

          <div className="space-y-0.5">
            {sortedChats.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/70 px-2 py-2">
                No recent sessions.
              </div>
            ) : (
              sortedChats.map((chat, idx) => {
                const effectiveTarget = chat.job_id || chat.id || `session-${idx}`;
                const isActive =
                  pathname === `/chat/${effectiveTarget}` || pathname === `/chat/${chat.id}`;
                return (
                  <div
                    key={chat.id || chat.job_id || `chat-row-${idx}`}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all ${
                      isActive
                        ? "bg-muted text-foreground font-medium border border-border shadow-manus-xs"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <Link
                      href={`/chat/${effectiveTarget}`}
                      className="flex items-center gap-2 truncate flex-1 mr-1"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          chat.status === "completed"
                            ? "bg-manus-success"
                            : chat.status === "running"
                            ? "bg-manus-warning animate-pulse"
                            : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="truncate">
                        {chat.title || chat.prompt || "New Session"}
                      </span>
                    </Link>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(e, chat.id)}
                        title="Pin chat"
                        className={`p-1 hover:text-foreground cursor-pointer rounded-sm ${
                          chat.pinned ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <Pin size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(
                            `/api/run/jobs/${effectiveTarget}/download-zip`,
                            "_blank"
                          );
                        }}
                        title="Download ZIP"
                        className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-sm"
                      >
                        <Download size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteChat(e, chat.id, chat.job_id)}
                        title="Delete chat"
                        className="p-1 text-muted-foreground hover:text-manus-error cursor-pointer rounded-sm"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-manus-success animate-pulse" />
          <span>Manus Core</span>
        </span>
        <span className="text-[10px] text-muted-foreground/60">v2.0.0</span>
      </div>
    </aside>
  );
}

export default Sidebar;
