"use client";

import React, { useState, useEffect } from "react";
import {
  Monitor,
  FolderTree,
  Package,
  TerminalSquare,
  FileCode2,
  Globe,
  FileText,
  Download
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<TabId>("preview");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
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
            handleSelectArtifact(entryHtml.name);
          }
        }
      } catch (err) {
        console.error("Failed to load workspace artifacts", err);
      }
    };
    fetchFiles();
    const interval = setInterval(fetchFiles, 4000);
    return () => clearInterval(interval);
  }, [activeJobId, selectedFilePath]);

  const handleSelectArtifact = (filename: string) => {
    setSelectedFilePath(filename);
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

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "preview", label: "Preview", icon: <Monitor size={14} /> },
    { id: "files", label: "Files", icon: <FolderTree size={14} /> },
    { id: "artifacts", label: "Artifacts", icon: <Package size={14} /> },
    { id: "logs", label: "Logs", icon: <TerminalSquare size={14} /> },
    ...(selectedFilePath ? [{ id: "editor" as TabId, label: "Editor", icon: <FileCode2 size={14} /> }] : []),
  ];

  return (
    <div className="flex flex-col h-full bg-background border-l border-border font-sans">
      {/* Primary Tab Navigation */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-border bg-card/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
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
      </div>

      {/* Multi-Artifact Quick Switcher Bar with ZIP Export */}
      {jobFiles.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-card/60 border-b border-border overflow-x-auto text-[11px] shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mr-1">
              Artifacts:
            </span>
            {jobFiles.map((file) => {
              const isSelected = selectedFilePath === file.name;
              const isWeb = file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm");
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => handleSelectArtifact(file.name)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-manus-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {isWeb ? <Globe size={11} className={isSelected ? "text-primary-foreground" : "text-manus-success"} /> : <FileText size={11} />}
                  <span>{file.name}</span>
                </button>
              );
            })}
          </div>

          {activeJobId && (
            <a
              href={`/api/run/jobs/${activeJobId}/download-zip`}
              download
              className="flex items-center gap-1 px-2 py-0.5 ml-2 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border text-[10px] font-mono transition cursor-pointer flex-shrink-0 shadow-manus-xs"
              title="Download all generated files as a ZIP archive"
            >
              <Download size={11} />
              <span>Download ZIP</span>
            </a>
          )}
        </div>
      )}

      {/* Tab Content Display */}
      <div className="flex-1 min-h-0 overflow-hidden bg-background">
        {activeTab === "preview" && (
          <PreviewTab currentHtmlPath={selectedFilePath} activeJobId={activeJobId} />
        )}
        {activeTab === "files" && (
          <FilesTab onSelectFile={handleSelectArtifact} activeJobId={activeJobId} />
        )}
        {activeTab === "artifacts" && <ArtifactsTab />}
        {activeTab === "logs" && <LogsTab />}
        {activeTab === "editor" && <EditorTab filePath={selectedFilePath} />}
      </div>
    </div>
  );
}

export default WorkspacePanel;
