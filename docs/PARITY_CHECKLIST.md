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
- [x] Settings UI for pairing/server (replaced `window.prompt` in CommandPalette)
- [x] History FTS search UI + bookmarks import (Chrome/Firefox HTML)
- [x] Downloads manager (progress/open-in-folder, not just toasts)
- [x] Tab audio/mute badge, pinned persist, recently-closed ring UI
- [x] Onboarding (import + homepage + search engine) + auto-update (electron-updater)
- [x] Win/mac/Linux builds (electron-builder) + crash reporter
- [ ] **Verified by a human on a real machine.** Everything above is shipped and
      typechecked; none of it has been dogfooded as the only browser for a
      sustained period. This is the real P0 gate (`docs/STRATEGY.md`,
      `ROADMAP.md` blocker 6).

## P1 — continuity moat
- [x] Workspaces save/open, timeline snapshots browse/restore (merge, never destructive replace)
- [ ] Device list + realtime subscribe (Supabase channel) + offline queue UI
- [x] better-sqlite3 migration (same store.js API, FTS5) — with a JSON fallback when the
      native binding is unusable, and `container` persisted per tab (was silently lost)

## P2 — agent trust boundary (ADR-012)
- [x] Reads free; writes need a user-issued, action-bound, single-use grant
- [x] No self-approval: a caller-supplied `approved` flag is ignored; `auto` refused
- [x] Page content cannot write; `sync_key_*` and `agent_approve` are user-only
- [x] Hash-chained append-only audit log, offline `verify()`, export (Managers → Agent audit)
- [x] Owner-only bridge token file (`0600` + Windows ACL), rate-limited bridge
- [ ] Sessions-restored-per-day > 0 across 50 real daily users

## Explicitly dropped / changed
- Vault tabs, fingerprint gate, origin-only favicon rule — dropped.
  `mark_vault/unmark_vault` return null. Incognito = ephemeral partition only.
- **Client E2E was "dropped" for continuity and is now shipped for passwords**:
  `vault-sync.js` + the four user-gated `sync_key_*` ops encrypt logins
  end-to-end, and the sync key never leaves the machine in plaintext.
- Keystroke-level vault/autofill UI remains unbuilt (Chromium handles basics).
