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