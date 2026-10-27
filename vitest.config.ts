import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['node_modules/**', 'dist/**', 'server-dist/**'],
    server: { deps: { external: ['node:sqlite'] } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['server/agents.ts', 'server/database.ts', 'src/lib/store.ts'],
      thresholds: { lines: 75, functions: 75, statements: 75, branches: 65 },
    },
  },
});
