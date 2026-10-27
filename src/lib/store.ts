import type { AppState, Preferences, Task } from '../types';

export const STORAGE_KEY = 'cindy-web:v1';

export const defaultPreferences: Preferences = {
  theme: 'system',
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4.1-mini',
  displayName: 'Você',
};

export const defaultState: AppState = {
  version: 1,
  tasks: [],
  activeTaskId: null,
  preferences: defaultPreferences,
};

export function createTask(project = 'Meu espaço'): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: 'Nova tarefa',
    project,
    createdAt: now,
    updatedAt: now,
    archived: false,
    messages: [],
  };
}

export function normalizeState(value: unknown): AppState {
  if (!value || typeof value !== 'object') return defaultState;
  const candidate = value as Partial<AppState>;
  const tasks = Array.isArray(candidate.tasks)
    ? candidate.tasks.filter((task): task is Task => Boolean(task && typeof task.id === 'string'))
    : [];
  const preferences = { ...defaultPreferences, ...(candidate.preferences ?? {}) };
  const activeTaskId = tasks.some((task) => task.id === candidate.activeTaskId)
    ? (candidate.activeTaskId ?? null)
    : null;
  return { version: 1, tasks, activeTaskId, preferences };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : defaultState;
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
