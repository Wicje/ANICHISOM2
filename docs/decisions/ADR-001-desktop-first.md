# ADR-001: Desktop-first — the Tauri browser is the product

**Status:** Accepted (2026-09-15)

## Context

The repo has lived through three shapes: a Next.js "web OS" (`apps/shell`,
~103k LOC), a Tauri runtime inside that shell (built, then deleted in commit
`88a3940`), and the Continua browser (`apps/desktop`, ~11k LOC). Commit
activity and the README already call the browser "the desktop-first product."
The web OS cannot be a daily driver: sites fight its iframes (two proxy
implementations exist to work around this), its storage is ephemeral
IndexedDB, and its own e2e suite skips rendering it because "the desktop
bundle is enormous" (`apps/shell/e2e/core.spec.ts:11`).

## Decision

`apps/desktop` — the Tauri + Rust + React Continuity browser — is **the
product**. All product engineering effort goes there. The cloud (`apps/shell`
API routes + Supabase + Context Kernel) serves the desktop as its sync
backend. Nothing new ships as a web-desktop feature.

## Consequences

- The browser inherits the "OS shell" role (see ADR-002).
- The cloud keeps exactly two jobs: sync/continuity backend, and a web
  dashboard for restore-from-anywhere.
- `docs/CONTINUA_MASTER_PLAN.md` §3.4 ("Tauri ➔ Background Daemon") is
  superseded by this record: Tauri is the product surface, not a tray daemon.
- Marketing/demo story: one installable app, not "web OS + browser + daemon."
