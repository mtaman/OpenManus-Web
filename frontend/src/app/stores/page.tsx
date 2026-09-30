"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import {
  fetchStoreAgents,
  fetchStoreTools,
  fetchStoreExtensions,
  createStoreAgent,
  updateStoreAgent,
  deleteStoreAgent
} from "@/lib/chatsApi";
import { AgentManifest, ToolDefinition, ExtensionDefinition, AgentUpsertPayload } from "@/lib/types";
import {
  Bot,
  Code2,
  Search,
  BarChart3,
  Sparkles,
  Store,
  Wrench,
  Puzzle,
  Plus,
  Trash2,
  Edit2,
  Check,
  ArrowRight,
  Terminal,
  Cpu,
  RefreshCw,
  X,
  Shield,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StoresPage() {
  const router = useRouter();
  const { setSelectedAgentId } = useChatStore();

  const [activeTab, setActiveTab] = useState<"agents" | "tools" | "extensions">("agents");
  const [agents, setAgents] = useState<AgentManifest[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [extensions, setExtensions] = useState<ExtensionDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<"all" | "builtin" | "custom">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AgentUpsertPayload>({
    name: "",
    role: "Specialist",
    icon: "Sparkles",
    description: "",
    system_prompt: "",
    tools: ["bash", "python_execute", "file_saver"],
    max_steps: 30
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ag, tl, ex] = await Promise.all([
        fetchStoreAgents(),
        fetchStoreTools(),
        fetchStoreExtensions()
      ]);
      setAgents(ag || []);
      setTools(tl || []);
      setExtensions(ex || []);
    } catch (err) {
      console.error("Failed to load store data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartChatWithAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    router.push("/chat");
  };

  const handleOpenCreateModal = () => {
    setEditingAgentId(null);
    setFormData({
      name: "",
      role: "Specialist",
      icon: "Sparkles",
      description: "",
      system_prompt: "",
      tools: ["bash", "python_execute", "file_saver"],
      max_steps: 30
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ag: AgentManifest) => {
    setEditingAgentId(ag.id);
    setFormData({
      name: ag.name,
      role: ag.role || "Specialist",
      icon: ag.icon || "Sparkles",
      description: ag.description || "",
      system_prompt: ag.system_prompt,
      tools: ag.tools || [],
      max_steps: ag.max_steps || 30
    });
    setIsModalOpen(true);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Are you sure you want to delete this custom agent?")) return;
    const ok = await deleteStoreAgent(agentId);
    if (ok) {
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
    }
  };

  const handleToggleTool = (toolId: string) => {
    setFormData((prev) => {
      const exists = prev.tools.includes(toolId);
      return {
        ...prev,
        tools: exists ? prev.tools.filter((t) => t !== toolId) : [...prev.tools, toolId]
      };
    });
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.system_prompt.trim()) return;

    if (editingAgentId) {
      const updated = await updateStoreAgent(editingAgentId, formData);
      if (updated) {
        setAgents((prev) => prev.map((a) => (a.id === editingAgentId ? updated : a)));
        setIsModalOpen(false);
      }
    } else {
      const created = await createStoreAgent(formData);
      if (created) {
        setAgents((prev) => [...prev, created]);
        setIsModalOpen(false);
      }
    }
  };

  const renderAgentIcon = (iconName?: string) => {
    switch ((iconName || "").toLowerCase()) {
      case "code2":
        return <Code2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />;
      case "search":
        return <Search className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case "barchart3":
        return <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case "sparkles":
        return <Sparkles className="h-5 w-5 text-manus-accent" />;
      default:
        return <Bot className="h-5 w-5 text-manus-accent" />;
    }
  };

  const filteredAgents = useMemo(() => {
    return agents.filter((ag) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        ag.name.toLowerCase().includes(q) ||
        (ag.description || "").toLowerCase().includes(q) ||
        (ag.role || "").toLowerCase().includes(q);

      if (!matchesQuery) return false;
      if (agentFilter === "builtin") return ag.is_builtin;
      if (agentFilter === "custom") return !ag.is_builtin;
      return true;
    });
  }, [agents, searchQuery, agentFilter]);

  const filteredTools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tools.filter(
      (tl) =>
        !q ||
        tl.name.toLowerCase().includes(q) ||
        (tl.description || "").toLowerCase().includes(q) ||
        (tl.category || "").toLowerCase().includes(q)
    );
  }, [tools, searchQuery]);

  const filteredExtensions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return extensions.filter(
      (ex) =>
        !q ||
        ex.name.toLowerCase().includes(q) ||
        (ex.description || "").toLowerCase().includes(q)
    );
  }, [extensions, searchQuery]);

  return (
    <div className="w-full h-full flex flex-col flex-1 bg-background text-foreground overflow-hidden">
      {/* Header Bar - Full Width with Centered 1240px Container */}
      <header className="w-full border-b border-border bg-card/75 backdrop-blur-md sticky top-0 z-10">
        <div className="  mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-manus-accent/10 text-manus-accent border border-manus-accent/20 shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground tracking-tight">
                  Sovereign Stores & Capabilities
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground border border-border">
                  v2.5
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Autonomous Agents Hub, Tool Catalog & Extensible MCP Protocols
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs border-border bg-muted hover:bg-primary hover:text-primary-foreground text-primary transition shadow-sm h-8"
            >
              <RefreshCw size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {activeTab === "agents" && (
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                className="primary bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-sm h-8 px-3.5 transition"
              >
                <Plus size={14} className="mr-1.5" />
                New Agent
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs & Filters Bar - Full Width with Centered 1240px Container */}
      <div className="w-full border-b border-border bg-muted/20">
        <div className="  mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto pt-2 scrollbar-none">
            <button
              onClick={() => setActiveTab("agents")}
              className={`primary flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                activeTab === "agents"
                  ? "border-manus-accent text-manus-accent bg-accent/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot size={15} />
              <span>Agents Hub</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                {agents.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tools")}
              className={`primary flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                activeTab === "tools"
                  ? "border-manus-accent text-manus-accent bg-accent/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wrench size={15} />
              <span>Tools Catalog</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                {tools.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("extensions")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                activeTab === "extensions"
                  ? "border-accent text-manus-accent bg-accent/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Puzzle size={15} />
              <span>Extensions & MCP</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                {extensions.length}
              </span>
            </button>
          </div>

          {/* Quick Search & Agent Filters */}
          <div className="flex items-center gap-2.5 pb-2 sm:pb-0">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {activeTab === "agents" && (
              <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border text-[11px]">
                <button
                  onClick={() => setAgentFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition ${
                    agentFilter === "all"
                      ? "bg-card text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setAgentFilter("builtin")}
                  className={`px-2.5 py-1 rounded-md transition ${
                    agentFilter === "builtin"
                      ? "bg-card text-sky-600 dark:text-sky-400 shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Built-in
                </button>
                <button
                  onClick={() => setAgentFilter("custom")}
                  className={`px-2.5 py-1 rounded-md transition ${
                    agentFilter === "custom"
                      ? "bg-card text-manus-accent shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Custom
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area - Full Width with Centered 1240px Container */}
      <main className="w-full flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Tab 1: Agents */}
          {activeTab === "agents" && (
            <div>
              {filteredAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
                  <Bot className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-sm font-semibold text-foreground">No agents found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    {searchQuery ? "Try refining your search query." : "No agents available in the store yet."}
                  </p>
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="mt-3 text-xs">
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredAgents.map((ag) => (
                    <div
                      key={ag.id}
                      className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border bg-card hover:border-manus-accent/40 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3.5">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-muted border border-border shadow-sm group-hover:scale-105 transition-transform">
                              {renderAgentIcon(ag.icon)}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground group-hover:text-manus-accent transition-colors">
                                {ag.name}
                              </h3>
                              <span className="text-[11px] font-mono text-manus-accent">
                                {ag.role || "Autonomous Agent"}
                              </span>
                            </div>
                          </div>
                          {ag.is_builtin ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300">
                              BUILT-IN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-manus-accent/10 border border-manus-accent/30 text-manus-accent">
                              CUSTOM
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                          {ag.description || "Custom configured autonomous specialist."}
                        </p>

                        <div className="mb-4">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block mb-1.5">
                            Scoped Tools ({ag.tools?.length || 0})
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto scrollbar-none">
                            {ag.tools && ag.tools.length > 0 ? (
                              ag.tools.map((t) => (
                                <span
                                  key={t}
                                  className="px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground font-mono border border-border"
                                >
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">No tools bound</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3.5 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {!ag.is_builtin && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(ag)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                                title="Edit Agent"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteAgent(ag.id)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                                title="Delete Agent"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleStartChatWithAgent(ag.id)}
                          className="primary bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3.5 h-8 font-medium shadow-sm transition group/btn"
                        >
                          <span>Start Chat</span>
                          <ArrowRight size={12} className="ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Tools */}
          {activeTab === "tools" && (
            <div>
              {filteredTools.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
                  <Wrench className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-sm font-semibold text-foreground">No tools found</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    No matching tools found for your query.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredTools.map((tl) => (
                    <div
                      key={tl.id}
                      className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-manus-accent/10 text-manus-accent border border-manus-accent/20">
                              <Terminal size={15} />
                            </div>
                            <h3 className="text-sm font-bold text-foreground font-mono">
                              {tl.name}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-muted text-muted-foreground border border-border">
                            {tl.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                          {tl.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Shield size={12} />
                          Safety Level:
                        </span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${
                            tl.safety_level === "safe"
                              ? "bg-manus-accent/10 text-manus-accent border border-manus-accent/30"
                              : tl.safety_level === "read_only"
                              ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {tl.safety_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Extensions & MCP */}
          {activeTab === "extensions" && (
            <div>
              {filteredExtensions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
                  <Puzzle className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-sm font-semibold text-foreground">No extensions found</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    No MCP extensions matching your search.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredExtensions.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                              <Cpu size={16} />
                            </div>
                            <h3 className="text-sm font-bold text-foreground">
                              {ex.name}
                            </h3>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold bg-manus-accent/10 border border-manus-accent/30 text-manus-accent flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            {ex.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                          {ex.description}
                        </p>
                      </div>

                      {ex.command && (
                        <div className="p-2.5 rounded-xl bg-muted/60 border border-border text-[11px] font-mono text-foreground truncate select-all">
                          <span className="text-muted-foreground mr-1.5">$</span>
                          {ex.command}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal: Create / Edit Agent */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-manus-accent/10 text-manus-accent">
                  <Bot size={16} />
                </div>
                <h2 className="text-sm font-bold text-foreground">
                  {editingAgentId ? "Edit Custom Agent" : "Create New Custom Agent"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-foreground font-medium mb-1">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. SEO Optimizer"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-manus-accent/20 focus:border-manus-accent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Senior SEO Strategist"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-manus-accent/20 focus:border-manus-accent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-foreground font-medium mb-1">
                    Agent Icon
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-manus-accent/20 focus:border-manus-accent transition-all"
                  >
                    <option value="Sparkles">Sparkles (Specialist)</option>
                    <option value="Code2">Code2 (Developer)</option>
                    <option value="Search">Search (Researcher)</option>
                    <option value="BarChart3">BarChart3 (Analyst)</option>
                    <option value="Bot">Bot (General Purpose)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-foreground font-medium mb-1">
                    Max Steps Execution
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={formData.max_steps || 30}
                    onChange={(e) => setFormData({ ...formData, max_steps: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-manus-accent/20 focus:border-manus-accent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief summary of agent capabilities and operational scope..."
                  className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-manus-accent/20 focus:border-manus-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">
                  System Prompt Instructions *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="You are an autonomous agent specialized in..."
                  className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-manus-accent/20 focus:border-manus-accent font-mono text-[11px] leading-relaxed resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-2">
                  Scoped Available Tools
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {tools.map((t) => {
                    const isSelected = formData.tools.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleToggleTool(t.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-manus-accent/10 border-manus-accent/40 text-manus-accent font-medium shadow-sm"
                            : "bg-background border-border text-muted-foreground hover:border-slate-400 dark:hover:border-slate-700"
                        }`}
                      >
                        <span className="font-mono text-[11px] truncate">{t.name}</span>
                        {isSelected && <Check size={14} className="text-manus-accent flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-4 shadow-sm"
                >
                  {editingAgentId ? "Update Agent" : "Save Agent"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
