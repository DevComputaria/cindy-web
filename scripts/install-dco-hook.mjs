import { chmodSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const gitDirectory = join(root, '.git');
if (!existsSync(gitDirectory)) throw new Error('Run this command from a Git checkout.');

const hooks = join(gitDirectory, 'hooks');
const destination = join(hooks, 'prepare-commit-msg');
mkdirSync(hooks, { recursive: true });
copyFileSync(join(root, '.githooks', 'prepare-commit-msg'), destination);
chmodSync(destination, 0o755);
console.log(`Installed DCO hook at ${destination}`);
