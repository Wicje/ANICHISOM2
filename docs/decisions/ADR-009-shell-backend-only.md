# ADR-009 — Shell becomes backend-only (web-OS UI deleted)

- **Status:** ACCEPTED (2026-09-18)
- **Amends:** ADR-004 (shell frozen as experiment + live backend)

## Context

ADR-004 kept `apps/shell` as a frozen web-desktop experiment whose API routes
serve the browsers' sync (`/api/context/*`, `/api/devices/*`,
`/api/connect/*`). The experiment surface (~200 files: `components/desktop`,
`components/apps`, `app/os`, landing, SDK docs, OS e2e) had no investment path
and its docs/landing contradicted the browser-first direction. The browsers
call only the API routes plus the `/connect` pairing pages and `/download`.

## Decision

1. Delete the web-OS UI: `components/{desktop,apps,landing,…}`, `app/os`,
   `app/docs`, `content/`, `refs/`, OS e2e specs, `__tests__/components`,
   `lib/app-manifest` + `lib/plugin-registry` (plugin system with no registry).
2. Keep the backend intact: all of `app/api/**`, `lib/` (minus the two files
   above), `utils/supabase`, `supabase/`, pairing pages (`app/connect`),
   mobile share (`app/m`), `/download`, middleware + security headers.
3. `/` becomes a backend status page linking `/download`, `/connect`,
   `/api/health`. Sitemap drops `/os`.

## Consequences

- `npm run build:shell` / `test:shell` keep passing on the smaller tree.
- Sync/pairing/download contracts unchanged — no browser edits needed.
- `lib/stores` + `lib/services` remain as follow-up cleanup (unused by kept
  routes except `api/email`, harmless while unreferenced by UI).
