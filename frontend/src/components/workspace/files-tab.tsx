"use client";

import React, { useEffect, useState } from "react";
import { Folder, FileText, Download, Trash2, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  extension?: string;
  modified?: number;
  children?: FileItem[];
}

interface FilesTabProps {
  onOpenFile?: (path: string) => void;
}

export function FilesTab({ onOpenFile }: FilesTabProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error("Failed to load workspace files", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filePath: string) => {
    if (!confirm(`Are you sure you want to delete ${filePath}?`)) return;
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(filePath)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchFiles();
      }
    } catch (err) {
      console.error("Failed to delete file", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const renderTree = (items: FileItem[]) => {
    if (items.length === 0) {
      return (
        <div className="p-4 text-center text-xs text-[var(--color-ink-faint)]">
          No files in workspace yet.
        </div>
      );
    }

    return (
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.path} className="text-xs">
            <div className="flex items-center justify-between p-1.5 rounded hover:bg-[var(--color-surface-2)] group">
              <div 
                className="flex items-center gap-2 truncate cursor-pointer flex-1"
                onClick={() => !item.isDir && onOpenFile && onOpenFile(item.path)}
              >
                {item.isDir ? (
                  <Folder size={14} className="text-amber-400 flex-shrink-0" />
                ) : (
                  <FileText size={14} className="text-cyan-400 flex-shrink-0" />
                )}
                <span className="truncate">{item.name}</span>
                {item.size !== undefined && (
                  <span className="text-[10px] text-[var(--color-ink-faint)]">
                    ({(item.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>

              {!item.isDir && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={`/api/files/download?path=${encodeURIComponent(item.path)}`}
                    download
                    className="p-1 hover:text-emerald-400"
                    title="Download"
                  >
                    <Download size={13} />
                  </a>
                  <button
                    onClick={() => handleDelete(item.path)}
                    className="p-1 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {item.isDir && item.children && item.children.length > 0 && (
              <div className="pl-4 border-l border-[var(--color-line-subtle)] ml-2">
                {renderTree(item.children)}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-ink)] font-mono text-xs">
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
        <span className="font-semibold text-xs tracking-wider text-[var(--color-ink-muted)]">WORKSPACE SANDBOX</span>
        <Button variant="ghost" size="sm" onClick={fetchFiles} disabled={loading} className="h-7 w-7 p-0">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {renderTree(files)}
      </div>
    </div>
  );
}