# apps/desktop-electron — Electron host (the browser)

Pure host logic as dependency-free CommonJS modules (`*.js` + colocated
`*.test.js`, Node test runner), wired to Electron IPC only in `main.js`.
`main.js` is single-threaded state (tabs, focus, store) — keep edits
sequential. Electron is not importable under plain `node`: use `node --check`
as the syntax gate, never `require(main.js)`.

## Layout

- `main.js` — window/views pool, IPC `continua` handler, loopback bridge,
  approvals/grants/audit wiring. Policy via `agent-policy.js#decide`, never
  inline.
- `preload.js` / `content-preload.js` / `studio-preload.js` — context bridges
  (minimal surface; page-exposed preloads never get `invoke`).
- `agent-policy.js` — tiers, fingerprint, grant mint/verify, `decide()`.
  Spec: `docs/AGENT_TRUST_SPEC.md`.
- `grant-registry.js` / `approval-queue.js` — per-profile single-use grants (5
  min TTL) + approval queue (5 min TTL).
- `audit-log.js` — hash-chained JSONL, `verify()`, export. Spec: same doc.
- `agent-act.js` — verb classify + `clickJs`/`typeJs` emitters (index-paths
  only). `ax-tree.js` — snapshot build/index/summarize with caps.
- `agent-policy.test.js`, `audit-log.test.js`, `agent-act.test.js`,
  `ax-tree.test.js`, `grant-registry.test.js`, … — 23 files, ~200 tests.
- `mcp-browser.mjs` — dependency-free stdio MCP server (no SDK installed).
- `store-sqlite.js` / `store.js` — per-profile session stores (SQLite FTS +
  JSON fallback). `sync.js` — delta sync. `webapps.js` — installed-apps
  registry + icon picking. `themes` live in chrome (`apps/desktop`), not here.

## Commands

- `npm -w apps/desktop-electron run test` — host unit tests.
- `node --check apps/desktop-electron/main.js` — syntax gate (also preload,
  `mcp-browser.mjs`).
- `npm run check:package` — every module `main.js` requires must be in
  electron-builder `build.files` (repo root script).
- `npm run check:host` — package guard + syntax + tests (what CI gates).
- `npm run dev:browser` — launch the browser (repo root).

## Conventions

- IPC ops are snake_case; chrome mirrors each in `tauri-bridge.ts` as camelCase
  with a typed `invoke<...>()` + `.catch(() => ({error:"unavailable"}))`.
- New runtime modules must be added to electron-builder `build.files` before
  dist builds (`check:package` enforces it).
- Page content is untrusted agent input: every automated action goes through
  `decide()` and is audited, allowed or denied. Do not add a bypassing path.
