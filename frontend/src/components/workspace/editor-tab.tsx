"use client";

import React, { useEffect, useState } from "react";
import { Save, FileCode, CheckCircle2, AlertCircle } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center h-full text-xs text-[var(--color-ink-faint)] font-mono p-4 text-center">
        <FileCode size={28} className="mb-2 opacity-50" />
        <p>No file selected for editing.</p>
        <p className="text-[10px] mt-1 text-[var(--color-ink-muted)]">Click any file in the Files tab to inspect and edit.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-ink)] font-mono text-xs">
      <div className="flex items-center justify-between p-2.5 border-b border-[var(--color-line)] bg-[var(--color-surface-1)]">
        <span className="truncate max-w-[200px] font-semibold text-[11px] text-cyan-400">{filePath}</span>
        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className="text-[10px] text-emerald-400">{statusMsg}</span>
          )}
          <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving || loading} className="h-6 text-[10px]">
            <Save size={11} className="mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      <div className="flex-1 p-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
          className="w-full h-full p-2.5 rounded bg-[var(--color-void)] border border-[var(--color-line)] text-[var(--color-code-ink)] font-mono text-xs resize-none focus:outline-none focus:border-[var(--color-thought)]"
          placeholder="File content..."
        />
      </div>
    </div>
  );
}