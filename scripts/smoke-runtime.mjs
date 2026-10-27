import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixture = join(root, 'scripts', 'fixtures', 'fake-codex.mjs');
const dataRoot = await mkdtemp(join(tmpdir(), 'cindy-web-smoke-'));
const port = 44000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
let runtime;

function startRuntime() {
  const child = spawn(process.execPath, ['server-dist/index.js'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CINDY_WEB_PORT: String(port),
      CINDY_WEB_DATA_DIR: dataRoot,
      CINDY_CODEX_COMMAND: fixture,
      CINDY_CLAUDE_COMMAND: '__missing_claude__',
      CINDY_HERMES_COMMAND: '__missing_hermes__',
    },
  });
  let diagnostics = '';
  child.stdout.on('data', (chunk) => (diagnostics += chunk));
  child.stderr.on('data', (chunk) => (diagnostics += chunk));
  child.diagnostics = () => diagnostics;
  return child;
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return response.json();
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Runtime did not become healthy.\n${runtime?.diagnostics() ?? ''}`);
}

async function stopRuntime() {
  if (!runtime || runtime.exitCode !== null) return;
  runtime.kill('SIGTERM');
  await Promise.race([
    new Promise((resolveExit) => runtime.once('exit', resolveExit)),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Runtime did not stop.')), 5000)),
  ]);
}

async function json(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

async function waitForAssistant(taskId, expected) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const { body } = await json('/api/tasks');
    const task = body.tasks.find((candidate) => candidate.id === taskId);
    const assistant = task.messages.filter((message) => message.role === 'assistant').at(-1);
    if (assistant && !assistant.pending) {
      assert.equal(assistant.content, expected);
      return task;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Agent response did not finish.\n${runtime?.diagnostics() ?? ''}`);
}

try {
  runtime = startRuntime();
  const health = await waitForHealth();
  assert.equal(health.ok, true);
  assert.equal(health.agents.find((agent) => agent.id === 'codex').available, true);

  const forbidden = await fetch(`${baseUrl}/api/tasks`, { headers: { Origin: 'https://example.test' } });
  assert.equal(forbidden.status, 403, 'external browser origins must be rejected');

  const created = await json('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify({ cwd: root, agent: 'codex', project: 'smoke' }),
  });
  assert.equal(created.response.status, 201);
  const taskId = created.body.task.id;

  const first = await json(`/api/tasks/${taskId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify({ content: 'primeiro turno' }),
  });
  assert.equal(first.response.status, 202);
  const firstTask = await waitForAssistant(taskId, 'started:primeiro turno');
  assert.equal(firstTask.nativeSessionId, 'smoke-thread');

  await json(`/api/tasks/${taskId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify({ content: 'segundo turno' }),
  });
  await waitForAssistant(taskId, 'resumed:segundo turno');

  await stopRuntime();
  runtime = startRuntime();
  await waitForHealth();
  const persisted = await json('/api/tasks');
  assert.equal(persisted.body.tasks[0].messages.length, 4);
  assert.equal(persisted.body.tasks[0].nativeSessionId, 'smoke-thread');
  console.log('Runtime smoke test passed: API, origin guard, agent resume and SQLite restart persistence.');
} finally {
  await stopRuntime().catch(() => runtime?.kill('SIGKILL'));
  await rm(dataRoot, { recursive: true, force: true });
}
