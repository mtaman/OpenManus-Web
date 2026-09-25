"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, FolderGit2, History, Settings, Activity } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

const navItems = [
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/files", icon: FolderGit2, label: "Files" },
  { href: "/history", icon: History, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/setup", icon: Activity, label: "Diagnostics" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {/* 72px Navigation Rail */}
      <aside className="w-[72px] flex-shrink-0 flex flex-col items-center py-4 bg-[var(--color-surface-1)] border-r border-[var(--color-line)] z-20">
        <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent-500)] flex items-center justify-center font-bold text-white mb-6 shadow-[0_0_15px_var(--color-accent-glow)]">
          OM
        </div>
        <nav className="flex-1 flex flex-col gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`w-11 h-11 flex items-center justify-center rounded-[var(--radius-md)] transition-all ${
                  active
                    ? "bg-[var(--color-accent-bg)] text-[var(--color-accent-400)] border border-[var(--color-accent-500)]/40"
                    : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                }`}
              >
                <Icon size={20} />
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area with Glass Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 px-6 flex items-center justify-between glass-1 border-b border-[var(--color-line)] z-10">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-wide text-sm">OpenManus Dashboard</span>
            <span className="text-xs text-[var(--color-ink-faint)] font-mono">v1.1</span>
          </div>
          <div className="flex items-center gap-4">
            <StatusPill status="idle" label="ENGINE READY" />
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-auto bg-[var(--color-canvas)]">
          {children}
        </main>
      </div>
    </div>
  );
}