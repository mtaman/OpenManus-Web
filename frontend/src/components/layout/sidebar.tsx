"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  FolderOpen,
  Settings,
  Bot,
  Trash2,
  Pin,
  Download,
  Folder,
  Plus,
  ChevronRight
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
    const timer = setInterval(fetchData, 6000);
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
    <aside className="w-64 border-e border-slate-800 bg-slate-900 flex flex-col h-screen select-none shrink-0 font-sans">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
        <Link href="/chat" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <span className="font-bold text-base tracking-tight text-slate-100">
            OpenManus
          </span>
        </Link>
      </div>

      {/* Main Nav Items */}
      <nav className="p-4 space-y-1 border-b border-slate-800">
        <Link
          href="/chat"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
            pathname === "/chat" || pathname.startsWith("/chat/")
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span>Chat</span>
        </Link>
        <Link
          href="/projects"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
            pathname.startsWith("/projects")
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <Folder className="h-4 w-4 shrink-0" />
          <span>Projects</span>
        </Link>
        <Link
          href="/files"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
            pathname === "/files"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span>Files</span>
        </Link>
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
            pathname === "/settings"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Scrollable Explorer: Projects & Standalone Sessions */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Projects Workspace Header */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-2 uppercase tracking-wider mb-2">
            <span>Workspaces</span>
            <button
              onClick={() => setIsCreatingProject((v) => !v)}
              className="p-1 hover:text-emerald-400 rounded hover:bg-slate-800 transition"
              title="Create Project"
            >
              <Plus size={14} />
            </button>
          </div>

          {isCreatingProject && (
            <form onSubmit={handleCreateProject} className="mb-2 px-1">
              <input
                type="text"
                autoFocus
                placeholder="Project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-slate-800 text-xs border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </form>
          )}

          <div className="space-y-1">
            {projects.length === 0 ? (
              <div className="text-[11px] text-slate-500 px-2 py-1">No projects yet.</div>
            ) : (
              projects.map((proj) => {
                const isActiveProj = pathname === `/projects/${proj.id}`;
                return (
                  <Link
                    key={proj.id}
                    href={`/projects/${proj.id}`}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                      isActiveProj
                        ? "bg-slate-800 text-emerald-400 font-medium"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder size={13} className="text-cyan-400 shrink-0" />
                      <span className="truncate">{proj.name}</span>
                    </div>
                    <ChevronRight size={12} className="text-slate-500" />
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Standalone History */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-2 uppercase tracking-wider mb-2">
            <span>Recent Chats</span>
          </div>

          <div className="space-y-1">
            {sortedChats.length === 0 ? (
              <div className="text-[11px] text-slate-500 px-2 py-2">No recent sessions.</div>
            ) : (
              sortedChats.map((chat, idx) => {
                const effectiveTarget = chat.job_id || chat.id || `session-${idx}`;
                const isActive = pathname === `/chat/${effectiveTarget}` || pathname === `/chat/${chat.id}`;
                return (
                  <Link
                    key={chat.id || chat.job_id || `chat-item-${idx}`}
                    href={`/chat/${effectiveTarget}`}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                      isActive
                        ? "bg-slate-800 text-emerald-400 font-medium border border-emerald-500/20"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 mr-1">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          chat.status === "completed"
                            ? "bg-emerald-500"
                            : chat.status === "running"
                            ? "bg-amber-500 animate-pulse"
                            : "bg-slate-600"
                        }`}
                      />
                      <span className="truncate">{chat.title || chat.prompt || "New Session"}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleTogglePin(e, chat.id)}
                        title="Pin chat"
                        className={`p-1 hover:text-emerald-400 ${chat.pinned ? "text-emerald-400" : "text-slate-500"}`}
                      >
                        <Pin size={11} />
                      </button>
                      <a
                        href={`/api/run/jobs/${effectiveTarget}/download-zip`}
                        title="Download ZIP"
                        className="p-1 text-slate-500 hover:text-cyan-400"
                      >
                        <Download size={11} />
                      </a>
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id, chat.job_id)}
                        title="Delete chat"
                        className="p-1 text-slate-500 hover:text-rose-400"
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
      </div>

      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 text-center font-mono">
        v2.0.0-STORAGE-STABLE
      </div>
    </aside>
  );
}

export default Sidebar;
