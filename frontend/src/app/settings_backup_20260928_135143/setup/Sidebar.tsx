// settings/setup/Sidebar.tsx
"use client";

import React from "react";
import { Save, RefreshCw, Cpu, Globe, Search, Box, Share2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SettingsTab } from "./types";

interface SidebarProps {
  activeTab: SettingsTab;
  setActiveTab: (t: SettingsTab) => void;
  handleSave: () => void;
  saving: boolean;
  saveStatus: string | null;
}

export function Sidebar({ activeTab, setActiveTab, handleSave, saving, saveStatus }: SidebarProps) {
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "llm", label: "Model Hub [LLM]", icon: <Cpu size={14} /> },
    { id: "browser", label: "Browser & CDP", icon: <Globe size={14} /> },
    { id: "search", label: "Search Engine", icon: <Search size={14} /> },
    { id: "sandbox", label: "Docker & Daytona", icon: <Box size={14} /> },
    { id: "mcp", label: "MCP & Agents", icon: <Share2 size={14} /> },
    { id: "system", label: "Diagnostics & HW", icon: <Info size={14} /> },
  ];

  return (
    <div className="w-56 border-r border-border bg-card/40 flex flex-col p-3 space-y-1 shrink-0">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
        Configuration
      </span>
      <div className="space-y-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-manus-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-4 mt-auto border-t border-border space-y-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 h-8 bg-primary text-primary-foreground font-medium text-xs rounded-md shadow-manus-xs cursor-pointer"
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          <span>{saving ? "Saving..." : "Save Config"}</span>
        </Button>

        {saveStatus && (
          <div
            className={`p-2 rounded-md text-[11px] leading-tight border ${
              saveStatus.includes("Error") || saveStatus.includes("Failed")
                ? "bg-manus-error/10 border-manus-error/30 text-manus-error"
                : "bg-manus-success/10 border-manus-success/30 text-manus-success"
            }`}
          >
            {saveStatus}
          </div>
        )}
      </div>
    </div>
  );
}
