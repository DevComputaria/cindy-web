import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { extname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CindyDatabase } from './database.js';
import { AgentRuntime } from './runtime.js';
import type { AgentKind, StoredTask } from './types.js';

const host = '127.0.0.1';
const port = Number(process.env.CINDY_WEB_PORT || 4317);
const serverRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectRoot = serverRoot;
const distRoot = join(projectRoot, 'dist');
const dataRoot = process.env.CINDY_WEB_DATA_DIR || defaultDataDirectory();
const db = new CindyDatabase(join(dataRoot, 'cindy-web.sqlite3'));
const runtime = new AgentRuntime(db);

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${host}:${port}`);
    if (url.pathname.startsWith('/api/')) {
      assertLocalOrigin(request);
      await handleApi(request, response, url);
      return;
    }
    serveStatic(response, url.pathname);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status = message === 'NOT_FOUND' || message === 'TASK_NOT_FOUND' ? 404
      : message === 'TASK_BUSY' ? 409
      : message === 'FORBIDDEN_ORIGIN' ? 403
      : message === 'BODY_TOO_LARGE' ? 413
      : message === 'AGENT_UNAVAILABLE' || message === 'WORKDIR_UNAVAILABLE' ? 422 : 400;
    json(response, status, { error: { code: message, message: publicErrorMessage(message) } });
  }
});

server.listen(port, host, () => {
  console.log(`Cindy Web local runtime: http://${host}:${port}`);
  console.log(`Data directory: ${dataRoot}`);
  console.log(`Agents: ${runtime.catalog().map((agent) => `${agent.label}=${agent.available ? 'ready' : 'missing'}`).join(', ')}`);
});

let shuttingDown = false;
async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close();
  await runtime.shutdown();
  db.close();
}
process.once('SIGINT', () => { void shutdown().finally(() => process.exit(0)); });
process.once('SIGTERM', () => { void shutdown().finally(() => process.exit(0)); });

