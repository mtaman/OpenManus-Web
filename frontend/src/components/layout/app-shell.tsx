"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Folder,
  FolderOpen,
  Settings,
  History,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/projects", icon: FolderOpen, label: "Projects" },
  { href: "/history", icon: History, label: "History" },
  { href: "/files", icon: Folder, label: "Files" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Standalone Fullscreen Mode for Setup Wizard
  if (pathname === "/setup") {
    return (
      <div className="min-h-screen w-screen bg-background text-foreground font-sans overflow-x-hidden selection:bg-primary/25">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* 64px Primary Icon Rail (Manus Architecture) */}
      <aside className="w-16 h-full flex flex-col items-center justify-between py-3 border-r border-border bg-card/60 backdrop-blur-md z-30 shrink-0 select-none">
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/chat"
            className="w-10 h-10 rounded-sm bg-card border border-border/80 flex items-center justify-center p-1.5 shadow-manus-xs hover:border-primary/50 transition-all group"
            title="OpenManus Web"
          >
            <img
              src="/logo.png"
              alt="OpenManus"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Navigation Rail */}
          <nav className="flex flex-col gap-1.5">
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
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-manus-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={18} />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Toggle secondary sidebar button */}
        <div className="flex flex-col items-center gap-2">
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
          </div>
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