import { AgentManifest, ToolDefinition, ExtensionDefinition, AgentUpsertPayload } from "./types";

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  project_id: string;
  title: string;
  job_id: string;
  prompt: string;
  agent_id?: string;
  created_at: string;
  updated_at: string;
  status: string;
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch("/api/chats/projects");
  if (!res.ok) return [];
  const data = await res.json();
  return data.projects || [];
}

export async function fetchChats(projectId?: string): Promise<ChatSession[]> {
  const url = projectId ? `/api/chats?project_id=${projectId}` : "/api/chats";
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.chats || [];
}

export async function deleteAllChats(): Promise<boolean> {
  const res = await fetch("/api/chats/all", { method: "DELETE" });
  return res.ok;
}

// ==========================================
// Stores & Extensions API Client Methods
// ==========================================
export async function fetchStoreAgents(): Promise<AgentManifest[]> {
  const res = await fetch("/api/store/agents");
  if (!res.ok) return [];
  const data = await res.json();
  return data.agents || [];
}

export async function fetchStoreAgent(agentId: string): Promise<AgentManifest | null> {
  const res = await fetch(`/api/store/agents/${encodeURIComponent(agentId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.agent || null;
}

export async function createStoreAgent(payload: AgentUpsertPayload): Promise<AgentManifest | null> {
  const res = await fetch("/api/store/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.agent || null;
}

export async function updateStoreAgent(agentId: string, payload: AgentUpsertPayload): Promise<AgentManifest | null> {
  const res = await fetch(`/api/store/agents/${encodeURIComponent(agentId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.agent || null;
}

export async function deleteStoreAgent(agentId: string): Promise<boolean> {
  const res = await fetch(`/api/store/agents/${encodeURIComponent(agentId)}`, {
    method: "DELETE"
  });
  return res.ok;
}

export async function fetchStoreTools(): Promise<ToolDefinition[]> {
  const res = await fetch("/api/store/tools");
  if (!res.ok) return [];
  const data = await res.json();
  return data.tools || [];
}

export async function fetchStoreExtensions(): Promise<ExtensionDefinition[]> {
  const res = await fetch("/api/store/extensions");
  if (!res.ok) return [];
  const data = await res.json();
  return data.extensions || [];
}
