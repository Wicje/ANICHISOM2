# ADR-004: `apps/shell` is a frozen experiment + the cloud backend

**Status:** Accepted (2026-09-15)

## Context

`apps/shell` contains two separable things: (1) a ~103k-LOC web-desktop
experiment (window manager, dock, 26 apps, macOS cosplay) and (2) the cloud
product's backend (Context Kernel with vector clocks + delta sync, 64 API
routes, Supabase schema, device/pairing endpoints, 723 tests). The web OS
cannot become the product (ADR-001); the backend must keep running because
the desktop's sync depends on it (`continuaos.cc`: `/api/context/*`,
`/api/devices/*`, `/api/connect/pair`).

Owner's position: the web OS is wanted **as an experiment** — kept, not
invested in.

## Decision

- `apps/shell` is **frozen as an experiment**. It stays runnable, receives no
  product investment, and its web-desktop mode is not marketed.
- Its backend routes remain the live sync/continuity API for the desktop.
- Good ideas graduate into the desktop **through the API** (continuity
  relevance scoring → Home feed; app-manifest concept → Phase 3 SDK), never
  by porting web-desktop UI.
- Doc-debt in the shell's own files (VISION/ARCHITECTURE/BUILD_LOG claim 47
  apps vs 26 real, a Tauri runtime deleted in `88a3940`, "100% functional"
  stubs) is corrected with SUPERSEDED banners per the decision-log rule — the
  experiment's docs must not lie to future contributors.
- Orphans scheduled for archive (not silent deletion): `packages/sdk`
  (no importers, never built), `cloudflare-worker/` (nothing calls it; the
  shell's own `/api/proxy` supersedes it), the 12 unregistered venture-pack
  components.

## Consequences

- Zero risk to the sync backend the desktop depends on.
- The experiment stays available for inspiration and demos.
- Repo focus: one product app, one backend, one wedge (the Chrome extension).
