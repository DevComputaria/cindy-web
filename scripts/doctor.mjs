import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { resolve } from 'node:path';

const requiredNode = [22, 13];
const currentNode = process.versions.node.split('.').map(Number);
const nodeOk =
  currentNode[0] > requiredNode[0] ||
  (currentNode[0] === requiredNode[0] && currentNode[1] >= requiredNode[1]);
const commands = [
  ['codex', process.env.CINDY_CODEX_COMMAND || 'codex'],
  ['claude', process.env.CINDY_CLAUDE_COMMAND || 'claude'],
  ['hermes', process.env.CINDY_HERMES_COMMAND || 'hermes'],
];

console.log(`Node ${process.versions.node}: ${nodeOk ? 'ok' : 'requires >= 22.13'}`);
for (const [name, command] of commands) {
  const result = spawnSync(command, ['--version'], { shell: false, encoding: 'utf8', timeout: 3000 });
  console.log(
    `${name}: ${result.error ? 'not found' : (result.stdout || result.stderr).trim() || 'available'}`,
  );
}

const cwd = resolve(process.argv[2] || process.cwd());
try {
  accessSync(cwd, constants.R_OK | constants.W_OK);
  console.log(`workdir ${cwd}: readable and writable`);
} catch {
  console.error(`workdir ${cwd}: not readable/writable`);
  process.exitCode = 1;
}
if (!nodeOk) process.exitCode = 1;
