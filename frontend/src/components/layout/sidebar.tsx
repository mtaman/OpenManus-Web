"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { MessageSquare, History, FolderOpen, Settings, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { href: "/chat", label: t("common.chat"), icon: MessageSquare },
    { href: "/history", label: t("common.history"), icon: History },
    { href: "/files", label: t("common.files"), icon: FolderOpen },
    { href: "/settings", label: t("common.settings"), icon: Settings },
  ];

  return (
    <aside className="w-64 border-e border-border bg-card flex flex-col h-screen select-none">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
        <div className="p-2 rounded-lg bg-primary text-primary-foreground">
          <Bot className="h-5 w-5"/>
        </div>
        <span className="font-bold text-base tracking-tight text-foreground">
          {t("common.appName")}
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={cn(
                "font-medium gap-3 hover:bg-muted hover:text-foreground items-center px-3 py-2.5 rounded-lg shadow-sm text-sm transition-colors",
                isActive && "bg-primary text-primary-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0"/>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border text-xs text-muted-foreground text-center">
        OpenManus Web v1.0.0
      </div>
    </aside>
  );
}
