"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  placeholder?: string;
}

export function ChatComposer({
  onSend,
  disabled = false,
  isStreaming = false,
  onStop,
  placeholder = "Assign an autonomous task to OpenManus...",
}: ChatComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex flex-col w-full">
      <div className="flex items-end gap-2 bg-card border border-border rounded-xl p-2 shadow-sm focus-within:border-primary/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled && !isStreaming}
          rows={1}
          className="flex-1 bg-transparent resize-none border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground max-h-40 py-1.5 px-2"
        />
        {isStreaming ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onStop}
            className="h-8 px-3 shrink-0"
          >
            <Square className="w-3.5 h-3.5 mr-1" />
            <span>Stop</span>
          </Button>
        ) : (
          <Button
            type="submit"
            size="sm"
            disabled={disabled || !input.trim()}
            className="h-8 w-8 p-0 shrink-0 rounded-lg"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </form>
  );
}

export const Composer = ChatComposer;
export default ChatComposer;