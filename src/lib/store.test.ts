import { describe, expect, it } from 'vitest';
import { defaultPreferences, normalizePreferences } from './store';

describe('normalizePreferences', () => {
  it('recovers malformed browser data', () => expect(normalizePreferences(null)).toEqual(defaultPreferences));
  it('rejects unknown agent and theme values', () => {
    expect(normalizePreferences({ defaultAgent: 'other', theme: 'neon' })).toEqual(defaultPreferences);
  });
});
