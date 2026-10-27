// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CindyDatabase } from './database.js';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('CindyDatabase', () => {
  it('persists tasks and messages across runtime instances', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cindy-web-db-'));
    directories.push(directory);
    const path = join(directory, 'state.sqlite3');
    const timestamp = new Date().toISOString();
    const first = new CindyDatabase(path);
    first.createTask({ id: 'task-1', title: 'Persistente', project: 'repo', cwd: directory, agent: 'codex', nativeSessionId: null, createdAt: timestamp, updatedAt: timestamp, archived: false });
    first.addMessage({ id: 'message-1', taskId: 'task-1', role: 'user', content: 'Continue trabalhando', createdAt: timestamp, pending: false, error: false });
    first.setNativeSession('task-1', 'native-session-1');
    first.close();

    const reopened = new CindyDatabase(path);
    const [task] = reopened.listTasks();
    expect(task.title).toBe('Persistente');
    expect(task.messages[0].content).toBe('Continue trabalhando');
    expect(task.nativeSessionId).toBe('native-session-1');
    expect(reopened.updateTask('task-1', { agent: 'claude' })?.nativeSessionId).toBeNull();
    reopened.close();
  });
});
