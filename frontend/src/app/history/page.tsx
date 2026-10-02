"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  History,
  HardDrive,
  Trash2,
  Download,
  ExternalLink,
  Calendar,
  Pin,
  Archive,
  RefreshCw,
  Search,
  X,
  FolderOpen,
  ChevronDown
} from "lucide-react";
import {
  fetchChats,
  fetchStorageStats,
  sweepStorageOrphans,
  togglePinChat,
  toggleArchiveChat,
  deleteChat,
  formatChatDateTime,
  categorizeChatTimeBucket,
  ChatSession,
  StorageStats,
  SweepReport
} from "@/lib/chatsApi";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "pinned" | "archived">("all");
  const [notification, setNotification] = useState<string | null>(null);
  const [olderLimit, setOlderLimit] = useState(15);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [allChats, storageStats] = await Promise.all([
        fetchChats({ includeArchived: true }),
        fetchStorageStats()
      ]);
      setChats(allChats || []);
      setStats(storageStats || null);
    } catch (err: any) {
      console.error("Failed to load history data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSweepStorage = async () => {
    setSweeping(true);
    try {
      const report: SweepReport | null = await sweepStorageOrphans();
      if (report && report.status === "ok") {
        notify(`Cleaned ${report.removed_orphans_count} orphans and freed ${report.freed_mb} MB.`);
        loadData();
      } else {
        notify("No orphan folders found on disk.");
      }
    } catch (err: any) {
      notify("Sweep error: " + (err.message || "Failed"));
    } finally {
      setSweeping(false);
    }
  };

  const handleTogglePin = async (chatId: string) => {
    try {
      const updated = await togglePinChat(chatId);
      if (updated) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId ? { ...c, is_pinned: updated.is_pinned, pinned: updated.is_pinned } : c
          )
        );
        notify(updated.is_pinned ? "Session pinned to top." : "Session unpinned.");
        window.dispatchEvent(new CustomEvent("omweb:chats-updated"));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleToggleArchive = async (chatId: string) => {
    try {
      const updated = await toggleArchiveChat(chatId);
      if (updated) {
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, is_archived: updated.is_archived } : c))
        );
        notify(updated.is_archived ? "Archived and hidden from sidebar." : "Restored to active sidebar.");
        window.dispatchEvent(new CustomEvent("omweb:chats-updated"));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDelete = async (chatId: string) => {
    if (!confirm("Are you sure? This session, logs, workspace files, and jobs.json entry will be permanently deleted.")) {
      return;
    }
    try {
      const ok = await deleteChat(chatId);
      if (ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        notify(`Session ${chatId} completely purged.`);
        window.dispatchEvent(new CustomEvent("omweb:chats-updated"));
        fetchStorageStats().then(setStats);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (c.title || "").toLowerCase().includes(q) ||
        (c.prompt || "").toLowerCase().includes(q) ||
        (c.id || "").toLowerCase().includes(q);

      if (!matchesQuery) return false;
      if (activeTab === "active") return !c.is_archived;
      if (activeTab === "pinned") return !!(c.is_pinned || c.pinned);
      if (activeTab === "archived") return !!c.is_archived;
      return true;
    });
  }, [chats, searchQuery, activeTab]);

  const todayChats = useMemo(() => {
    return filteredChats.filter((c) => categorizeChatTimeBucket(c.created_at) === "today");
  }, [filteredChats]);

  const thisWeekChats = useMemo(() => {
    return filteredChats.filter((c) => categorizeChatTimeBucket(c.created_at) === "this_week");
  }, [filteredChats]);

  const olderChats = useMemo(() => {
    return filteredChats.filter((c) => categorizeChatTimeBucket(c.created_at) === "older");
  }, [filteredChats]);

  const visibleOlderChats = useMemo(() => {
    return olderChats.slice(0, olderLimit);
  }, [olderChats, olderLimit]);

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Top Notification Banner */}
      {notification && (
        <div className="bg-primary/10 border-b border-primary/30 px-4 py-2 text-xs text-primary font-medium flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground tracking-tight">
                  Session Archives & Disk Governance
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-muted text-muted-foreground border border-border">
                  Sovereign Core
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Linear session list, chronological grouping, and deep storage management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSweepStorage}
              disabled={sweeping}
              className="text-xs border-border bg-muted/50 hover:bg-muted text-foreground transition shadow-xs h-8 cursor-pointer"
              title="Sweep orphaned workspace files not linked to existing sessions"
            >
              <HardDrive size={13} className={`mr-1.5 text-primary ${sweeping ? "animate-spin" : ""}`} />
              <span>Sweep Orphan Storage</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs border-border bg-muted/50 hover:bg-muted text-foreground transition shadow-xs h-8 cursor-pointer"
            >
              <RefreshCw size={13} className={`mr-1.5 ${loading ? "animate-spin text-primary" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Metrics Bar */}
      {stats && (
        <div className="border-b border-border bg-muted/15 py-3 shrink-0">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-lg border border-border/80 bg-card shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Sessions</span>
                <p className="text-sm font-bold font-mono text-foreground">{stats.total_chats}</p>
              </div>
              <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                <FolderOpen size={14} />
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-border/80 bg-card shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Pinned Active</span>
                <p className="text-sm font-bold font-mono text-primary">{stats.pinned_chats}</p>
              </div>
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Pin size={14} className="rotate-45" />
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-border/80 bg-card shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Archived</span>
                <p className="text-sm font-bold font-mono text-muted-foreground">{stats.archived_chats}</p>
              </div>
              <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                <Archive size={14} />
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-border/80 bg-card shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Disk Consumption</span>
                <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.disk_size_mb} MB</p>
              </div>
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <HardDrive size={14} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Search Filter Navigation */}
      <div className="w-full border-b border-border bg-muted/20">
        <div className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto pt-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "all"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>All Sessions</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                {chats.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "active"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Active</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                {chats.filter((c) => !c.is_archived).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pinned")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "pinned"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Pin size={12} className="rotate-45" />
              <span>Pinned</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                {chats.filter((c) => c.is_pinned || c.pinned).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("archived")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "archived"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Archive size={12} />
              <span>Archived</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                {chats.filter((c) => c.is_archived).length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 pb-2 sm:pb-0">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search session title..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Linear List Grouped Chronologically */}
      <main className="w-full flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-xs animate-pulse">
              Loading session catalog from disk...
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <History className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No sessions found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                {searchQuery ? "No matches for your search term." : "Sessions will appear here once tasks are started."}
              </p>
            </div>
          ) : (
            <>
              {/* GROUP 1: Today (اليوم) */}
              {todayChats.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Today (اليوم)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {todayChats.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {todayChats.map((chat) => (
                      <HistoryListRow
                        key={chat.id}
                        chat={chat}
                        onTogglePin={handleTogglePin}
                        onToggleArchive={handleToggleArchive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* GROUP 2: This Week (هذا الأسبوع) */}
              {thisWeekChats.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      This Week (هذا الأسبوع)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-muted text-muted-foreground border border-border">
                      {thisWeekChats.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {thisWeekChats.map((chat) => (
                      <HistoryListRow
                        key={chat.id}
                        chat={chat}
                        onTogglePin={handleTogglePin}
                        onToggleArchive={handleToggleArchive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* GROUP 3: Older than a week (أقدم من أسبوع) */}
              {olderChats.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Older than a week (أقدم من أسبوع)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-muted text-muted-foreground border border-border">
                        {visibleOlderChats.length}/{olderChats.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {visibleOlderChats.map((chat) => (
                      <HistoryListRow
                        key={chat.id}
                        chat={chat}
                        onTogglePin={handleTogglePin}
                        onToggleArchive={handleToggleArchive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>

                  {visibleOlderChats.length < olderChats.length && (
                    <div className="pt-3 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOlderLimit((prev) => prev + 15)}
                        className="text-xs border-border bg-card hover:bg-muted text-foreground transition shadow-xs cursor-pointer gap-1.5"
                      >
                        <ChevronDown size={13} />
                        <span>Load More Older Sessions ({olderChats.length - visibleOlderChats.length} remaining)</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

interface HistoryListRowProps {
  chat: ChatSession;
  onTogglePin: (chatId: string) => void;
  onToggleArchive: (chatId: string) => void;
  onDelete: (chatId: string) => void;
}

function HistoryListRow({ chat, onTogglePin, onToggleArchive, onDelete }: HistoryListRowProps) {
  const isPinned = chat.is_pinned || chat.pinned;
  const isArchived = chat.is_archived;
  const effectiveTarget = chat.job_id || chat.id;

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-all text-xs ${
        isPinned
          ? "border-primary/40 bg-primary/5 shadow-xs"
          : isArchived
          ? "border-border/60 bg-muted/20 opacity-80"
          : "border-border bg-card hover:border-primary/30 shadow-xs"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
        <span
          className={`shrink-0 w-2.5 h-2.5 rounded-full ${
            chat.status === "completed"
              ? "bg-emerald-500"
              : chat.status === "running"
              ? "bg-amber-500 animate-pulse"
              : "bg-muted-foreground/40"
          }`}
          title={`Status: ${chat.status || "active"}`}
        />

        <span className="font-semibold text-foreground truncate select-all">
          {chat.title || chat.prompt || "Untitled Session"}
        </span>

        {isPinned && (
          <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
            <Pin size={8} className="rotate-45" /> PINNED
          </span>
        )}

        {isArchived && (
          <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-muted text-muted-foreground border border-border flex items-center gap-0.5">
            <Archive size={8} /> ARCHIVED
          </span>
        )}

        <span className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-muted-foreground shrink-0 ml-auto mr-2">
          <Calendar size={11} className="opacity-70" />
          <span>{formatChatDateTime(chat.created_at)}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href={`/chat/${effectiveTarget}`}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-medium text-[11px] transition"
        >
          <ExternalLink size={11} />
          <span>Open</span>
        </Link>

        <button
          type="button"
          onClick={() => onTogglePin(chat.id)}
          className={`p-1.5 rounded-md border text-[11px] transition cursor-pointer ${
            isPinned
              ? "bg-primary/15 border-primary/40 text-primary font-bold"
              : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title={isPinned ? "Unpin session" : "Pin session to top"}
        >
          <Pin size={12} className={isPinned ? "rotate-45" : ""} />
        </button>

        <button
          type="button"
          onClick={() => onToggleArchive(chat.id)}
          className={`p-1.5 rounded-md border text-[11px] transition cursor-pointer ${
            isArchived
              ? "bg-muted border-border text-foreground font-semibold"
              : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title={isArchived ? "Restore to sidebar" : "Archive session"}
        >
          <Archive size={12} />
        </button>

        <a
          href={`/api/chats/${chat.id}/log/download`}
          title="Download chat log"
          className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-foreground border border-border text-[11px] transition"
        >
          <Download size={12} />
        </a>

        <button
          type="button"
          onClick={() => onDelete(chat.id)}
          title="Permanently purge session from disk and jobs.json"
          className="p-1.5 rounded-md bg-muted/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border transition cursor-pointer"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}