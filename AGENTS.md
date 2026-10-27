# Repository instructions

These rules apply to the entire `cindy-web` repository.

## Product boundary

Cindy Web is a browser UI plus a local Node.js runtime. The browser must never directly own agent processes, durable task history, credentials, or unrestricted filesystem access. The runtime stays bound to loopback and owns SQLite, workdirs, process lifecycle and native agent sessions.

Read the relevant contract before changing a subsystem:

- runtime boundaries and lifecycle: `docs/architecture.md`;
- process adapters and session semantics: `docs/agents.md`;
- schema or persistence: `docs/database-and-migrations.md`;
- HTTP, subprocess or credential behavior: `docs/security.md`;
- components, CSS or interaction: `docs/design-system.md`;
- tests and CI expectations: `docs/testing.md`.

## Repository map

- `src/`: React browser application and browser-only adapters;
- `server/`: local HTTP/SSE server, SQLite repository and agent runtime;
- `scripts/`: repeatable validation, diagnostics, hooks and test fixtures;
- `config/`: configuration examples only; never commit secrets;
- `docs/`: durable product and engineering contracts;
- `.github/`: CI, dependency automation and contribution templates;
- `.githooks/`: versioned local Git hooks.

Generated directories (`dist/`, `server-dist/`, `coverage/`) are not source and must not be committed.

## Invariants

1. Bind the runtime to `127.0.0.1`; a LAN/public mode requires a separate authenticated threat model.
2. Spawn agent commands with `shell: false`; pass prompts as argv values, never interpolate shell strings.
3. Keep agent authentication inside each CLI. Do not read, persist, log or proxy its credentials.
4. Validate absolute workdirs at the HTTP boundary and again before spawning a process.
5. Persist user and pending assistant messages before treating a run as active.
6. One task has at most one active run. Changing its agent or workdir clears its native session ID.
7. Database migrations are append-only, ordered and transactional. Never edit an already released migration.
8. Runtime restart converts orphaned `running` rows to `interrupted`; it must not invent process continuity.
9. Browser `localStorage` is only for non-sensitive presentation preferences.

## Change workflow

1. Inspect the owning module and linked documentation.
2. Add or update a behavioral test that could catch a realistic regression.
3. Keep cross-platform path/process behavior in mind; CI covers Linux, macOS and Windows.
4. Run `npm run check`. For docs-only changes, at minimum run `npm run format:check && npm run docs:check`.
5. Update the relevant docs when a contract, API, environment variable or invariant changes.
6. Sign every commit with `git commit -s`. Install the helper with `npm run dco:install-hook`.

Do not weaken lint, coverage, security assertions or CI gates to make a change pass. Fix the behavior or explain and review an intentional policy change.
