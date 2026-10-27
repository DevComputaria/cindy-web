import { describe, expect, it } from 'vitest';
import {
  defaultPreferences,
  loadPreferences,
  normalizePreferences,
  savePreferences,
  STORAGE_KEY,
} from './store';

describe('normalizePreferences', () => {
  it('recovers malformed browser data', () => expect(normalizePreferences(null)).toEqual(defaultPreferences));
  it('rejects unknown agent and theme values', () => {
    expect(normalizePreferences({ defaultAgent: 'other', theme: 'neon' })).toEqual(defaultPreferences);
  });

  it('persists and reloads valid presentation preferences', () => {
    const preferences = { theme: 'dark' as const, defaultAgent: 'claude' as const, displayName: 'Ada' };
    savePreferences(preferences);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(preferences));
    expect(loadPreferences()).toEqual(preferences);
  });

  it('recovers invalid JSON from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid');
    expect(loadPreferences()).toEqual(defaultPreferences);
  });
});
