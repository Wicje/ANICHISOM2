# ADR-002: The OS shell lives inside the browser — one Tauri app

**Status:** Accepted (2026-09-15)

## Context

The OS shell can be built three ways: (A) grow `apps/desktop` with shell
surfaces, (B) a second Tauri app for the shell, (C) wrap the existing web OS
in a Tauri webview. The browser already provides ~60% of an OS shell: tab
engine, command palette (launcher), `open_app_window` (app windows), session
memory + workspaces (the thing no other shell has), vault, device trust,
cloud sync. A second app would duplicate all of it. Wrapping the web OS
inherits its limits (window-in-window simulation, iframe-hostile sites,
half-finished clone apps) with no native gains.

## Decision

**One Tauri app.** The OS shell is surfaces inside `apps/desktop`, not a
separate app and not a wrapped web OS:

- **Home surface** — the New Tab evolves into the "desktop": Memory timeline
  (exists), workspaces (exist), pinned apps, continuity feed.
- **Launcher** — the command palette (exists) is the shell launcher.
- **App windows** — `open_app_window` (exists) grows into "site as app"
  (SSB): real native windows, per-app session persistence, taskbar identity.
- **Files/Vault surfaces** — downloads manager + vault manager UI.
- **Not ported:** windows-in-windows, dock/launchpad/notch cosplay, the 26
  clone apps. Real windows beat simulated ones; the launcher beats a dock.

The metaphor is capability, not costume: "an OS whose job is remembering."

## Consequences

- Shell features ride the browser's existing architecture (Rust core, 58
  commands, engine-owned state, thin React renderer).
- The web shell's good ideas (Context Kernel, continuity relevance scoring,
  app-manifest concept) graduate into the desktop **via API and reimplementation,
  not by porting UI**.
- Phase 3 (ecosystem/SDK) happens only on top of this host.
- `docs/CONTINUA_BROWSER_PLAN.md` §10's "OS shell living as a tab" claim is
  superseded by this record (that link never existed in the desktop frontend).
