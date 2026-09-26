"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare,
  FolderKanban,
  History,
  FolderOpen,
  Settings,
  Activity,
  Plus,
  Trash2,
  ChevronRight
} from "lucide-react";
import { fetchProjects, fetchChats, deleteAllChats, Project, ChatSession } from "@/lib/chatsApi";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [pathname]);

  const loadData = async () => {
    const projs = await fetchProjects();
    setProjects(projs);
    const allChats = await fetchChats();
    setChats(allChats);
  };

  const handleDeleteAllChats = async () => {
    if (!confirm("Are you sure you want to delete all chats? This action cannot be undone.")) return;
    setIsDeleting(true);
    const success = await deleteAllChats();
    if (success) {
      setChats([]);
      router.replace("/chat");
    }
    setIsDeleting(false);
  };

  return (
    <aside className="w-64 bg-[var(--color-surface-1)] border-r border-[var(--color-line)] flex flex-col h-full font-mono text-xs select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider text-[var(--color-ink)]">OpenManus Web</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-1)] text-cyan-400 border border-[var(--color-line)]">
          v2.0
        </span>
      </div>

      {/* New Session Action */}
      <div className="p-3 border-b border-[var(--color-line)]">
        <Link
          href="/chat"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition cursor-pointer font-semibold"
        >
          <Plus size={14} />
          <span>New Autonomous Session</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="px-3 py-2 space-y-1 border-b border-[var(--color-line)] text-[var(--color-ink-muted)]">
        <Link
          href="/chat"
          className={`flex items-center gap-2.5 px-3 py-2 rounded transition ${pathname === "/chat" ? "bg-[var(--color-surface-2)] text-cyan-400 font-semibold" : "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"}`}
        >
          <MessageSquare size={14} />
          <span>Active Workspace</span>
        </Link>
        <Link
          href="/history"
          className={`flex items-center gap-2.5 px-3 py-2 rounded transition ${pathname === "/history" ? "bg-[var(--color-surface-2)] text-cyan-400 font-semibold" : "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"}`}
        >
          <History size={14} />
          <span>Execution Archive</span>
        </Link>
        <Link
          href="/files"
          className={`flex items-center gap-2.5 px-3 py-2 rounded transition ${pathname === "/files" ? "bg-[var(--color-surface-2)] text-cyan-400 font-semibold" : "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"}`}
        >
          <FolderOpen size={14} />
          <span>Project Artifacts</span>
        </Link>
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 px-3 py-2 rounded transition ${pathname === "/settings" ? "bg-[var(--color-surface-2)] text-cyan-400 font-semibold" : "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"}`}
        >
          <Settings size={14} />
          <span>Engine Settings</span>
        </Link>
      </div>

      {/* Chats & Projects List Archive */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)] px-1">
          <span>Recent Chats</span>
          {chats.length > 0 && (
            <button
              onClick={handleDeleteAllChats}
              disabled={isDeleting}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition"
              title="Delete All Chats"
            >
              <Trash2 size={11} />
              <span>Clear All</span>
            </button>
          )}
        </div>

        <div className="space-y-1">
          {chats.length === 0 ? (
            <div className="text-[11px] text-[var(--color-ink-faint)] px-2 py-3 text-center italic">
              No chat sessions recorded.
            </div>
          ) : (
            chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.job_id}`}
                className={`group flex flex-col px-3 py-2 rounded transition border border-transparent ${pathname.includes(chat.job_id) ? "bg-[var(--color-surface-2)] border-cyan-500/30 text-cyan-300" : "hover:bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-sans text-xs">{chat.title || chat.prompt}</span>
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
                </div>
                <span className="text-[9px] text-[var(--color-ink-faint)] mt-0.5">
                  {chat.updated_at}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Footer Status */}
      <div className="p-3 border-t border-[var(--color-line)] bg-[var(--color-surface-2)] flex items-center justify-between text-[10px] text-[var(--color-ink-muted)]">
        <span className="flex items-center gap-1.5">
          <Activity size={12} className="text-emerald-400" />
          <span>Connected</span>
        </span>
        <span className="text-[var(--color-ink-faint)]">Mansoura Team</span>
      </div>
    </aside>
  );
}