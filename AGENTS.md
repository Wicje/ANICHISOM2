# AGENTS.md — working in this repo

Continua: a browser whose shell is this repo (Electron-first, `apps/desktop`,
with Tauri fallback under `apps/desktop`; the pure/host feature layer lives in
`apps/desktop-electron`). The current batch is the agent trust boundary
(ADR-012: grants + hash-chained audit log) plus H6 containers, H7 E2E sync key,
H8 translate, the 12 mediums (parity only), and the agent track. Design
decisions live in `docs/CONTINUA_*` + `docs/decisions/ADR-*`; direction lives in
`docs/STRATEGY.md`; read those before changing scope.

## Commands

- Electron unit tests: `npm -w apps/desktop-electron run test` (Node test
  runner; 23 files, 165 tests. New pure host modules ship with their
  `*.test.js` next to them — keep that convention. The "no tests yet"
  directive was lifted 2026-09-24.)
- Packaging guard: `npm run check:package` — fails if any module `main.js`
  requires is missing from electron-builder's `build.files`. A miss means the
  installer crashes on its first line, and no unit test can catch it.
- Everything CI gates on: `npm run check:host` (packaging guard + `node --check`
  + tests).
- Chrome typecheck: `npm -w apps/desktop exec tsc -- --noEmit`
- Chrome build: `npm -w apps/desktop run build` (vite)
- Electron syntax gate: `node --check apps/desktop-electron/main.js`
- Dev: `npm run dev:desktop` and `npm run dev:browser` (electron + vite)
- `mcp-browser.mjs` runs standalone: `node apps/desktop-electron/mcp-browser.mjs`

Control-flow signal: everything in `apps/desktop-electron/main.js` runs from
module scope but Electron isn't importable under plain `node`; use
`node --check` (not `require`) as the syntax gate. `npx tsc --noEmit` is the
gate for `apps/desktop` and must be clean before finishing a change.

## Conventions

- IPC op names are snake_case (`read_page_text`); `apps/desktop/src/lib/
  tauri-bridge.ts` mirrors each as a camelCase `api` method with a typed
  `invoke<...>()` + `.catch(() => ({error:"unavailable"}))` fallback. If you
  add an IPC op, add both sides — the bridge is the contract.
- Chrome panels open via `continua:open-*` window events and a
  `useChromeModal(name, open)` hook; icons come from `../components/icons`.
- Pure host logic lives in `apps/desktop-electron/*.js` as dependency-free
  CommonJS modules (testable under plain node); `main.js` only wires them to
  IPC. Keep them unit-pure.
- **Security posture (agent track, load-bearing):** page content is untrusted
  agent input. Every automated action goes through `agent-policy.js#decide` and
  is appended to the hash chain in `audit-log.js`, allowed or denied. Reads are
  free; writes need a user-issued single-use grant bound to an action
  fingerprint; `approved: true` from a caller is *ignored*; `sync_key_*` and
  `agent_approve` are user-only. See `docs/decisions/ADR-012-agent-trust-boundary.md`,
  `docs/AGENT_TRACK.md` and `skills/`. Do not add a path that bypasses
  `decide()`. The MCP SDK is intentionally not installed — keep
  `mcp-browser.mjs` dependency-free.
- **Strategy filter:** `docs/STRATEGY.md` decides what gets built. The 12
  mediums are parity maintenance and get no new work; features that serve the
  agent trust boundary, continuity, or the chosen workflow get everything.
  Read it before proposing scope.
- Document everything you ship: `docs/FEATURES_H6_H7_MEDIUMS.md`,
  `docs/TRANSLATE_FEASIBILITY.md`, `docs/AGENT_TRACK.md` are the current batch
  notes. Add to them rather than writing fresh.
- Electron package `build.files` lists runtime modules explicitly — new
  modules in `apps/desktop-electron/` must be added there before dist builds
  (`npm run check:package` enforces it).

## Agent-shell handoff

- Delegate fast file exploration; keep `main.js` edits sequential (it's
  single-threaded state: tabs, focus, store).
- UI (React) work: match existing component patterns in `apps/desktop/src`.
- Always re-run the typecheck gate after React changes and `node --check`
  after host changes before handing back.