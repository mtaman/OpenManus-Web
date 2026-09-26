"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Folder, Plus, Trash2, Calendar, MessageSquare, ArrowRight } from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/chats/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error("Error loading projects", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    try {
      const res = await fetch("/api/chats/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim(), description: descInput.trim() })
      });
      if (res.ok) {
        setNameInput("");
        setDescInput("");
        setIsModalOpen(false);
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project and all its chats?")) return;
    try {
      await fetch(`/api/chats/projects/${projectId}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <div className="h-16 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <Folder className="h-5 w-5 text-emerald-400" />
            <h1 className="font-bold text-base text-slate-100">Projects Workspace</h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow"
          >
            <Plus size={14} />
            <span>New Project</span>
          </button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto bg-slate-950">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs animate-pulse">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500 space-y-3">
              <Folder size={40} className="text-slate-600" />
              <p className="text-sm font-medium">No projects created yet.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-emerald-400 hover:underline"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="flex flex-col justify-between p-5 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition group shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono font-semibold">
                        {proj.id}
                      </span>
                      <button
                        onClick={() => handleDelete(proj.id)}
                        className="text-slate-500 hover:text-rose-400 transition p-1"
                        title="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {proj.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-6 text-xs">
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Calendar size={11} /> {proj.created_at?.split(" ")[0] || "Recent"}
                    </span>
                    <Link
                      href={`/projects/${proj.id}`}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h2 className="text-sm font-bold text-slate-100">Create New Project</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weather App Microservice"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 text-xs border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Goals and requirements for this workspace..."
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 text-xs border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
