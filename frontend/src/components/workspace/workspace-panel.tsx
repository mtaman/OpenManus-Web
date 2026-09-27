"use client";

import React, { useState, useEffect } from "react";
import {
  Monitor,
  FolderTree,
  Package,
  TerminalSquare,
  FileCode2,
} from "lucide-react";
import { PreviewTab } from "./preview-tab";
import { FilesTab } from "./files-tab";
import { ArtifactsTab } from "./artifacts-tab";
import { LogsTab } from "./logs-tab";
import { EditorTab } from "./editor-tab";

type TabId = "preview" | "files" | "artifacts" | "logs" | "editor";

export interface WorkspacePanelProps {
  activeJobId?: string | null;
  overrideFile?: string | null;
  overrideDraft?: { filename: string; content: string } | null;
}

export function WorkspacePanel({ activeJobId, overrideFile, overrideDraft }: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("preview");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [jobFiles, setJobFiles] = useState<{ name: string; path: string }[]>([]);

  useEffect(() => {
    if (!activeJobId) {
      setJobFiles([]);
      return;
    }

    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/run/jobs/${activeJobId}/files`);
        if (res.ok) {
          const data = await res.json();
          const list = data.files || [];
          setJobFiles(list);

          if (!selectedFilePath && list.length > 0) {
            const entryHtml =
              list.find((f: any) => f.name.toLowerCase() === "index.html") ||
              list.find((f: any) => f.name.toLowerCase().endsWith(".html") || f.name.toLowerCase().endsWith(".htm")) ||
              list[0];

            if (entryHtml) {
              setSelectedFilePath(entryHtml.name);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch workspace files", err);
      }
    };

    fetchFiles();
    const interval = setInterval(fetchFiles, 4000);
    return () => clearInterval(interval);
  }, [activeJobId, selectedFilePath]);

  const handleSelectArtifact = (filename: string) => {
    setSelectedFilePath(filename);
    setDraftContent(null);
    const lower = filename.toLowerCase();
    if (lower.endsWith(".html") || lower.endsWith(".htm")) {
      setActiveTab("preview");
    } else {
      setActiveTab("editor");
    }
  };

  useEffect(() => {
    if (overrideFile) {
      handleSelectArtifact(overrideFile);
    }
  }, [overrideFile]);

  useEffect(() => {
    if (overrideDraft) {
      setSelectedFilePath(overrideDraft.filename);
      setDraftContent(overrideDraft.content);
      const lower = overrideDraft.filename.toLowerCase();
      if (lower.endsWith(".html") || lower.endsWith(".htm")) {
        setActiveTab("editor");
      } else {
        setActiveTab("editor");
      }
    }
  }, [overrideDraft]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "preview", label: "Preview", icon: <Monitor size={14} /> },
    { id: "files", label: "Files", icon: <FolderTree size={14} /> },
    { id: "artifacts", label: "Artifacts", icon: <Package size={14} /> },
    { id: "logs", label: "Logs", icon: <TerminalSquare size={14} /> },
    ...(selectedFilePath || draftContent ? [{ id: "editor" as TabId, label: "Editor", icon: <FileCode2 size={14} /> }] : []),
  ];

  return (
    <div className="flex flex-col h-full bg-background border-l border-border font-sans">
      <div className="h-12 border-b border-border bg-card/40 backdrop-blur-sm px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
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

        {selectedFilePath && (
          <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[150px]">
            {selectedFilePath}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden bg-background">
        {activeTab === "preview" && (
          <PreviewTab currentHtmlPath={selectedFilePath} activeJobId={activeJobId} />
        )}
        {activeTab === "files" && (
          <FilesTab onSelectFile={handleSelectArtifact} activeJobId={activeJobId} />
        )}
        {activeTab === "artifacts" && <ArtifactsTab />}
        {activeTab === "logs" && <LogsTab />}
        {activeTab === "editor" && (
          <EditorTab filePath={selectedFilePath} initialContent={draftContent} activeJobId={activeJobId} />
        )}
      </div>
    </div>
  );
}

export default WorkspacePanel;