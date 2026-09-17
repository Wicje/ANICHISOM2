# Continua daily-driver parity checklist (ADR-008)

Product: `apps/desktop-electron` (Chromium). Legacy: `apps/desktop` (Tauri WebKitGTK, frozen).

## Budgets (block release if missed)
- Startup to interactive <2s (lazy restore: 1 live + N metadata)
- Tab switch <100ms live / <600ms discarded rehydrate
- RSS <1GB @20 tabs, pool K=6, discard >30s idle under pressure
- Restore 20 tabs <1s, zero-loss (autosave 2s + on hide/close + snapshot 5min)

## P0 — daily driver (must work before features)
- [x] Unified `continua` IPC (snake_case), preload kebab aliases
- [x] Pool open/close/activate/navigate/back/forward with history idx + scroll restore
- [x] LRU discard to metadata + rehydrate, per-tab zoom, find
- [x] Local store (tabs/history/bookmarks/workspaces/snapshots/queue) + crash restore
- [x] Delta sync enqueue + Supabase flush (TLS, persisted token, no E2E)
- [ ] Settings UI for pairing/server (replace `window.prompt` in CommandPalette)
- [ ] History FTS search UI + bookmarks import (Chrome/Firefox HTML)
- [ ] Downloads manager (progress/open-in-folder, not just toasts)
- [ ] Tab audio/mute badge, pinned persist, recently-closed ring UI
- [ ] Onboarding (import + homepage + search engine) + auto-update (electron-updater)
- [ ] Win/mac/Linux builds (electron-builder) + crash reporter

## P1 — continuity moat
- [x] Workspaces save/open, timeline snapshots browse/restore (merge, never destructive replace)
- [ ] Device list + realtime subscribe (Supabase channel) + offline queue UI
- [ ] better-sqlite3 migration (same store.js API, FTS5)

## Explicitly dropped (privacy tax)
Vault tabs, keyring flow, client E2E, fingerprint gate, origin-only favicon rule.
`mark_vault/unmark_vault` return null. Incognito = ephemeral partition only.
