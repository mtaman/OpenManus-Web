"use client";

import React, { useState, useEffect } from "react";
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
  X
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
      setAgents(ag);
      setTools(tl);
      setExtensions(ex);
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
        return <Code2 className="h-5 w-5 text-cyan-400" />;
      case "search":
        return <Search className="h-5 w-5 text-amber-400" />;
      case "barchart3":
        return <BarChart3 className="h-5 w-5 text-purple-400" />;
      case "sparkles":
        return <Sparkles className="h-5 w-5 text-emerald-400" />;
      default:
        return <Bot className="h-5 w-5 text-emerald-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Header Bar */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100">Sovereign Stores & Capabilities</h1>
            <p className="text-xs text-slate-400">Autonomous Agents, Tool Catalog & Extensible MCP Protocols</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading} className="text-xs">
            <RefreshCw size={13} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {activeTab === "agents" && (
            <Button size="sm" onClick={handleOpenCreateModal} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
              <Plus size={14} className="mr-1.5" />
              New Agent
            </Button>
          )}
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/30">
        <button
          onClick={() => setActiveTab("agents")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "agents"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bot size={15} />
          <span>Agents Hub ({agents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "tools"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Wrench size={15} />
          <span>Tools Catalog ({tools.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("extensions")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "extensions"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Puzzle size={15} />
          <span>Extensions & MCP ({extensions.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tab 1: Agents */}
        {activeTab === "agents" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((ag) => (
              <div
                key={ag.id}
                className="flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                        {renderAgentIcon(ag.icon)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">{ag.name}</h3>
                        <span className="text-[11px] text-emerald-400 font-mono">{ag.role || "Autonomous Agent"}</span>
                      </div>
                    </div>
                    {ag.is_builtin ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                        BUILT-IN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        CUSTOM
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                    {ag.description || "Custom configured autonomous specialist."}
                  </p>

                  <div className="mb-4">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-1.5">
                      Scoped Tools
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {ag.tools.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-300 font-mono border border-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {!ag.is_builtin && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(ag)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
                          title="Edit Agent"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteAgent(ag.id)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
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
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 h-7"
                  >
                    <span>Start Chat</span>
                    <ArrowRight size={12} className="ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Tools */}
        {activeTab === "tools" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tl) => (
              <div key={tl.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Terminal size={15} className="text-emerald-400" />
                      <h3 className="text-sm font-semibold text-slate-100">{tl.name}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
                      {tl.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{tl.description}</p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Safety Level:</span>
                  <span
                    className={`font-semibold ${
                      tl.safety_level === "safe"
                        ? "text-emerald-400"
                        : tl.safety_level === "read_only"
                        ? "text-cyan-400"
                        : "text-amber-400"
                    }`}
                  >
                    {tl.safety_level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Extensions & MCP */}
        {activeTab === "extensions" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extensions.map((ex) => (
              <div key={ex.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cpu size={16} className="text-cyan-400" />
                      <h3 className="text-sm font-semibold text-slate-100">{ex.name}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      {ex.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{ex.description}</p>
                </div>
                {ex.command && (
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80 text-[11px] font-mono text-slate-300 truncate select-all">
                    $ {ex.command}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Agent */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-100">
                {editingAgentId ? "Edit Custom Agent" : "Create New Custom Agent"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. SEO Optimizer"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Role Title</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Senior SEO Strategist"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief summary of agent scope..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">System Prompt Instructions</label>
                <textarea
                  required
                  rows={4}
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="You are an autonomous agent specialized in..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px] leading-relaxed resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-2">Scoped Tools</label>
                <div className="grid grid-cols-2 gap-2">
                  {tools.map((t) => {
                    const isSelected = formData.tools.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleToggleTool(t.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-left transition ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <span className="font-mono text-[11px]">{t.name}</span>
                        {isSelected && <Check size={13} className="text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">
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
