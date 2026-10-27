// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { agentCatalog, buildAgentArguments, parseAgentLine, parseAgentSessionId } from './agents.js';

afterEach(() => delete process.env.CINDY_HERMES_ARGS);

describe('agent event parsers', () => {
  it('extracts Codex agent messages', () => {
    expect(
      parseAgentLine(
        'codex',
        JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'feito' } }),
      ),
    ).toBe('feito');
  });

  it('extracts Claude result events', () => {
    expect(parseAgentLine('claude', JSON.stringify({ type: 'result', result: 'concluído' }))).toBe(
      'concluído',
    );
    expect(
      parseAgentLine(
        'claude',
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'parcial' }] } }),
      ),
    ).toBe('parcial');
  });

  it('retains native session identities for later turns', () => {
    expect(
      parseAgentSessionId('codex', JSON.stringify({ type: 'thread.started', thread_id: 'thread-1' })),
    ).toBe('thread-1');
    expect(parseAgentSessionId('claude', JSON.stringify({ type: 'system', session_id: 'session-1' }))).toBe(
      'session-1',
    );
  });

  it('resumes Codex instead of starting an isolated second turn', () => {
    expect(buildAgentArguments('codex', 'continue', 'thread-1')).toEqual([
      'exec',
      'resume',
      '--json',
      '--skip-git-repo-check',
      'thread-1',
      'continue',
    ]);
  });

  it('builds first and resumed Claude turns', () => {
    expect(buildAgentArguments('claude', 'hello', null)).toEqual([
      '-p',
      '--verbose',
      '--output-format',
      'stream-json',
      'hello',
    ]);
    expect(buildAgentArguments('claude', 'again', 'session-1')).toContain('session-1');
  });

  it('supports configurable Hermes arguments without shell interpolation', () => {
    expect(buildAgentArguments('hermes', 'hello', null)).toEqual(['chat', '--prompt', 'hello']);
    process.env.CINDY_HERMES_ARGS = '["run","{session}","{prompt}"]';
    expect(buildAgentArguments('hermes', 'literal; command', 'h-1')).toEqual([
      'run',
      'h-1',
      'literal; command',
    ]);
  });

  it('handles non-message output and Hermes plain text', () => {
    expect(parseAgentLine('codex', '')).toBeNull();
    expect(parseAgentLine('codex', JSON.stringify({ type: 'error', message: 'bad' }))).toBe('\n[Codex] bad');
    expect(parseAgentLine('codex', 'not json')).toBeNull();
    expect(parseAgentLine('hermes', 'plain')).toBe('plain\n');
    expect(parseAgentLine('hermes', JSON.stringify({ text: 'json text' }))).toBe('json text');
    expect(parseAgentLine('hermes', JSON.stringify({ content: 'json content' }))).toBe('json content');
    expect(parseAgentSessionId('hermes', JSON.stringify({ session_id: 'h-1' }))).toBe('h-1');
    expect(parseAgentSessionId('codex', 'plain')).toBeNull();
  });

  it('reports the three supported adapters', () => {
    expect(agentCatalog().map(({ id }) => id)).toEqual(['codex', 'claude', 'hermes']);
  });
});
