"use client";

import React, { useState } from "react";
import { Globe, FolderTree, Package, Terminal, Code2 } from "lucide-react";
import { PreviewTab } from "./preview-tab";
import { FilesTab } from "./files-tab";
import { ArtifactsTab } from "./artifacts-tab";
import { LogsTab } from "./logs-tab";
import { EditorTab } from "./editor-tab";

type WorkspaceTab = "preview" | "files" | "artifacts" | "logs" | "editor";

export function WorkspacePanel() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("preview");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const tabs = [
    { id: "preview" as const, label: "Preview", icon: Globe },
    { id: "files" as const, label: "Files", icon: FolderTree },
    { id: "artifacts" as const, label: "Artifacts", icon: Package },
    { id: "logs" as const, label: "Logs", icon: Terminal },
    { id: "editor" as const, label: "Editor", icon: Code2 },
  ];

  const handleSelectFile = (path: string) => {
    setSelectedFilePath(path);
    setActiveTab("editor");
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface-1)] border-l border-[var(--color-line)]">
      {/* Workspace Tabs Header */}
      <div className="flex items-center px-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-[var(--color-accent-500)] text-[var(--color-accent-400)] bg-[var(--color-surface-1)]"
                  : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Icon size={13} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "preview" && <PreviewTab />}
        {activeTab === "files" && <FilesTab onSelectFile={handleSelectFile} />}
        {activeTab === "artifacts" && <ArtifactsTab />}
        {activeTab === "logs" && <LogsTab />}
        {activeTab === "editor" && <EditorTab filePath={selectedFilePath} />}
      </div>
    </div>
  );
}