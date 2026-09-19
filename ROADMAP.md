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

### 5. Widevine/DRM on Linux — OPEN, needs a Chrome-installed box to verify
- Stock Electron bundles the CDM on Win/mac (friends likely fine); on Linux
  the browser now borrows Chrome's CDM automatically when present.
- Nobody here has Chrome installed, so playback is unverified everywhere.
  First friend test on Netflix/Spotify decides if this escalates.

## Remaining features (none block friends testing)

- Autofill address/card manager UI (Chromium handles basics internally).
- Split view (never promised; evaluate post-launch).
- Mobile companion (backend accepts phone saves; no phone app — roadmap).
- Theme share gallery / viral loop (deferred).
- SmartScreen/cert story (unsigned builds warn on first Windows run).

## Done (27/27 host tests, chrome builds clean, both remotes in sync)

- P0 correctness: window.open/target=_blank routing, screenshare picker,
  single-instance URL forwarding, reload wakes sleeping tabs.
- Continuity: pool + paint-aware switching, back/forward tracking, full
  session resurrection (history/scroll/zoom/closed-ring), per-profile stores,
  additive-only sync, workspaces, memory timeline, closed ring.
- Organization: Tidy tabs (on-device), sleeping tabs + auto-sleep, group
  collapse, favicon-only strip at 12+, tab MRU cycling.
- Identity: profiles + isolation, theme gallery + sharing, per-profile
  worlds, custom engines, remappable shortcuts, toolbar editor, density,
  per-site prefs (zoom/mute/shields), macOS overlay scrollbars.
- Trust: shields (on-device list, default on), Bitwarden story, Chrome +
  Firefox import (history + passwords CSV), password generator, captive
  portal detection, drun/.desktop setup.
- Docs & repo: backend-only shell trim (ADR-009), local tab intelligence
  (ADR-010), shields/store-install policy (ADR-011), direction sweep.