async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
  if (request.method === 'GET' && url.pathname === '/api/health') {
    json(response, 200, { ok: true, version: 1, cwd: process.cwd(), dataRoot, agents: runtime.catalog() });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/tasks') {
    json(response, 200, { tasks: runtime.db.listTasks().map((task) => ({ ...task, running: runtime.isRunning(task.id) })) });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/tasks') {
    const body = await readJson(request);
    const cwd = requiredString(body.cwd, 'cwd');
    validateDirectory(cwd);
    const agent = validateAgent(body.agent);
    const timestamp = new Date().toISOString();
    const task: StoredTask = { id: randomUUID(), title: optionalString(body.title) || 'Nova tarefa', project: optionalString(body.project) || basename(cwd), cwd,
      agent, nativeSessionId: null, createdAt: timestamp, updatedAt: timestamp, archived: false };
    json(response, 201, { task: { ...runtime.db.createTask(task), messages: [], running: false } });
    return;
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/([0-9a-f-]+)$/i);
  if (taskMatch && request.method === 'PATCH') {
    const body = await readJson(request);
    const patch: Partial<Pick<StoredTask, 'title' | 'project' | 'cwd' | 'agent' | 'archived'>> = {};
    if (body.title !== undefined) patch.title = requiredString(body.title, 'title');
    if (body.project !== undefined) patch.project = requiredString(body.project, 'project');
    if (body.cwd !== undefined) { patch.cwd = requiredString(body.cwd, 'cwd'); validateDirectory(patch.cwd); }
    if (body.agent !== undefined) patch.agent = validateAgent(body.agent);
    if (body.archived !== undefined) patch.archived = Boolean(body.archived);
    const task = runtime.db.updateTask(taskMatch[1], patch);
    if (!task) throw new Error('TASK_NOT_FOUND');
    json(response, 200, { task });
    return;
  }
  if (taskMatch && request.method === 'DELETE') {
    if (runtime.isRunning(taskMatch[1])) throw new Error('TASK_BUSY');
    if (!runtime.db.deleteTask(taskMatch[1])) throw new Error('TASK_NOT_FOUND');
    response.writeHead(204).end();
    return;
  }

  const messageMatch = url.pathname.match(/^\/api\/tasks\/([0-9a-f-]+)\/messages$/i);
  if (messageMatch && request.method === 'POST') {
    const body = await readJson(request);
    const result = await runtime.send(messageMatch[1], requiredString(body.content, 'content'));
    json(response, 202, result);
    return;
  }
  const interruptMatch = url.pathname.match(/^\/api\/tasks\/([0-9a-f-]+)\/interrupt$/i);
  if (interruptMatch && request.method === 'POST') {
    json(response, runtime.interrupt(interruptMatch[1]) ? 202 : 409, { accepted: runtime.isRunning(interruptMatch[1]) });
    return;
  }
  const eventsMatch = url.pathname.match(/^\/api\/tasks\/([0-9a-f-]+)\/events$/i);
  if (eventsMatch && request.method === 'GET') {
    if (!runtime.db.getTask(eventsMatch[1])) throw new Error('TASK_NOT_FOUND');
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    response.write(`event: ready\ndata: ${JSON.stringify({ running: runtime.isRunning(eventsMatch[1]) })}\n\n`);
    const unsubscribe = runtime.subscribe(eventsMatch[1], (event) => response.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`));
    const heartbeat = setInterval(() => response.write(': keepalive\n\n'), 15_000);
    request.on('close', () => { clearInterval(heartbeat); unsubscribe(); });
    return;
  }
  throw new Error('NOT_FOUND');
}

function serveStatic(response: ServerResponse, pathname: string): void {
  if (!existsSync(distRoot)) {
    response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Build the web client first with: npm run build');
    return;
  }
  const decoded = decodeURIComponent(pathname);
  const candidate = resolve(distRoot, `.${decoded}`);
  const safePath = candidate === distRoot || candidate.startsWith(`${distRoot}${sep}`) ? candidate : join(distRoot, 'index.html');
  const file = existsSync(safePath) && statSync(safePath).isFile() ? safePath : join(distRoot, 'index.html');
  const bytes = readFileSync(file);
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream', 'Content-Length': bytes.length,
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" });
  response.end(bytes);
}

function assertLocalOrigin(request: IncomingMessage): void {
  const origin = request.headers.origin;
  if (origin && origin !== `http://${host}:${port}` && origin !== `http://localhost:${port}`) throw new Error('FORBIDDEN_ORIGIN');
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2_000_000) throw new Error('BODY_TOO_LARGE');
  }
  try { return JSON.parse(body || '{}') as Record<string, unknown>; } catch { throw new Error('INVALID_JSON'); }
}

function json(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  response.end(body);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`INVALID_${field.toUpperCase()}`);
  return value.trim();
}
function optionalString(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function validateAgent(value: unknown): AgentKind {
  if (value !== 'codex' && value !== 'claude' && value !== 'hermes') throw new Error('INVALID_AGENT');
  return value;
}
function validateDirectory(path: string): void {
  try {
    if (!isAbsolute(path) || !existsSync(path) || !statSync(path).isDirectory()) throw new Error('WORKDIR_UNAVAILABLE');
  } catch {
    throw new Error('WORKDIR_UNAVAILABLE');
  }
}
function basename(path: string): string { return path.split(/[\\/]/).filter(Boolean).at(-1) || 'Meu espaço'; }
function defaultDataDirectory(): string {
  if (process.platform === 'win32') return join(process.env.APPDATA || homedir(), 'CindyWeb');
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'CindyWeb');
  return join(process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state'), 'cindy-web');
}
function publicErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    TASK_BUSY: 'Esta tarefa já possui um agente em execução.', AGENT_UNAVAILABLE: 'O agente selecionado não foi encontrado no PATH do runtime.',
    WORKDIR_UNAVAILABLE: 'A pasta de trabalho não existe ou não é acessível.', FORBIDDEN_ORIGIN: 'A origem não pode acessar o runtime local.',
  };
  return messages[code] || code;
}
