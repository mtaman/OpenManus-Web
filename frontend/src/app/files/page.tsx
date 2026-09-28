"use client";

import React, { useEffect, useState } from "react";
import { FolderTree, Folder, File, RefreshCw, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;
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
    <div className="flex flex-col flex-1 h-full w-full bg-background text-foreground font-sans overflow-hidden">
      {/* Header Bar */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-card/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <FolderTree size={18} className="text-manus-accent shrink-0" />
          <div className="truncate">
            <h1 className="font-heading font-semibold text-sm text-foreground">
              Workspace Sandbox Explorer
            </h1>
            <p className="text-[11px] text-muted-foreground font-mono truncate max-w-md">
              {workspacePath || "Default Workspace Directory"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchFiles}
          disabled={loading}
          className="h-8 text-xs border-border bg-background hover:bg-muted text-foreground rounded-md shadow-manus-xs cursor-pointer"
        >
          <RefreshCw size={12} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Files Grid / Empty State */}
      <div className="flex-1 overflow-y-auto p-6 bg-background">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-xs animate-pulse font-mono">
            Loading workspace directory...
          </div>
        ) : files.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-card border border-border shadow-manus-sm flex items-center justify-center text-muted-foreground">
              <Folder size={24} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground mb-1">No files in sandbox</div>
              <p className="text-xs text-muted-foreground">Files generated during agent execution will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {files.map((file) => (
              <div
                key={file.path}
                className="flex items-center justify-between p-3.5 rounded-sm border border-border bg-card hover:border-primary/40 transition-all shadow-manus-xs group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {file.is_dir ? (
                    <Folder size={16} className="text-manus-warning shrink-0" />
                  ) : (
                    <File size={16} className="text-manus-info shrink-0" />
                  )}
                  <span className="truncate text-xs font-mono font-medium text-foreground">
                    {file.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!file.is_dir && (
                    <>
                      <a
                        href={`/api/files/download?path=${encodeURIComponent(file.path)}`}
                        download
                        className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border text-[11px] transition shadow-manus-xs"
                        title="Download file"
                      >
                        <Download size={13} />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleTrash(file.path)}
                        className="p-1.5 rounded-md bg-muted hover:bg-manus-error/20 text-muted-foreground hover:text-manus-error border border-border transition cursor-pointer"
                        title="Delete file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
