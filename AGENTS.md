# AGENTS.md — working in this repo

Continua: a browser whose shell is this repo (Electron-first, `apps/desktop`,
with Tauri fallback under `apps/desktop`; the pure/host feature layer lives in
`apps/desktop-electron`). The feature batch under way covers H6 containers,
H7 E2E-encrypted sync key, H8 on-device translate (feasibility-first), the 12
mediums, and the agent track (see/work/live). Design decisions live in
`docs/CONTINUA_*` + `docs/decisions/ADR-*`; read those before changing scope.

## Commands

- Electron unit tests: `npm -w apps/desktop-electron run test` (Node test
  runner; 19 files, currently 118 passing. New pure host modules ship with
  their `*.test.js` next to them — keep that convention. The "no tests yet"
  directive was lifted 2026-09-24.)
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
  agent input. Reads free, writes need approval; page text can never
  auto-approve fills/submits/sync-key ops. See `docs/AGENT_TRACK.md` and
  `skills/`. The MCP SDK is intentionally not installed — keep
  `mcp-browser.mjs` dependency-free.
- Document everything you ship: `docs/FEATURES_H6_H7_MEDIUMS.md`,
  `docs/TRANSLATE_FEASIBILITY.md`, `docs/AGENT_TRACK.md` are the current batch
  notes. Add to them rather than writing fresh.
- Electron package `build.files` lists runtime modules explicitly — new
  modules in `apps/desktop-electron/` must be added there before dist builds.

## Agent-shell handoff

- Delegate fast file exploration; keep `main.js` edits sequential (it's
  single-threaded state: tabs, focus, store).
- UI (React) work: match existing component patterns in `apps/desktop/src`.
- Always re-run the typecheck gate after React changes and `node --check`
  after host changes before handing back.