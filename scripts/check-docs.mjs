import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const required = [
  'AGENTS.md',
  'README.md',
  'docs/README.md',
  'docs/architecture.md',
  'docs/agents.md',
  'docs/database-and-migrations.md',
  'docs/design-system.md',
  'docs/development.md',
  'docs/security.md',
  'docs/testing.md',
];

for (const relative of required) {
  const path = join(root, relative);
  assert.ok(existsSync(path), `Required documentation is missing: ${relative}`);
  const content = readFileSync(path, 'utf8');
  assert.match(content, /^# /, `${relative} must begin with one H1 heading`);

  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    assert.ok(existsSync(resolve(dirname(path), target)), `Broken link in ${relative}: ${match[1]}`);
  }
}

console.log(`Documentation contract passed (${required.length} required files).`);
