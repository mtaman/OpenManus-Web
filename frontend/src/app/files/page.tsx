"use client";

import React, { useEffect, useState } from "react";
import { FolderTree, Folder, File, RefreshCw, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      setFiles(data.tree || data.files || []);
      setWorkspacePath(data.workspace || "");
    } catch (err) {
      console.error("Failed to load files", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrash = async (path: string) => {
    try {
      await fetch(`/api/files?path=${encodeURIComponent(path)}`, { method: "DELETE" });
      fetchFiles();
    } catch (err) {
      console.error("Failed to trash file", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-ink)] font-mono text-xs overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
        <div className="flex items-center gap-3">
          <FolderTree size={18} className="text-[var(--color-accent-400)]" />
          <div>
            <h1 className="text-sm font-semibold tracking-wide">Workspace Sandbox Explorer</h1>
            <p className="text-[10px] text-[var(--color-ink-faint)] truncate max-w-md">{workspacePath}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchFiles} disabled={loading}>
          <RefreshCw size={12} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {files.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-[var(--color-ink-muted)]">
            <Folder size={28} className="mb-2 text-[var(--color-ink-faint)]" />
            <div className="text-sm font-semibold text-[var(--color-ink)] mb-1">No files in sandbox</div>
            <p className="text-xs text-[var(--color-ink-faint)]">Files generated during execution will show up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((file) => (
              <Card key={file.path} className="flex items-center justify-between p-3 bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)]">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {file.is_dir ? (
                    <Folder size={16} className="text-amber-400 flex-shrink-0" />
                  ) : (
                    <File size={16} className="text-[var(--color-code-ink)] flex-shrink-0" />
                  )}
                  <span className="truncate font-semibold text-[var(--color-ink)]">{file.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!file.is_dir && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Delete to .trash">
                      <Trash2 size={12} className="text-red-400" onClick={() => handleTrash(file.path)} />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}