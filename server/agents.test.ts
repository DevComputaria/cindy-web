// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildAgentArguments, parseAgentLine, parseAgentSessionId } from './agents.js';

describe('agent event parsers', () => {
  it('extracts Codex agent messages', () => {
    expect(parseAgentLine('codex', JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'feito' } }))).toBe('feito');
  });

  it('extracts Claude result events', () => {
    expect(parseAgentLine('claude', JSON.stringify({ type: 'result', result: 'concluído' }))).toBe('concluído');
  });

  it('retains native session identities for later turns', () => {
    expect(parseAgentSessionId('codex', JSON.stringify({ type: 'thread.started', thread_id: 'thread-1' }))).toBe('thread-1');
    expect(parseAgentSessionId('claude', JSON.stringify({ type: 'system', session_id: 'session-1' }))).toBe('session-1');
  });

  it('resumes Codex instead of starting an isolated second turn', () => {
    expect(buildAgentArguments('codex', 'continue', 'thread-1')).toEqual([
      'exec', 'resume', '--json', '--skip-git-repo-check', 'thread-1', 'continue',
    ]);
  });
});
