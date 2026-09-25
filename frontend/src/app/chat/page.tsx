"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, RotateCcw, Sparkles, Terminal, ChevronRight } from "lucide-react";

interface StepLog {
  type: string;
  step: number;
  data: any;
}

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [currentLogs, setCurrentLogs] = useState<StepLog[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentLogs]);

  const handleReset = () => {
    setMessages([]);
    setCurrentLogs([]);
    setPrompt("");
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userPrompt = prompt.trim();
    setPrompt("");
    setLoading(true);
    setCurrentLogs([]);
    setMessages((prev) => [...prev, { role: "user", content: userPrompt }]);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, max_steps: 20 }),
      });

      if (!res.ok) {
        throw new Error("Failed to initiate agent execution");
      }

      const resData = await res.json();
      const resolvedJobId = resData.job_id || resData.id || resData.job?.id || resData.data?.job_id;

      if (!resolvedJobId) {
        throw new Error(`Invalid response structure: ${JSON.stringify(resData)}`);
      }

      const es = new EventSource(`/api/run/jobs/${resolvedJobId}/stream`);

      const handleEvent = (event: MessageEvent, eventType: string) => {
        try {
          const payload = JSON.parse(event.data);
          const data = payload.data || payload;

          setCurrentLogs((prev) => [...prev, { type: eventType, step: payload.step || 1, data }]);

          if (eventType === "final" || eventType === "error") {
            const finalResult = data.result || data.error || "Completed";
            setMessages((prev) => [...prev, { role: "assistant", content: finalResult }]);
            es.close();
            setLoading(false);
          }
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };

      const eventNames = ["step_start", "thought", "tool_call", "observation", "step_end", "final", "error"];
      eventNames.forEach((name) => {
        es.addEventListener(name, (e: MessageEvent) => handleEvent(e, name));
      });

      es.onerror = () => {
        es.close();
        setLoading(false);
      };
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>OpenManus Autonomous Chat</span>
          </h1>
          <p className="text-xs text-muted-foreground">Interactive Task Execution & Live Steps</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && currentLogs.length === 0 && (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Give OpenManus a task to execute (e.g. "Write a poem", "Analyze this directory", etc.)
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-card border border-border text-foreground shadow-sm"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="space-y-3 border border-border/80 bg-card rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Terminal className="h-4 w-4 animate-spin" />
              <span>Executing Live Agent Steps...</span>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 font-mono text-xs">
              {currentLogs.map((log, index) => (
                <div key={index} className="p-2.5 rounded-lg bg-black/60 text-muted-foreground border border-border/40">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">
                      {log.type.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Step {log.step}</span>
                  </div>
                  {log.data.thought && (
                    <div className="text-amber-300 whitespace-pre-wrap pl-1">{log.data.thought}</div>
                  )}
                  {log.data.tool && (
                    <div className="text-cyan-400 pl-1">
                      Tool Call: <span className="font-bold">{log.data.tool}</span> {JSON.stringify(log.data.arguments || "")}
                    </div>
                  )}
                  {log.data.output && (
                    <div className="text-emerald-400 whitespace-pre-wrap pl-1">
                      Result: {log.data.output}
                    </div>
                  )}
                  {log.data.prompt && (
                    <div className="text-gray-300 pl-1">{log.data.prompt}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="relative mt-auto">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Assign a task to OpenManus... (Enter to submit, Shift+Enter for newline)"
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className="absolute right-3 top-3.5 p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}