# Continua — What's Left & What's Blocking

> Living status file (updated 2026-10-04). Product truth stays in
> `docs/decisions/`; direction and what we refuse to build live in
> `docs/STRATEGY.md`; this file tracks execution: blockers first, then
> remaining work, then done.

## Fixed since the last update (2026-10-04)

- **Packaged builds booted into a crash.** `main.js` requires `logins.js`,
  `shields.js` and `groups.js` at module scope and electron-builder's
  `build.files` omitted all three, so every tagged installer would have died on
  its first line. Fixed, and `scripts/check-build-files.cjs` now fails CI if the
  two lists ever diverge again (`npm run check:package`).
- **Containers were lost on restart.** `store-sqlite.js` never persisted the tab
  `container` column, so a container tab silently reopened in the profile-default
  partition — the exact cookie-mixing H6 exists to prevent. Fixed (migration +
  round-trip), covered by `store-sqlite.test.js`.
- **The agent could approve itself.** `act_tab` honoured a caller-supplied
  `approved: true`, and any local process able to read `agent-bridge.json`
  inherited that. Replaced with user-issued single-use grants + a hash-chained
  audit log (ADR-012); the bridge token file is now owner-only and rate-limited.
- **An unloadable `better-sqlite3` took the app down.** The optional dependency
  could resolve while its native binding was missing; `create()` now falls back
  to the JSON store instead of throwing at boot.
- **CI ran none of it.** Added `browser-host` (165 host tests, `node --check`
  gate, packaging guard, chrome typecheck+build). The two frozen `Shell` jobs are
  now explicitly `continue-on-error` instead of silently red and blocking.

## Blockers

### 1. No current installer for friends (Windows) — DONE 2026-09-19
- `v0.4.0` ships `Continua-Setup-0.4.0.exe` (+ mac arm64 dmg, AppImage, deb).
- Took six CI fixes: Node 22, oxide postinstall, native optionals, publish
  repo (root + app), all-OS rebuild skip, author email. History in `release.yml`.
- Caveats: Intel Macs have no dmg (arm64 only); unsigned everywhere.
- **Follow-up:** the `build.files` crash above would have hit the *next* tag.
  Smoke-test one artifact per platform before tagging from now on.

### 2. Shell CI red — CLOSED as non-blocking 2026-10-04
- `Shell (typecheck)` has ~75 pre-existing errors and `Shell (tests)` fails in
  frozen OS code (ADR-009 backend-only). Both jobs are now `continue-on-error`
  with `legacy — non-blocking` in the name, and `Build shell` no longer depends
  on them. `browser-host` is the gate that matters.
- Do NOT spend a day fixing dead code to green a frozen host.

### 3. Tauri release jobs — DONE (matrix removed)

### 4. Sync unproven end-to-end — OPEN, the top engineering blocker
- Pairing + delta sync are complete and unit-tested, but never observed against
  a live backend. If `continuaos.cc` isn't deployed, cross-machine continuity is
  a local-only truth. Verify before promising it to anyone.

### 5. Widevine/DRM on Linux — OPEN, needs a Chrome-installed box
- Electron bundles the CDM on Win/mac; on Linux the browser borrows Chrome's CDM
  when present. Unverified everywhere — no one here has Chrome installed.
  First friend test on Netflix/Spotify decides if this escalates.

### 6. Zero verified daily use — OPEN, the top product blocker
- Nothing here has run Continua as its only browser for a sustained period. Every
  roadmap claim about "daily-driver" is untested by a human who depends on it.
  30 days of dogfooding, then 50 daily users who each restore a real session
  (`docs/STRATEGY.md`).

## Remaining features (none block friends testing)

- Autofill address/card manager UI (Chromium handles basics internally).
- Split view (never promised; evaluate post-launch).
- Mobile companion (backend accepts phone saves; no phone app — roadmap).
- Theme share gallery / viral loop (deferred indefinitely).
- SmartScreen/cert story (unsigned builds warn on first Windows run).
- **Unattended agent mode** — explicitly *not* a default. If it ever ships it is
  a loud per-profile opt-in writing to the same audit chain (ADR-012).

## UI/UX backlog (ranked 2026-10-07; strategy-compliant, no new mediums)

Broken-first — these read as "unfinished" to anyone trying the browser:

1. Tab strip empties at ~11 tabs (overflow auto-rail, `TabStrip.tsx`/`TabRail.tsx`) — repro, then fix. Most visible bug in the product.
2. Onboarding renders behind content views (`Onboarding.tsx`) — first-run is invisible; fix z-order/hiding before any new-user push.
3. `chrome_modal` hide path unverified — confirm `Ctrl+K` over a live page (palette is the front door).
4. Empty states pass — new-tab, history/bookmarks/downloads at zero entries, offline page.

Leverage (serve the bets, not the mediums):

5. Session-restore confidence UI — "restored N tabs" moment on launch + per-workspace restore (`WorkspaceMenu.tsx`). Continuity must be *felt*.
6. Multi-step approval queue (`AgentApprovalPrompt.tsx`) — pending list with fingerprints; scoped origin grants. Single prompts won't survive real flows.
7. Command palette as product surface (`CommandPalette.tsx`) — fuzzy search over 200-tab sessions, action history, read-aloud volume slider.
8. Tab identity pass — loading/progress states, truthful audible/mute badges, pinned affordances, crashed-tab inline retry.
9. Onboarding that teaches the wedge — demo one continuity moment + one approve-and-audit moment.

Polish:

10. Motion discipline — one easing curve, one duration scale, skeletons for panels, no layout shift on rail show/hide.
11. Keyboard completeness — every action reachable, focus always visible.
12. Theme presets worth sharing — 6–10 genuinely good ones (format + import/export already ship).

Explicitly out: new mediums, theme-share social features, screenshot annotation, task-manager upgrades (parity maintenance only, per STRATEGY.md).

## Done (165 host tests, chrome typechecks + builds clean)

- P0 correctness: window.open/target=_blank routing, screenshare picker,
  single-instance URL forwarding, reload wakes sleeping tabs, captive
  portal detection.
- Continuity: pool + paint-aware switching, back/forward tracking, full
  session resurrection (history/scroll/zoom/container/closed-ring), per-profile
  stores, additive-only sync, workspaces, memory timeline, closed ring.
- Agent trust boundary (ADR-012): reads free, writes need user-issued
  single-use grants bound to an action fingerprint, page content can never
  approve, `sync_key_*` user-only, hash-chained tamper-evident audit log with
  offline verify + export, owner-only bridge token, rate-limited bridge,
  Managers → Agent audit, and sessions-restored-per-day metrics.
- Organization: Tidy tabs (on-device), sleeping tabs + auto-sleep, group
  collapse, favicon-only strip at 12+, tab MRU cycling, hover identity pill,
  single-row 40px chrome with content gap.
- Identity: profiles + isolation, containers (H6, restart-safe), theme gallery +
  sharing, per-profile worlds, custom engines, remappable shortcuts, toolbar
  editor, density, per-site prefs (zoom/mute/shields), macOS overlay scrollbars.
- Trust: shields (on-device list, default on), E2E password sync key (H7),
  Chrome + Firefox import, password generator, drun + single-instance setup.
- Perf/hygiene: download ring cap, reader-cache cleanup, per-profile cache
  clearing, launcher log rotation, 16.8 GiB cargo cache reclaimed.
- Docs & repo: ADR-001…012, `docs/STRATEGY.md`, CI that actually runs the
  product's tests and packaging guard.
