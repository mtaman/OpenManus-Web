"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Folder, Plus, Trash2, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchProjects, createProject, deleteProject, Project } from "@/lib/chatsApi";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data || []);
    } catch (e) {
      console.error("Error loading projects", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    try {
      const created = await createProject(nameInput.trim(), descInput.trim());
      if (created) {
        setNameInput("");
        setDescInput("");
        setIsModalOpen(false);
        loadProjects();
        window.dispatchEvent(new CustomEvent("omweb:refresh-sidebar"));
      }
    } catch (err) {
      console.error("Failed to create project", err);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project workspace and all its associated data?")) return;
    try {
      const ok = await deleteProject(projectId);
      if (ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        window.dispatchEvent(new CustomEvent("omweb:refresh-sidebar"));
      }
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  // Exclude internal default_project from visible workspaces list
  const displayProjects = projects.filter((p) => p.id !== "default_project");

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-background text-foreground overflow-hidden font-sans">
      <div className="h-14 flex items-center justify-between px-8 border-b border-border bg-card/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Folder className="h-5 w-5 text-primary" />
          <h1 className="font-heading font-semibold text-sm text-foreground">Projects Workspace</h1>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 h-8 px-3.5 rounded-md bg-primary text-primary-foreground text-xs font-medium transition shadow-xs cursor-pointer"
        >
          <Plus size={14} />
          <span>New Project</span>
        </Button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-background">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-xs animate-pulse font-mono">
            Loading workspaces from storage...
          </div>
        ) : displayProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-center text-muted-foreground">
              <Folder size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No custom projects created yet.</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-primary hover:underline mt-1 cursor-pointer"
              >
                Create your first project workspace
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProjects.map((proj) => (
              <div
                key={proj.id}
                className="flex flex-col justify-between p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all group shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-primary uppercase tracking-wider font-mono font-semibold">
                      {proj.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(proj.id)}
                      className="text-muted-foreground hover:text-destructive transition p-1 cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <h3 className="text-xs font-semibold text-foreground group-hover:text-primary transition font-heading">
                    {proj.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-sans">
                    {proj.description || "No description provided."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border mt-6 text-xs">
                  <span className="text-muted-foreground text-[11px] flex items-center gap-1 font-mono">
                    <Calendar size={11} /> {proj.created_at?.split(" ")[0] || "Recent"}
                  </span>
                  <Link
                    href={`/projects/${proj.id}`}
                    className="flex items-center gap-1 text-primary hover:underline font-medium transition-all"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="text-sm font-semibold font-heading text-foreground">Create New Project</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-medium">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SEO Audit Engine"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background text-xs border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-sans"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1 font-medium">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Goals and context for this workspace..."
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background text-xs border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none shadow-xs font-sans"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs px-4 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}