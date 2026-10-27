import { describe, expect, it } from 'vitest';
import { defaultPreferences, normalizeState } from './store';

describe('normalizeState', () => {
  it('recovers malformed browser data', () => {
    expect(normalizeState(null)).toMatchObject({ tasks: [], activeTaskId: null });
  });

  it('drops an active task that no longer exists and fills preference defaults', () => {
    const result = normalizeState({ tasks: [], activeTaskId: 'missing', preferences: { theme: 'dark' } });
    expect(result.activeTaskId).toBeNull();
    expect(result.preferences).toEqual({ ...defaultPreferences, theme: 'dark' });
  });
});
