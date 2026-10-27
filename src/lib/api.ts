import type { AgentKind, RuntimeHealth, Task } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `Runtime local respondeu ${response.status}.`);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const localApi = {
  health: () => request<RuntimeHealth>('/api/health'),
  tasks: async () => (await request<{ tasks: Task[] }>('/api/tasks')).tasks,
  createTask: async (input: { cwd: string; project?: string; agent: AgentKind }) => (await request<{ task: Task }>('/api/tasks', { method: 'POST', body: JSON.stringify(input) })).task,
  updateTask: async (id: string, patch: Partial<Pick<Task, 'title' | 'project' | 'cwd' | 'agent' | 'archived'>>) =>
    (await request<{ task: Task }>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })).task,
  deleteTask: (id: string) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  send: (id: string, content: string) => request(`/api/tasks/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  interrupt: (id: string) => request(`/api/tasks/${id}/interrupt`, { method: 'POST', body: '{}' }),
};
