import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { statSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { agentCatalog, parseAgentLine, parseAgentSessionId, startAgent } from './agents.js';
import { CindyDatabase } from './database.js';
import type { RunEvent, StoredMessage } from './types.js';

interface ActiveRun {
  id: string;
  taskId: string;
  messageId: string;
  child: ChildProcessWithoutNullStreams;
  interrupted: boolean;
  output: string;
  stderr: string;
}

export class AgentRuntime {
  private readonly active = new Map<string, ActiveRun>();
  private readonly subscribers = new Map<string, Set<(event: RunEvent) => void>>();

  constructor(readonly db: CindyDatabase) {}

  catalog() { return agentCatalog(); }
  isRunning(taskId: string) { return this.active.has(taskId); }

  subscribe(taskId: string, listener: (event: RunEvent) => void): () => void {
    const listeners = this.subscribers.get(taskId) ?? new Set();
    listeners.add(listener);
    this.subscribers.set(taskId, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.subscribers.delete(taskId);
    };
  }

  async send(taskId: string, content: string): Promise<{ user: StoredMessage; assistant: StoredMessage }> {
    const task = this.db.getTask(taskId);
    if (!task) throw new Error('TASK_NOT_FOUND');
    if (this.active.has(taskId)) throw new Error('TASK_BUSY');
    try {
      if (!isAbsolute(task.cwd) || !statSync(task.cwd).isDirectory()) throw new Error('WORKDIR_UNAVAILABLE');
    } catch {
      throw new Error('WORKDIR_UNAVAILABLE');
    }
    const descriptor = this.catalog().find((item) => item.id === task.agent);
    if (!descriptor?.available) throw new Error('AGENT_UNAVAILABLE');

    const child = startAgent(task.agent, task.cwd, content, task.nativeSessionId);
    const createdAt = new Date().toISOString();
    const user = this.db.addMessage({ id: randomUUID(), taskId, role: 'user', content, createdAt, pending: false, error: false });
    const assistant = this.db.addMessage({ id: randomUUID(), taskId, role: 'assistant', content: '', createdAt: new Date(Date.now() + 1).toISOString(), pending: true, error: false });
    if (task.title === 'Nova tarefa') this.db.updateTask(taskId, { title: content.slice(0, 48) || 'Nova tarefa' });
    this.emit(taskId, { type: 'message', taskId, data: user });
    this.emit(taskId, { type: 'message', taskId, data: assistant });

    const run: ActiveRun = { id: randomUUID(), taskId, messageId: assistant.id, child, interrupted: false, output: '', stderr: '' };
    this.active.set(taskId, run);
    this.db.createRun({ id: run.id, taskId, agent: task.agent, pid: child.pid ?? 0, command: descriptor.command, startedAt: new Date().toISOString() });
    this.emit(taskId, { type: 'run', taskId, data: { status: 'running', agent: task.agent, pid: child.pid } });

    let stdoutBuffer = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? '';
      for (const line of lines) this.consumeLine(run, task.agent, line);
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => { run.stderr = (run.stderr + chunk).slice(-8_000); });
    child.on('error', (error) => this.finalize(run, 'failed', null, error.message));
    child.on('close', (code, signal) => {
      if (stdoutBuffer) this.consumeLine(run, task.agent, stdoutBuffer);
      const status = run.interrupted ? 'interrupted' : code === 0 ? 'completed' : 'failed';
      const error = status === 'failed' ? run.stderr.trim() || `Agent exited with ${signal ?? code}.` : undefined;
      this.finalize(run, status, code, error);
    });
    return { user, assistant };
  }

  interrupt(taskId: string): boolean {
    const run = this.active.get(taskId);
    if (!run) return false;
    run.interrupted = true;
    run.child.kill('SIGINT');
    const timer = setTimeout(() => { if (this.active.get(taskId) === run) run.child.kill('SIGTERM'); }, 3_000);
    timer.unref();
    return true;
  }

  async shutdown(): Promise<void> {
    const runs = [...this.active.values()];
    await Promise.all(runs.map((run) => new Promise<void>((resolve) => {
      run.child.once('close', () => resolve());
      this.interrupt(run.taskId);
      const timeout = setTimeout(() => {
        if (this.active.get(run.taskId) === run) run.child.kill('SIGKILL');
        resolve();
      }, 5_000);
      timeout.unref();
    })));
  }

  private consumeLine(run: ActiveRun, agent: 'codex' | 'claude' | 'hermes', line: string): void {
    const sessionId = parseAgentSessionId(agent, line);
    if (sessionId) this.db.setNativeSession(run.taskId, sessionId);
    const text = parseAgentLine(agent, line);
    if (!text) return;
    if ((agent === 'codex' || agent === 'claude') && run.output && text.startsWith(run.output)) run.output = text;
    else run.output += text;
    this.db.updateMessage(run.messageId, { content: run.output });
    this.emit(run.taskId, { type: 'message', taskId: run.taskId, data: { id: run.messageId, content: run.output, pending: true, error: false } });
  }

  private finalize(run: ActiveRun, status: 'completed' | 'failed' | 'interrupted', code: number | null, error?: string): void {
    if (this.active.get(run.taskId) !== run) return;
    this.active.delete(run.taskId);
    const content = run.output || (status === 'interrupted' ? 'Execução interrompida.' : error || 'O agente terminou sem produzir texto.');
    this.db.updateMessage(run.messageId, { content, pending: false, error: status === 'failed' });
    this.db.finishRun(run.id, status, code, error);
    this.emit(run.taskId, { type: 'message', taskId: run.taskId, data: { id: run.messageId, content, pending: false, error: status === 'failed' } });
    this.emit(run.taskId, { type: 'run', taskId: run.taskId, data: { status, exitCode: code, error } });
  }

  private emit(taskId: string, event: RunEvent): void {
    for (const listener of this.subscribers.get(taskId) ?? []) listener(event);
  }
}
