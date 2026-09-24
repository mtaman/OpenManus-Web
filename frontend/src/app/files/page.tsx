"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Folder,
  FileText,
  FileCode,
  Image as ImageIcon,
  File as GenericFile,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  FolderOpen,
  ChevronRight,
  ArrowLeft
} from "lucide-react";

interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: string;
}

export default function FilesPage() {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async (path: string = "") => {
    try {
      setLoading(true);
      setError(null);
      const query = path ? `?path=${encodeURIComponent(path)}` : "";
      const res = await fetch(`/api/files${query}`);
      if (!res.ok) {
        throw new Error("Failed to load workspace files");
      }
      const data = await res.json();
      setFiles(data.files || []);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles("");
  }, []);

  const handleNavigate = (subPath: string) => {
    fetchFiles(subPath);
  };

  const handleNavigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const parent = parts.join("/");
    fetchFiles(parent);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (file: FileItem) => {
    if (file.is_dir) return <Folder className="h-4 w-4 text-amber-500 fill-amber-500/20"/>;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["ts", "tsx", "js", "jsx", "py", "json", "html", "css"].includes(ext)) {
      return <FileCode className="h-4 w-4 text-blue-500"/>;
    }
    if (["png", "jpg", "jpeg", "svg", "webp"].includes(ext)) {
      return <ImageIcon className="h-4 w-4 text-emerald-500"/>;
    }
    if (["md", "txt", "log"].includes(ext)) {
      return <FileText className="h-4 w-4 text-slate-400"/>;
    }
    return <GenericFile className="h-4 w-4 text-muted-foreground"/>;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("common.files")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("common.appName")} — Workspace Directory Browser
          </p>
        </div>

        <button
          onClick={() => fetchFiles(currentPath)}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} />
          <span>{t("common.refresh", "Refresh")}</span>
        </button>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm text-muted-foreground">
        <button
          onClick={() => fetchFiles("")}
          className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
        >
          <FolderOpen className="h-4 w-4 text-primary"/>
          <span>workspace</span>
        </button>

        {currentPath && (
          <>
            <ChevronRight className="h-4 w-4 rtl:rotate-180 text-muted-foreground shrink-0"/>
            <span className="font-mono text-xs text-foreground">{currentPath}</span>
          </>
        )}

        {currentPath && (
          <button
            onClick={handleNavigateUp}
            className="ms-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180"/>
            <span>Up</span>
          </button>
        )}
      </div>

      {/* Explorer Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-rose-500">
            {error}
          </div>
        ) : loading && files.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary"/>
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No files or folders found in this directory.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Size</th>
                  <th className="px-6 py-3">Modified</th>
                  <th className="px-6 py-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {files.map((file) => (
                  <tr
                    key={file.path}
                    className="hover:bg-muted/50 transition-colors group"
                  >
                    <td className="px-6 py-3.5 font-medium text-foreground">
                      {file.is_dir ? (
                        <button
                          onClick={() => handleNavigate(file.path)}
                          className="flex items-center gap-2.5 hover:underline focus:outline-none"
                        >
                          {getFileIcon(file)}
                          <span>{file.name}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          {getFileIcon(file)}
                          <span>{file.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {file.is_dir ? "—" : formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground font-mono">
                      {file.modified ? new Date(file.modified).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-end">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {!file.is_dir && (
                          <>
                            <a
                              href={`/api/files/download?path=${encodeURIComponent(file.path)}`}
                              download
                              title="Download"
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Download className="h-4 w-4"/>
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}