# Continua — What's Left & What's Blocking

> Living status file (updated 2026-09-19). Product truth stays in
> `docs/decisions/`; this file tracks execution: blockers first, then
> remaining work, then done.

## Blockers

### 1. No current installer for friends (Windows) — OPEN
- `v0.3.1` release holds only stale `0.1.0` assets. Every Release run has
  died before uploading real installers.
- Fixed so far: CI Node 20→22, oxide postinstall crash (`--ignore-scripts`
  + explicit Electron fetch), missing rollup/tauri native optionals (pinned),
  publish repo declared, win native rebuild skipped (JSON fallback).
- Next: retag on current main, babysit one full green run, confirm
  `Continua-Setup-0.3.x.exe` in Releases.

### 2. Shell CI red — OPEN, non-blocking for the browser
- `Shell (typecheck)`: ~75 pre-existing errors in frozen OS code.
- `Shell (tests)`: fails (also OOMs in small sandboxes; unrelated to product).
- Recommendation: scope shell checks to backend paths or mark non-blocking.
  Do NOT spend a day fixing dead code to green a frozen host.

### 3. Tauri release jobs red — OPEN, remove instead of fix
- mac/win `desktop` matrix jobs still fail. The host is frozen (ADR-008).
- Recommendation: delete the `desktop` matrix from `release.yml`; ship the
  Chromium browser only.

### 4. Sync unproven end-to-end — OPEN
- Pairing + delta sync are complete and unit-tested, but never observed
  against a live backend. If `continuaos.cc` isn't deployed, cross-machine
  continuity is a local-only truth. Verify before promising it to friends.

## Remaining features (none block friends testing)

- One-click extension installs (unpacked autoload only today).
- Content blocking (no ad/tracker shields yet).
- Widevine/DRM verify (Netflix/Spotify — 5-minute check, escalates to
  blocker #1 if broken).
- SmartScreen/cert story (unsigned builds warn on first Windows run).
- Mobile companion (backend accepts phone saves; no phone app — roadmap).
- Theme share gallery / viral loop (deferred).
- Split view (never promised; evaluate post-launch).

## Done (27/27 host tests, chrome builds clean, both remotes in sync)

Profiles + per-profile isolation, theme gallery + sharing, Tidy tabs
(on-device), sleeping tabs + auto-sleep, single-row chrome, paint-aware
switching, back/forward history tracking, full session resurrection
(history/scroll/zoom/closed-ring), group collapse, Bitwarden story, Chrome
history/password import, per-site prefs, custom engines, remappable
shortcuts, toolbar editor, Notion→macOS scrollbars, drun/.desktop setup,
single-instance URL forwarding, backend-only shell trim (ADR-009),
direction docs sweep (ADR-010 and below).
