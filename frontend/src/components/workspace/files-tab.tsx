"use client";

import React, { useEffect, useState } from "react";
import { Folder, File, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
}

export function FilesTab({ onSelectFile }: { onSelectFile?: (path: string) => void }) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      setFiles(data.tree || data.files || []);
    } catch (err) {
      console.error("Failed to load workspace files", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface-1)] text-xs font-mono">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
        <span className="text-[10px] uppercase font-semibold text-[var(--color-ink-muted)]">Workspace Files</span>
        <Button variant="ghost" size="sm" onClick={fetchFiles} disabled={loading} className="h-6 px-2 text-[10px]">
          <RefreshCw size={10} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.length === 0 ? (
          <div className="p-4 text-center text-[var(--color-ink-faint)]">
            No files in workspace directory yet.
          </div>
        ) : (
          files.map((file) => (
            <button
              key={file.path}
              onClick={() => onSelectFile?.(file.path)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[var(--color-surface-2)] text-left cursor-pointer transition-colors"
            >
              {file.is_dir ? (
                <Folder size={14} className="text-amber-400 flex-shrink-0" />
              ) : (
                <File size={14} className="text-[var(--color-code-ink)] flex-shrink-0" />
              )}
              <span className="truncate flex-1 text-[var(--color-ink)]">{file.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}