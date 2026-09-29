# H6 · H7 · Mediums — Feature Notes

Status: shipped (code) · tests: unit suite 118 passing across 19 files
(`npm -w apps/desktop-electron run test`), covering the H6/H7/translate/medium
pure modules plus the agent-track modules (ax-tree, agent-act, debrief).
React chrome stays typechecked (`tsc --noEmit`) + vite-built; no DOM tests.

## H6 — Container tabs (contextual identities)

Firefox-style identities are lighter than profiles: each container owns one
persistent Electron partition (`persist:continua-container-<id>`), so
cookies/storage/service workers never cross identities in one window.

- Pure logic: `apps/desktop-electron/containers.js` (registry sanitize,
  create/rename/delete, `partitionFor`, tab clearing). Config key: `containers`.
- Host: `main.js` IPC — `list_containers`, `create_container`,
  `rename_container`, `delete_container`, `open_container_tab`,
  `set_tab_container`. Moving a tab between containers **discards and
  rehydrates** its view (partitions differ); a tab can only carry one
  container or the profile default.
- Chrome: Managers → Containers (create/rename/delete/open/Use), tab-strip
  color dot, palette "Containers" opens the drawer at that section.
- Reopening a closed tab restores its container; synced sessions carry
  `container` so a restored tab lands in the right partition.

## H7 — E2E-encrypted password sync (sync key)

Logins already live in the OS keyring (`logins.js`). The sync key adds an
envelope so that **only ciphertext ever leaves the machine**:

- `vault-sync.js`: `generateSyncKey` / `validSyncKey` (pure, tested).
- `main.js`: `sync_key_status` / `sync_key_create` / `sync_key_show` /
  `sync_key_import`. Raw key is decrypted from `cfg.sync_key_enc`
  (`safeStorage`) **only in memory**, only through those four calls, ever.
- `sync.js` payload carries `data.loginsEnc`; flush/pull adopt/merge additive
  E2E pairs; `mergeRemoteTabs` surfaces `container`.
- Chrome: Settings → **Password sync key** — create (shown once), show/copy,
  import. Same key on another profile/device will share logins E2E.
- Guardrail (agent + UI): page content can never trigger key create/show/
  import — user-gated only.

## Mediums — 12 on-device features (shipped)

| Feature | Module | Host IPC | Chrome surface |
|---|---|---|---|
| Search keywords (`d cats`) | `keywords.js` | `list/add/remove_keyword`, `resolve_keyword` | omnibox, Settings → Search keywords |
| Recently-closed ring | `closed.js` | `list_closed`, `reopen_closed`, `clear_closed` | palette, Ctrl+Shift+T |
| Per-site cookies | `cookies.js` | `list/remove/clear_cookies` | Managers → Cookies |
| Installed web apps | `webapps.js` | `list/install/open/remove_app` | Managers → Apps; home screen tiles with site icons |
| Full-page screenshot | — | `screenshot_full` | palette, ⋯ menu |
| Read-aloud (TTS) | `speech.js` | `read_aloud`, `read_aloud_stop` | palette |
| Task manager | — | `task_manager`, `tab_metrics` | Managers → Tab manager |
| Named snapshots | `snapshots.js` | `save/list/restore/delete_snapshot` | Managers → Snapshots, palette |
| Tab search | — | `search_tabs` | palette (via tabs list) |
| Bookmark manager | `bookmarks.js` | `search_bookmarks`, `rename_bookmark`, existing bm APIs | Managers → Bookmarks |
| History manager | — | `search_history`, `delete_history_url` | Managers → History |
| Detect + translate (H8) | `translate.js` | `detect_language`, `translate_text`, `read_page_text` | palette, Settings → Translate |

Storage: `store.js` + `store-sqlite.js` gained named snapshots (`snapshots.name`
column, upsert, cap 100), `updateBookmark`, `deleteHistoryUrl` (history + FTS),
and config whitelist entries for `containers`, `installed_apps`,
`search_keywords`, `translate_endpoint`.

Home screen: `main.js#renderStartPage` bakes the profile's installed apps
(`{name, url, icon}`) into a per-profile copy of `start-page.html` at boot,
on profile switch, and on install/remove (template fallback if the write
fails). Icons resolve at install time — explicit `icon` arg wins, else the
page's declared icon links (`webapps.js#pickIconHref`: apple-touch-icon →
largest `sizes=` → first icon), else `origin/favicon.ico`. The file:// page
has no IPC by design; tiles render `<img>` with a letter-glyph `onerror`
fallback, and baked strings are `<`-escaped so app names can never break out
of the `<script>` block.

Build wiring: `apps/desktop-electron/package.json` test script lists all 16
test files; `build.files` now includes the new runtime modules (plus the
agent-track modules `ax-tree.js`, `agent-act.js`, `debrief.js`,
`mcp-browser.mjs` created next).

## Not taken

- Recording binaries from hyperframes (macOS/Windows x64 only).
- VideoDB backend, tRPC/Hono/Zustand migration (call.md scope creep).
- MCP SDK dependency (`@modelcontextprotocol` is not installed anywhere —
  agent MCP must be dependency-free).
- On-device translation engine (see `docs/TRANSLATE_FEASIBILITY.md`).