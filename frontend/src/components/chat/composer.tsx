"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";

interface ComposerProps {
  disabled?: boolean;
  isStreaming?: boolean;
  onSubmit: (prompt: string) => void;
  onCancel?: () => void;
}

export function Composer({ disabled, isStreaming, onSubmit, onCancel }: ComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || disabled || isStreaming) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <div className="p-4 border-t border-[var(--color-line)] bg-[var(--color-surface-1)]">
      <div className="relative flex flex-col rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-2 focus-within:border-[var(--color-line-strong)] transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Assign an autonomous task to OpenManus..."
          disabled={disabled || isStreaming}
          className="w-full resize-none bg-transparent px-3 py-1.5 text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-faint)] focus:outline-none"
        />

        <div className="flex items-center justify-between pt-2 px-2">
          <div className="text-[10px] font-mono text-[var(--color-ink-faint)]">
            Press <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-3)]">Enter</kbd> to submit
          </div>
          {isStreaming ? (
            <Button variant="danger" size="sm" onClick={onCancel}>
              <Square size={12} className="mr-1 fill-current" />
              Stop
            </Button>
          ) : (
            <Button variant="primary" size="sm" disabled={!text.trim() || disabled} onClick={handleSubmit}>
              <ArrowUp size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}