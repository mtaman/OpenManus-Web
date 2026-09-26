import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { MessageSquare, Plus, Trash2, Folder, History, Settings, Cpu, Terminal } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { sessions, loadSessions, clearAllSessions, loadSessionDetail } = useChatStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <aside className="w-64 border-r border-border bg-card/50 flex flex-col h-screen select-none">
      {/* Top Header / New Session */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
            OM
          </div>
          <span className="font-semibold text-sm tracking-wide">OpenManus</span>
        </div>
      </div>

      <div className="p-3">
        <Link
          href="/"
          className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Session</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="px-3 py-2 space-y-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Navigation
      </div>
      <nav className="px-3 space-y-1">
        <Link
          href="/"
          className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname === "/" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/projects"
          className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname?.startsWith("/projects") ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Projects</span>
        </Link>
        <Link
          href="/history"
          className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname === "/history" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-4 h-4" />
          <span>History Archive</span>
        </Link>
        <Link
          href="/settings"
          className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname === "/settings" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Active Chats & Sessions Archive */}
      <div className="px-3 pt-6 pb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Active Chats</span>
        {sessions.length > 0 && (
          <button
            onClick={() => clearAllSessions()}
            title="Clear All Chats"
            className="text-destructive hover:text-destructive/80 transition-colors flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
        {sessions.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No active chat sessions found.
          </div>
        ) : (
          sessions.map((chat) => {
            const isActive = pathname === `/chat/${chat.job_id}`;
            return (
              <Link
                key={chat.id}
                href={`/chat/${chat.job_id}`}
                onClick={() => loadSessionDetail(chat.id)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors group ${
                  isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                <span className="truncate flex-1 text-left">{chat.title || chat.prompt || chat.job_id}</span>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
        <span className="flex items-center space-x-1">
          <Cpu className="w-3.5 h-3.5 text-emerald-500" />
          <span>Engine Active</span>
        </span>
        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-mono">v1.1</span>
      </div>
    </aside>
  );
}
