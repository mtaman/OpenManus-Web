"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Folder,
  FolderOpen,
  History,
  Settings,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/projects", icon: Folder, label: "Projects" },
  { href: "/files", icon: FolderOpen, label: "Files" },
  { href: "/history", icon: History, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* 64px Primary Icon Rail (Manus Architecture) */}
      <aside className="w-16 flex-shrink-0 flex flex-col items-center py-3 bg-card border-r border-border z-30 select-none">
        {/* Brand Monogram */}
        <Link
          href="/chat"
          title="Manus Agent"
          className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-serif font-bold text-sm shadow-manus-xs hover:opacity-90 transition-transform active:scale-95 mb-5"
        >
          M
        </Link>

        {/* Primary Navigation Rail */}
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/chat" && pathname.startsWith(item.href)) ||
              (item.href === "/chat" && pathname.startsWith("/chat"));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`w-10 h-10 flex items-center justify-center rounded-md transition-all duration-150 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-manus-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.75} />
              </Link>
            );
          })}
        </nav>

        {/* Toggle secondary sidebar button */}
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          className="w-10 h-10 mb-2 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>

        {/* Bottom Rail Actions */}
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-border/60">
          <ThemeToggle />
          <div
            title="Core Online"
            className="w-2 h-2 rounded-full bg-manus-success mt-1 animate-pulse"
          />
        </div>
      </aside>

      {/* 260px Secondary Sidebar (Collapsible) */}
      {isSidebarOpen && <Sidebar />}

      {/* Main Workspace Area with Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden relative flex">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
