"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Send, Bot, User, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { useChatStore, ChatMessage } from "@/stores/chat-store";
import { LiveSteps } from "@/components/chat/live-steps";
import { useJobStream } from "@/hooks/useJobStream";

export default function ChatPage() {
  const { t } = useTranslation();
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    isRunning,
    currentJobId,
    activeSteps,
    addMessage,
    setCurrentJobId,
    setIsRunning,
    clearActiveSteps,
    resetChat
  } = useChatStore();

  useJobStream(currentJobId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeSteps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = inputPrompt.trim();
    if (!prompt || isRunning) return;

    setInputPrompt("");
    clearActiveSteps();

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);

    try {
      setIsRunning(true);
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error("Failed to initiate agent execution");
      }

      const data = await res.json();
      const jobId = data.job_id;
      setCurrentJobId(jobId);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        jobId: jobId,
        status: "running",
        timestamp: new Date().toISOString(),
      };
      addMessage(assistantMessage);
    } catch (err) {
      setIsRunning(false);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "system",
        content: err instanceof Error ? err.message : "Error submitting prompt",
        timestamp: new Date().toISOString(),
        status: "failed",
      };
      addMessage(errorMessage);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>{t("chat.title", "Agent Chat")}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("common.appName")} — Interactive Task Execution
          </p>
        </div>

        <button
          type="button"
          onClick={resetChat}
          disabled={isRunning}
          title="Reset Conversation"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl bg-card/30">
            <Bot className="h-10 w-10 text-primary/70 mb-3" />
            <h3 className="font-semibold text-foreground text-sm">
              {t("chat.emptyStateTitle", "How can OpenManus assist you today?")}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {t(
                "chat.emptyStateSubtitle",
                "Ask OpenManus to browse the web, write code, research topics, or execute commands."
              )}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-sm ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role !== "user" && (
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.role === "system"
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap break-words leading-relaxed text-xs sm:text-sm">
                  {msg.content}
                </div>

                {/* Render live execution steps for the active assistant message */}
                {msg.role === "assistant" && msg.jobId === currentJobId && (
                  <LiveSteps steps={activeSteps} isRunning={isRunning} />
                )}

                <div
                  className={`mt-1.5 text-[10px] opacity-60 font-mono ${
                    msg.role === "user" ? "text-end" : "text-start"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="pt-4 mt-auto">
        <div className="relative flex items-center">
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={t("chat.placeholder", "Assign a task to OpenManus... (Enter to submit, Shift+Enter for newline)")}
            rows={2}
            disabled={isRunning}
            className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pe-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isRunning || !inputPrompt.trim()}
            title="Send Prompt"
            className="absolute end-3 bottom-3 p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 rtl:rotate-180" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}