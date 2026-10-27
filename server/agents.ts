import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { AgentKind } from './types.js';

export interface AgentDescriptor {
  id: AgentKind;
  label: string;
  command: string;
  available: boolean;
}

const commands: Record<AgentKind, string> = {
  codex: process.env.CINDY_CODEX_COMMAND || 'codex',
  claude: process.env.CINDY_CLAUDE_COMMAND || 'claude',
  hermes: process.env.CINDY_HERMES_COMMAND || 'hermes',
};

export function agentCatalog(): AgentDescriptor[] {
  return (
    [
      ['codex', 'Codex'],
      ['claude', 'Claude Code'],
      ['hermes', 'Hermes'],
    ] as const
  ).map(([id, label]) => ({
    id,
    label,
    command: commands[id],
    available: commandAvailable(commands[id]),
  }));
}

function commandAvailable(command: string): boolean {
  const result = spawnSync(command, ['--version'], { shell: false, stdio: 'ignore', timeout: 2_000 });
  return !result.error;
}

export function buildAgentArguments(agent: AgentKind, prompt: string, sessionId: string | null): string[] {
  if (agent === 'codex')
    return sessionId
      ? ['exec', 'resume', '--json', '--skip-git-repo-check', sessionId, prompt]
      : ['exec', '--json', '--skip-git-repo-check', prompt];
  if (agent === 'claude')
    return sessionId
      ? ['-p', '--resume', sessionId, '--verbose', '--output-format', 'stream-json', prompt]
      : ['-p', '--verbose', '--output-format', 'stream-json', prompt];
  const template = process.env.CINDY_HERMES_ARGS;
  if (template)
    return JSON.parse(template).map((part: unknown) =>
      String(part)
        .replaceAll('{prompt}', prompt)
        .replaceAll('{session}', sessionId ?? ''),
    );
  return ['chat', '--prompt', prompt];
}

export function startAgent(
  agent: AgentKind,
  cwd: string,
  prompt: string,
  sessionId: string | null,
): ChildProcessWithoutNullStreams {
  const child = spawn(commands[agent], buildAgentArguments(agent, prompt, sessionId), {
    cwd,
    shell: false,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  child.stdin.end();
  return child;
}

export function parseAgentLine(agent: AgentKind, line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const event = JSON.parse(trimmed) as Record<string, unknown>;
    if (agent === 'codex') {
      const item = event.item as Record<string, unknown> | undefined;
      if (event.type === 'item.completed' && item?.type === 'agent_message' && typeof item.text === 'string')
        return item.text;
      if (event.type === 'error' && typeof event.message === 'string') return `\n[Codex] ${event.message}`;
      return null;
    }
    if (agent === 'claude') {
      if (event.type === 'result' && typeof event.result === 'string') return event.result;
      const message = event.message as { content?: Array<{ type?: string; text?: string }> } | undefined;
      if (event.type === 'assistant' && Array.isArray(message?.content)) {
        return message.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text ?? '')
          .join('');
      }
      return null;
    }
    if (typeof event.text === 'string') return event.text;
    if (typeof event.content === 'string') return event.content;
  } catch {
    if (agent === 'hermes') return `${line}\n`;
  }
  return null;
}

export function parseAgentSessionId(agent: AgentKind, line: string): string | null {
  try {
    const event = JSON.parse(line) as Record<string, unknown>;
    if (agent === 'codex' && event.type === 'thread.started' && typeof event.thread_id === 'string')
      return event.thread_id;
    if (agent === 'claude' && typeof event.session_id === 'string') return event.session_id;
    if (agent === 'hermes' && typeof event.session_id === 'string') return event.session_id;
  } catch {
    /* Plain text output has no session identity. */
  }
  return null;
}
