"use client";

import React from "react";
import { Save, RefreshCw, Cpu, Globe, Search, Box, Share2, Info, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SettingsTab } from "./types";

interface SidebarProps {
  activeTab: SettingsTab;
  setActiveTab: (t: SettingsTab) => void;
  handleSave: () => void;
  handleReset: () => void;
  saving: boolean;
  isDirty: boolean;
  saveStatus: { ok: boolean; message: string } | null;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  handleSave,
  handleReset,
  saving,
  isDirty,
  saveStatus,
}: SidebarProps) {
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "llm", label: "Model Hub [LLM]", icon: <Cpu size={14} /> },
    { id: "browser", label: "Browser & CDP", icon: <Globe size={14} /> },
    { id: "search", label: "Search Engine", icon: <Search size={14} /> },
    { id: "sandbox", label: "Docker & Daytona", icon: <Box size={14} /> },
    { id: "mcp", label: "MCP & Agents", icon: <Share2 size={14} /> },
    { id: "system", label: "Diagnostics & HW", icon: <Info size={14} /> },
  ];

  return (
    <div className="w-60 border-r border-border bg-card/60 flex flex-col p-3 space-y-1 shrink-0 select-none">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Configuration
        </span>
        {isDirty && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Unsaved
          </span>
        )}
      </div>

      <div className="space-y-1 flex-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-manus-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {tab.icon}
                <span>{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-3 border-t border-border space-y-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-primary text-primary-foreground font-medium text-xs rounded-md shadow-manus-xs cursor-pointer hover:opacity-90"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{saving ? "Saving..." : "Save Config"}</span>
          </Button>

          {isDirty && (
            <Button
              onClick={handleReset}
              disabled={saving}
              variant="outline"
              title="Reset changes to loaded configuration"
              className="h-8 px-2.5 border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw size={13} />
            </Button>
          )}
        </div>

        {saveStatus && (
          <div
            className={`p-2 rounded-md text-[11px] leading-tight border flex items-start gap-1.5 ${
              saveStatus.ok
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
            }`}
          >
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span>{saveStatus.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
