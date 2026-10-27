import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AgentKind, StoredMessage, StoredTask } from './types.js';

function asBoolean(value: unknown): boolean {
  return Number(value) === 1;
}

const migrations = [
  {
    version: 1,
    name: 'initial-runtime-schema',
    sql: `
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        project TEXT NOT NULL,
        cwd TEXT NOT NULL,
        agent TEXT NOT NULL CHECK(agent IN ('codex', 'claude', 'hermes')),
        native_session_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        pending INTEGER NOT NULL DEFAULT 0,
        error INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        agent TEXT NOT NULL,
        pid INTEGER,
        status TEXT NOT NULL,
        command TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        exit_code INTEGER,
        error TEXT
      );
    `,
  },
  {
    version: 2,
    name: 'runtime-query-indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS messages_task_created ON messages(task_id, created_at);
      CREATE INDEX IF NOT EXISTS runs_task_started ON runs(task_id, started_at);
    `,
  },
] as const;

export class CindyDatabase {
  readonly database: DatabaseSync;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.database = new DatabaseSync(path);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    // Databases created before the migration ledger already have this column.
    const taskColumns = this.database.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>;
    if (taskColumns.length > 0 && !taskColumns.some((column) => column.name === 'native_session_id')) {
      this.database.exec('ALTER TABLE tasks ADD COLUMN native_session_id TEXT');
    }
    this.applyMigrations();
    this.database.exec(
      "UPDATE runs SET status = 'interrupted', ended_at = datetime('now'), error = 'Runtime restarted while this execution was active.' WHERE status = 'running'",
    );
  }

  listTasks(): Array<StoredTask & { messages: StoredMessage[] }> {
    const rows = this.database.prepare('SELECT * FROM tasks ORDER BY updated_at DESC').all() as Record<
      string,
      unknown
    >[];
    return rows.map((row) => ({ ...this.mapTask(row), messages: this.listMessages(String(row.id)) }));
  }

  getTask(id: string): StoredTask | null {
    const row = this.database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as
      Record<string, unknown> | undefined;
    return row ? this.mapTask(row) : null;
  }

  createTask(task: StoredTask): StoredTask {
    this.database
      .prepare(
        'INSERT INTO tasks (id,title,project,cwd,agent,native_session_id,created_at,updated_at,archived) VALUES (?,?,?,?,?,?,?,?,?)',
      )
      .run(
        task.id,
        task.title,
        task.project,
        task.cwd,
        task.agent,
        task.nativeSessionId,
        task.createdAt,
        task.updatedAt,
        task.archived ? 1 : 0,
      );
    return task;
  }

  updateTask(
    id: string,
    patch: Partial<Pick<StoredTask, 'title' | 'project' | 'cwd' | 'agent' | 'archived'>>,
  ): StoredTask | null {
    const task = this.getTask(id);
    if (!task) return null;
    const resetsSession =
      (patch.agent !== undefined && patch.agent !== task.agent) ||
      (patch.cwd !== undefined && patch.cwd !== task.cwd);
    const next = {
      ...task,
      ...patch,
      nativeSessionId: resetsSession ? null : task.nativeSessionId,
      updatedAt: new Date().toISOString(),
    };
    this.database
      .prepare(
        'UPDATE tasks SET title=?,project=?,cwd=?,agent=?,native_session_id=?,updated_at=?,archived=? WHERE id=?',
      )
      .run(
        next.title,
        next.project,
        next.cwd,
        next.agent,
        next.nativeSessionId,
        next.updatedAt,
        next.archived ? 1 : 0,
        id,
      );
    return next;
  }

  deleteTask(id: string): boolean {
    return this.database.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0;
  }

  setNativeSession(id: string, nativeSessionId: string): void {
    this.database
      .prepare('UPDATE tasks SET native_session_id=?,updated_at=? WHERE id=?')
      .run(nativeSessionId, new Date().toISOString(), id);
  }

  listMessages(taskId: string): StoredMessage[] {
    const rows = this.database
      .prepare('SELECT * FROM messages WHERE task_id = ? ORDER BY created_at, rowid')
      .all(taskId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      taskId: String(row.task_id),
      role: row.role as StoredMessage['role'],
      content: String(row.content),
      createdAt: String(row.created_at),
      pending: asBoolean(row.pending),
      error: asBoolean(row.error),
    }));
  }

  addMessage(message: StoredMessage): StoredMessage {
    this.database
      .prepare(
        'INSERT INTO messages (id,task_id,role,content,created_at,pending,error) VALUES (?,?,?,?,?,?,?)',
      )
      .run(
        message.id,
        message.taskId,
        message.role,
        message.content,
        message.createdAt,
        message.pending ? 1 : 0,
        message.error ? 1 : 0,
      );
    this.touchTask(message.taskId);
    return message;
  }

  updateMessage(id: string, patch: Partial<Pick<StoredMessage, 'content' | 'pending' | 'error'>>): void {
    const row = this.database.prepare('SELECT * FROM messages WHERE id = ?').get(id) as
      Record<string, unknown> | undefined;
    if (!row) return;
    this.database
      .prepare('UPDATE messages SET content=?,pending=?,error=? WHERE id=?')
      .run(
        patch.content ?? String(row.content),
        patch.pending === undefined ? Number(row.pending) : patch.pending ? 1 : 0,
        patch.error === undefined ? Number(row.error) : patch.error ? 1 : 0,
        id,
      );
    this.touchTask(String(row.task_id));
  }

  createRun(run: {
    id: string;
    taskId: string;
    agent: AgentKind;
    pid: number;
    command: string;
    startedAt: string;
  }): void {
    this.database
      .prepare('INSERT INTO runs (id,task_id,agent,pid,status,command,started_at) VALUES (?,?,?,?,?,?,?)')
      .run(run.id, run.taskId, run.agent, run.pid, 'running', run.command, run.startedAt);
  }

  finishRun(
    id: string,
    status: 'completed' | 'failed' | 'interrupted',
    exitCode: number | null,
    error?: string,
  ): void {
    this.database
      .prepare('UPDATE runs SET status=?,ended_at=?,exit_code=?,error=? WHERE id=?')
      .run(status, new Date().toISOString(), exitCode, error ?? null, id);
  }

  close(): void {
    this.database.close();
  }

  private applyMigrations(): void {
    const applied = this.database.prepare('SELECT 1 FROM schema_migrations WHERE version = ?');
    const record = this.database.prepare(
      'INSERT INTO schema_migrations (version,name,applied_at) VALUES (?,?,?)',
    );
    for (const migration of migrations) {
      if (applied.get(migration.version)) continue;
      this.database.exec('BEGIN IMMEDIATE');
      try {
        this.database.exec(migration.sql);
        record.run(migration.version, migration.name, new Date().toISOString());
        this.database.exec('COMMIT');
      } catch (error) {
        this.database.exec('ROLLBACK');
        throw error;
      }
    }
  }

  private touchTask(id: string): void {
    this.database.prepare('UPDATE tasks SET updated_at=? WHERE id=?').run(new Date().toISOString(), id);
  }

  private mapTask(row: Record<string, unknown>): StoredTask {
    return {
      id: String(row.id),
      title: String(row.title),
      project: String(row.project),
      cwd: String(row.cwd),
      agent: row.agent as AgentKind,
      nativeSessionId: typeof row.native_session_id === 'string' ? row.native_session_id : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      archived: asBoolean(row.archived),
    };
  }
}
