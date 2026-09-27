"use client";

import React, { useState, useEffect } from "react";
import {
  Monitor,
  FolderTree,
  Package,
  TerminalSquare,
  FileCode2,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [exporting, setExporting] = useState<boolean>(false);

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
            const entryFile =
              list.find((f: any) => f.name.toLowerCase() === "index.html") ||
              list.find((f: any) => {
                const l = f.name.toLowerCase();
                return l.endsWith(".html") || l.endsWith(".htm");
              }) ||
              list.find((f: any) => {
                const l = f.name.toLowerCase();
                return l.endsWith(".md") || l.endsWith(".markdown");
              }) ||
              list.find((f: any) => f.name.toLowerCase().endsWith(".svg")) ||
              list[0];

            if (entryFile) {
              setSelectedFilePath(entryFile.name);
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
    const isPreviewable =
      lower.endsWith(".html") ||
      lower.endsWith(".htm") ||
      lower.endsWith(".md") ||
      lower.endsWith(".markdown") ||
      lower.endsWith(".svg");

    if (isPreviewable) {
      setActiveTab("preview");
    } else {
      setActiveTab("editor");
    }
  };

  const handleEditorSaved = (savedPath: string) => {
    setSelectedFilePath(savedPath);
    const lower = savedPath.toLowerCase();
    const isPreviewable =
      lower.endsWith(".html") ||
      lower.endsWith(".htm") ||
      lower.endsWith(".md") ||
      lower.endsWith(".markdown") ||
      lower.endsWith(".svg");

    if (isPreviewable) {
      setActiveTab("preview");
    }
  };

  const handleExportZip = async () => {
    if (!activeJobId) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/run/jobs/${activeJobId}/download-zip`);
      if (!res.ok) {
        throw new Error(`Failed to export ZIP (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `workspace_${activeJobId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export workspace ZIP failed:", err);
    } finally {
      setExporting(false);
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
      setActiveTab("editor");
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

        <div className="flex items-center gap-2 shrink-0">
          {selectedFilePath && (
            <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[130px] hidden sm:inline">
              {selectedFilePath}
            </span>
          )}

          {activeJobId && jobFiles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportZip}
              disabled={exporting}
              className="h-7 px-2.5 text-xs font-sans gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted/60 shadow-manus-xs"
              title="Export all session files as ZIP"
            >
              {exporting ? (
                <>
                  <Loader2 size={12} className="animate-spin text-primary" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download size={12} className="text-primary" />
                  <span>Export ZIP</span>
                </>
              )}
            </Button>
          )}
        </div>
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
          <EditorTab
            filePath={selectedFilePath}
            initialContent={draftContent}
            activeJobId={activeJobId}
            onSave={handleEditorSaved}
          />
        )}
      </div>
    </div>
  );
}

export default WorkspacePanel;