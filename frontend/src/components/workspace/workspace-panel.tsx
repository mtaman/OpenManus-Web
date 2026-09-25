"use client";

import React, { useState, useEffect } from "react";
import { Monitor, FolderTree, Package, TerminalSquare, FileCode2 } from "lucide-react";
import { PreviewTab } from "./preview-tab";
import { FilesTab } from "./files-tab";
import { ArtifactsTab } from "./artifacts-tab";
import { LogsTab } from "./logs-tab";
import { EditorTab } from "./editor-tab";

type TabId = "preview" | "files" | "artifacts" | "logs" | "editor";

interface WorkspacePanelProps {
  activeJobId?: string | null;
  overrideFile?: string | null;
}

export function WorkspacePanel({ activeJobId, overrideFile }: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("files");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const handleSelectFile = (path: string) => {
    setSelectedFilePath(path);
    setActiveTab("editor");
  };

  useEffect(() => {
    if (overrideFile) {
      setSelectedFilePath(overrideFile);
      setActiveTab("editor");
    }
  }, [overrideFile]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "preview", label: "Preview", icon: <Monitor size={14} /> },
    { id: "files", label: "Files", icon: <FolderTree size={14} /> },
    { id: "artifacts", label: "Artifacts", icon: <Package size={14} /> },
    { id: "logs", label: "Logs", icon: <TerminalSquare size={14} /> },
    { id: "editor", label: "Editor", icon: <FileCode2 size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] border-l border-[var(--color-line)]">
      {/* Tab Navigation Header */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--color-surface-2)] text-cyan-400 border border-[var(--color-line)] shadow-sm"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "preview" && <PreviewTab />}
        {activeTab === "files" && (
          <FilesTab onSelectFile={handleSelectFile} activeJobId={activeJobId} />
        )}
        {activeTab === "artifacts" && <ArtifactsTab />}
        {activeTab === "logs" && <LogsTab />}
        {activeTab === "editor" && <EditorTab filePath={selectedFilePath} />}
      </div>
    </div>
  );
}