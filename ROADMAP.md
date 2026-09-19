# Continua — What's Left & What's Blocking

> Living status file (updated 2026-09-19, evening). Product truth stays in
> `docs/decisions/`; this file tracks execution: blockers first, then
> remaining work, then done.

## Blockers

### 1. No current installer for friends (Windows) — DONE 2026-09-19
- `v0.4.0` ships `Continua-Setup-0.4.0.exe` (+ mac arm64 dmg, AppImage, deb).
- Took six CI fixes: Node 22, oxide postinstall, native optionals, publish
  repo (root + app), all-OS rebuild skip, author email. History in `release.yml`.
- Caveats: Intel Macs have no dmg (arm64 only); unsigned everywhere.

### 2. Shell CI red — OPEN, non-blocking for the browser
- `Shell (typecheck)`: ~75 pre-existing errors in frozen OS code.
- `Shell (tests)`: fails (also OOMs in small sandboxes; unrelated to product).
- Recommendation: scope shell checks to backend paths or mark non-blocking.
  Do NOT spend a day fixing dead code to green a frozen host.

### 3. Tauri release jobs — DONE (matrix removed)
- `release.yml` is browser-only now. The frozen host no longer blocks
  releases or spams duplicate drafts (8 mislabeled releases cleaned up).

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
  single-instance URL forwarding, reload wakes sleeping tabs, captive
  portal detection.
- Continuity: pool + paint-aware switching, back/forward tracking, full
  session resurrection (history/scroll/zoom/closed-ring), per-profile stores,
  additive-only sync, workspaces, memory timeline, closed ring.
- Organization: Tidy tabs (on-device), sleeping tabs + auto-sleep, group
  collapse, favicon-only strip at 12+, tab MRU cycling, hover identity pill,
  single-row 40px chrome with content gap.
- Identity: profiles + isolation, theme gallery + sharing, per-profile
  worlds, custom engines (now in ⋯ menu), remappable shortcuts, toolbar
  editor, density, per-site prefs (zoom/mute/shields), macOS overlay
  scrollbars (chrome + pages, no arrow buttons).
- Trust: shields (on-device list, default on), Bitwarden story, Chrome +
  Firefox import (history + passwords CSV), password generator, drun +
  single-instance setup.
- Perf/hygiene: download ring cap, reader-cache cleanup, per-profile cache
  clearing, launcher log rotation, 16.8 GiB cargo cache reclaimed.
- Docs & repo: backend-only shell trim (ADR-009), local tab intelligence
  (ADR-010), shields/store-install policy (ADR-011), direction sweep.
