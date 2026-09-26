"use client";

import React, { useState, useEffect } from "react";
import { Monitor, FolderTree, Package, TerminalSquare, FileCode2, Globe, FileText, ExternalLink, Download } from "lucide-react";
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

  // Fetch all artifacts generated in the active job
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

          // Auto-select entrypoint if no file is manually selected
          if (!selectedFilePath && list.length > 0) {
            const entryHtml = list.find((f: any) => f.name.toLowerCase() === "index.html") ||
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
    <div className="flex flex-col h-full bg-[var(--color-surface-1)] border-l border-[var(--color-line)] font-mono">
      {/* Primary Tab Navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer ${
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
      </div>

      {/* Multi-Artifact Quick Switcher Bar with ZIP Export */}
      {jobFiles.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-surface-2)] border-b border-[var(--color-line)] overflow-x-auto text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--color-ink-faint)] uppercase tracking-wider font-semibold mr-1">
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
                  className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                      : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-1)]"
                  }`}
                >
                  {isWeb ? <Globe size={11} className="text-emerald-400" /> : <FileText size={11} />}
                  <span>{file.name}</span>
                </button>
              );
            })}
          </div>

          {activeJobId && (
            <a
              href={`/api/run/jobs/${activeJobId}/download-zip`}
              download
              className="flex items-center gap-1 px-2 py-0.5 ml-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono transition cursor-pointer flex-shrink-0"
              title="Download all generated files as a ZIP archive"
            >
              <Download size={11} />
              <span>Download ZIP</span>
            </a>
          )}
        </div>
      )}

      {/* Tab Content Display */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "preview" && (
          <PreviewTab currentHtmlPath={selectedFilePath} />
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
