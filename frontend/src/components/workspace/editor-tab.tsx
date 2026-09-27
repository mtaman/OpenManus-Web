"use client";

import React, { useEffect, useState } from "react";
import { Save, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EditorTabProps {
  filePath?: string | null;
  initialContent?: string | null;
}

export function EditorTab({ filePath, initialContent }: EditorTabProps) {
  const [content, setContent] = useState<string>(initialContent || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialContent !== undefined && initialContent !== null) {
      setContent(initialContent);
      return;
    }

    if (!filePath) {
      setContent("");
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      setStatusMsg(null);
      try {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.content || "");
        } else {
          setContent("// Error loading file or binary file.");
        }
      } catch (err) {
        setContent("// Failed to fetch file content.");
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [filePath, initialContent]);

  const handleSave = async () => {
    if (!filePath) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/files/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content }),
      });
      if (res.ok) {
        setStatusMsg("Saved successfully");
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg("Failed to save");
      }
    } catch {
      setStatusMsg("Save error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background font-mono text-xs">
      <div className="h-10 border-b border-border bg-card/60 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-primary" />
          <span className="font-semibold text-foreground truncate max-w-xs">
            {filePath || "draft-snippet"}
          </span>
          {initialContent && !filePath && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
              Draft
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className="text-[11px] text-muted-foreground mr-2">{statusMsg}</span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading || !filePath}
            className="h-7 text-xs shadow-manus-xs cursor-pointer"
          >
            <Save size={12} className="mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-3 min-h-0 bg-background">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
          className="w-full h-full p-3 rounded-lg bg-card border border-border text-foreground font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary shadow-manus-xs"
          placeholder="File content..."
        />
      </div>
    </div>
  );
}

export default EditorTab;