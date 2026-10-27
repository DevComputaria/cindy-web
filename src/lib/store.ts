import type { Preferences } from '../types';

export const STORAGE_KEY = 'cindy-web:ui:v2';

export const defaultPreferences: Preferences = {
  theme: 'system',
  defaultAgent: 'codex',
  displayName: 'Você',
};

export function normalizePreferences(value: unknown): Preferences {
  if (!value || typeof value !== 'object') return defaultPreferences;
  const candidate = value as Partial<Preferences>;
  const defaultAgent = candidate.defaultAgent === 'claude' || candidate.defaultAgent === 'hermes' ? candidate.defaultAgent : 'codex';
  const theme = candidate.theme === 'light' || candidate.theme === 'dark' ? candidate.theme : 'system';
  return { ...defaultPreferences, ...candidate, theme, defaultAgent };
}

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizePreferences(JSON.parse(raw)) : defaultPreferences;
  } catch { return defaultPreferences; }
}

export function savePreferences(preferences: Preferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
