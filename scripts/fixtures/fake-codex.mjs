#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.includes('--version')) {
  console.log('fake-codex 1.0.0');
  process.exit(0);
}

const isResume = args[0] === 'exec' && args[1] === 'resume';
const prompt = args.at(-1) ?? '';
console.log(JSON.stringify({ type: 'thread.started', thread_id: 'smoke-thread' }));
console.log(
  JSON.stringify({
    type: 'item.completed',
    item: {
      type: 'agent_message',
      text: `${isResume ? 'resumed' : 'started'}:${prompt}`,
    },
  }),
);
