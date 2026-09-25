"use client";

import React, { useEffect, useState } from "react";
import { X, Download, FileText, Loader2, AlertCircle } from "lucide-react";

interface FilePreviewModalProps {
  filePath: string | null;
  onClose: () => void;
}

export function FilePreviewModal({ filePath, onClose }: FilePreviewModalProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setContent("");
      setError(null);
      return;
    }

    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/files/preview?path=${encodeURIComponent(filePath)}`);
        if (!res.ok) {
          throw new Error("Unable to preview file. It may be binary or too large.");
        }
        const data = await res.json();
        setContent(data.content || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error reading file content");
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [filePath]);

  if (!filePath) return null;

  const fileName = filePath.split("/").pop() || filePath;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-4xl h-[80vh] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="font-semibold text-foreground text-sm truncate font-mono">
              {fileName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/files/download?path=${encodeURIComponent(filePath)}`}
              download
              title="Download file"
              className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              type="button"
              title="Close preview"
              className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-auto bg-background font-mono text-xs leading-relaxed text-foreground select-text">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading file preview...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-rose-500">
              <AlertCircle className="h-6 w-6" />
              <span>{error}</span>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words">{content}</pre>
          )}
        </div>
      </div>
    </div>
  );
}