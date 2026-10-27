// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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
    first.createTask({
      id: 'task-1',
      title: 'Persistente',
      project: 'repo',
      cwd: directory,
      agent: 'codex',
      nativeSessionId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      archived: false,
    });
    first.addMessage({
      id: 'message-1',
      taskId: 'task-1',
      role: 'user',
      content: 'Continue trabalhando',
      createdAt: timestamp,
      pending: false,
      error: false,
    });
    first.setNativeSession('task-1', 'native-session-1');
    first.close();

    const reopened = new CindyDatabase(path);
    const [task] = reopened.listTasks();
    expect(task.title).toBe('Persistente');
    expect(task.messages[0].content).toBe('Continue trabalhando');
    expect(task.nativeSessionId).toBe('native-session-1');
    expect(reopened.updateTask('task-1', { agent: 'claude' })?.nativeSessionId).toBeNull();
    expect(
      reopened.database.prepare('SELECT version, name FROM schema_migrations ORDER BY version').all(),
    ).toEqual([
      { version: 1, name: 'initial-runtime-schema' },
      { version: 2, name: 'runtime-query-indexes' },
    ]);
    reopened.close();
  });

  it('enforces foreign keys and cascades task deletion', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cindy-web-db-'));
    directories.push(directory);
    const database = new CindyDatabase(join(directory, 'state.sqlite3'));
    const timestamp = new Date().toISOString();
    database.createTask({
      id: 'task-1',
      title: 'Task',
      project: 'repo',
      cwd: directory,
      agent: 'codex',
      nativeSessionId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      archived: false,
    });
    database.addMessage({
      id: 'message-1',
      taskId: 'task-1',
      role: 'user',
      content: 'hello',
      createdAt: timestamp,
      pending: false,
      error: false,
    });

    expect(database.deleteTask('task-1')).toBe(true);
    expect(database.listMessages('task-1')).toEqual([]);
    database.close();
  });

  it('updates messages and records terminal run state', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cindy-web-db-'));
    directories.push(directory);
    const database = new CindyDatabase(join(directory, 'state.sqlite3'));
    const timestamp = new Date().toISOString();
    database.createTask({
      id: 'task-1',
      title: 'Task',
      project: 'repo',
      cwd: directory,
      agent: 'codex',
      nativeSessionId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      archived: false,
    });
    database.addMessage({
      id: 'message-1',
      taskId: 'task-1',
      role: 'assistant',
      content: '',
      createdAt: timestamp,
      pending: true,
      error: false,
    });
    database.updateMessage('message-1', { content: 'done', pending: false });
    database.updateMessage('missing', { content: 'ignored' });
    database.createRun({
      id: 'run-1',
      taskId: 'task-1',
      agent: 'codex',
      pid: 123,
      command: 'codex',
      startedAt: timestamp,
    });
    database.finishRun('run-1', 'completed', 0);

    expect(database.getTask('missing')).toBeNull();
    expect(database.listMessages('task-1')[0]).toMatchObject({ content: 'done', pending: false });
    expect(database.database.prepare('SELECT status, exit_code FROM runs WHERE id = ?').get('run-1')).toEqual(
      { status: 'completed', exit_code: 0 },
    );
    database.close();
  });

  it('upgrades a pre-ledger database and recovers orphaned runs', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cindy-web-db-'));
    directories.push(directory);
    const path = join(directory, 'state.sqlite3');
    const legacy = new DatabaseSync(path);
    legacy.exec(`
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, project TEXT NOT NULL, cwd TEXT NOT NULL,
        agent TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0
      );
    `);
    legacy.close();

    const database = new CindyDatabase(path);
    const columns = database.database.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>;
    expect(columns.some(({ name }) => name === 'native_session_id')).toBe(true);
    const timestamp = new Date().toISOString();
    database.createTask({
      id: 'task-1',
      title: 'Task',
      project: 'repo',
      cwd: directory,
      agent: 'codex',
      nativeSessionId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      archived: false,
    });
    database.createRun({
      id: 'run-1',
      taskId: 'task-1',
      agent: 'codex',
      pid: 123,
      command: 'codex',
      startedAt: timestamp,
    });
    database.close();

    const reopened = new CindyDatabase(path);
    expect(reopened.database.prepare('SELECT status FROM runs WHERE id = ?').get('run-1')).toEqual({
      status: 'interrupted',
    });
    reopened.close();
  });
});
