import { spawnSync } from 'node:child_process';

const base = process.argv[2] || process.env.DCO_BASE || 'HEAD~1';
const head = process.argv[3] || process.env.DCO_HEAD || 'HEAD';
const result = spawnSync('git', ['log', '--format=%H%x00%ae%x00%B%x1e', `${base}..${head}`], {
  encoding: 'utf8',
});
if (result.status !== 0) {
  console.error(result.stderr || result.error?.message || 'Unable to inspect Git history.');
  process.exit(1);
}
const output = result.stdout;
const failures = [];

for (const entry of output.split('\x1e')) {
  const [rawSha, email, body = ''] = entry.split('\0');
  const sha = rawSha.trim();
  if (!sha) continue;
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`^Signed-off-by: .+ <${escaped}>$`, 'im').test(body)) failures.push(sha);
}

if (failures.length) {
  console.error(`DCO check failed for: ${failures.join(', ')}`);
  console.error('Sign commits with: git commit -s');
  process.exit(1);
}
console.log(`DCO check passed for ${base}..${head}.`);
