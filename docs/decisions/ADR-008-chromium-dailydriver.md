# ADR-008 — Chromium daily-driver + continuity without privacy tax (supersedes ADR-007, ADR-006)

- **Status:** ACCEPTED (2026-09-17)
- **Supersedes:** ADR-007 (WebKitGTK sealed) → REOPENED as legacy lite; ADR-006 (privacy/hygiene as blocker) → DOWNGRADED to best-effort
- **Related:** ADR-001 (desktop-first), ADR-003 (pool K=4), ADR-005 (daily-driver bar)

## Context

Audit 2026-09-17: `apps/desktop` (Tauri + WebKitGTK) is a single-live-webview
context viewer (`tabview.rs:1-13`, `show_tab:443-450` reload-on-switch).
Background tabs lose audio/SPA/editors. Linux-only, no devtools/extensions,
no Win/mac parity. README claims 70% true. ADR-005 0/6 green.

Operator direction change: **be like Chrome and better — faster/lighter, daily
driver + continuity. Discard privacy-first.**

That means: vault/E2E/ephemeral-context work is tax, not moat. Speed, compat,
zero-loss restore, and cross-machine continuity are the moat.

## Decision

1. **Product engine = Electron Chromium (`apps/desktop-electron`).**
   `WebContentsView` pool K=6 live (focused + 5 LRU), rest discarded to
   metadata (url/title/history/scroll/snapshot). `backgroundThrottling:true`,
   RSS budget 1GB, `DISCARD_AFTER_MS 30s`. Tauri WebKitGTK demoted to
   `legacy-lite` (Linux low-RAM fallback, no further investment).

2. **Privacy-first discarded:**
   - Delete scope: `vault.rs` keyring flow, `trust.rs` FNV fingerprint as gate,
     client E2E sync encryption, origin-only favicon rule, `getrandom` hardening
     as blocker. Keep: TLS + Supabase RLS, normal Chromium session partitions.
   - Incognito = separate `persist:` partition `incognito` (Chromium ephemeral
     equivalent) but NOT a daily-driver gate. Simple `ses.clearStorageData()`
     on close.
   - Favicons: aggressive disk cache + origin `/favicon.ico` first, Google S2
     fallback allowed (speed over leak-purity).

3. **Continuity = SQLite-local + Supabase delta sync (TLS, no E2E):**
   - Local: single `continua.db` (better-sqlite3) — `tabs, history_fts,
     workspaces, snapshots, sync_queue`. Restore <500ms, autosave 2s debounced
     + on hide/close. Zero-loss guarantee.
   - Cloud: delta ops (`upsert_tab, close_tab, navigate`) with `device_id,
     lamport_clock`, last-write-wins + server vector-clock merge (shell already
     has it). Offline queue flush on reconnect. No whole-snapshot replace,
     no destructive `pull_session`.
   - Pairing: Settings UI + QR/device-code, token persisted to
     `app.getPath(userData)/config.json`. No `window.prompt`.

4. **Faster/lighter than Chrome how:**
   - One chrome (React), N content views (not N windows). Reuse views, don't
     recreate. Lazy-load discarded. Thumbnail snapshot for instant switch.
   - Chromium native freeze (`backgroundThrottling`, `(lowPriority)`), V8 code
     cache, spellcheck off, unused services off.
   - Budgets: startup <2s to interactive, tab switch <100ms (live) / <600ms
     (discarded rehydrate), RSS <1GB @20 tabs, restore 20 tabs <1s.

## Consequences

- `apps/desktop-electron/main.js` becomes product: unified `continua` IPC
  (snake_case, matches `tauri-bridge.ts` api names), `preload.js` exposes
  `invoke(cmd,args)`, `electron-bridge.ts` routes through it.
- `apps/desktop` frozen as legacy. No pool work there.
- `packages/sdk`, `cloudflare-worker` archived (ADR-004 already said).
  `apps/shell` = sync API only (no product investment).
- ADR-005 bar stays but reworded: #2 incognito = partition isolation only,
  #4 leaks = TLS/RLS only, vault/E2E removed from gate.
- Daily-driver parity checklist becomes blocker (omnibox, import, downloads
  manager, history FTS, bookmarks, audio badge, settings, onboarding,
  auto-update via electron-updater, Win/mac/Linux builds).

## Links

- Product host: `apps/desktop-electron/main.js`, `preload.js`, `store.js`
- Bridge contract: `apps/desktop/src/lib/tauri-bridge.ts` (names), `electron-bridge.ts` (Electron route)
- Backend: `apps/shell` sync routes (reuse, strip E2E expectation)
