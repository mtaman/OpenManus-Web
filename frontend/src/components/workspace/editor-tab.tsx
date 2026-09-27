"use client";

import React, { useEffect, useState } from "react";
import { Save, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorTabProps {
  filePath?: string | null;
}

export function EditorTab({ filePath }: EditorTabProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
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
  }, [filePath]);

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
        setStatusMsg("Saved successfully!");
        setTimeout(() => setStatusMsg(null), 2500);
      } else {
        setStatusMsg("Failed to save.");
      }
    } catch (err) {
      setStatusMsg("Save error.");
    } finally {
      setSaving(false);
    }
  };

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground font-sans p-4 text-center">
        <FileCode size={28} className="mb-2 opacity-50 text-manus-accent" />
        <p className="font-medium text-foreground">No file selected for editing.</p>
        <p className="text-[11px] mt-1 text-muted-foreground">Click any file in the Files tab to inspect and edit.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono text-xs">
      <div className="flex items-center justify-between p-2.5 border-b border-border bg-card/40">
        <span className="truncate max-w-[200px] font-semibold text-xs text-primary">{filePath}</span>
        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className="text-[11px] text-manus-success">{statusMsg}</span>
          )}
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading} className="h-7 text-xs shadow-manus-xs">
            <Save size={12} className="mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      <div className="flex-1 p-2">
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
