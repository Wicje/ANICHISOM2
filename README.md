# Continua — The Persistent Context Protocol

> **"Pick up exactly where you left off. On any machine, in any tool, at any time."**

Continua is a **continuity browser** — a Tauri desktop app where your entire
browsing context (tabs, history, scroll positions, workspaces) follows you
across machines, encrypted, via your own cloud.

```
apps/
  desktop/   — Continua Browser (Tauri + React). THE PRODUCT:
               single-window tabbed browser, vault tabs (OS-keyring
               encryption), session restore + memory timeline, workspaces,
               device trust, encrypted sync, incognito, reader mode.
  shell/     — ContinuaOS web shell (Next.js + Supabase). FROZEN
               EXPERIMENT + cloud backend: the sync/continuity API and
               restore dashboard live here. No further product investment
               (ADR-004).
packages/
  sdk/       — Plugin SDK (dormant, Phase 3).
chrome-extension/   — Continua Context Bridge (Manifest V3).
cloudflare-worker/  — Edge proxy (unused; shell has its own /api/proxy).
docs/
  decisions/ — Architecture Decision Records. START HERE.
```

## What the browser does today

- **Tabs that remember** — full tab graph with per-tab back/forward history
  and scroll resurrection; snapshots on exit and every few seconds; restore
  on launch.
- **Memory timeline** — every checkpoint reviewable; restore any moment.
- **Workspaces** — save the live tab graph under a name; switch contexts in
  one click.
- **Vault tabs** — mark any tab "vaulted": its URL/title/history live only
  in the OS keyring; session files and cloud sync carry an opaque id.
  Closing a vault tab destroys the only copy.
- **Encrypted sync** — pair with a PIN to your Continua cloud; push/pull
  your whole session between your machines.
- **Privacy-first chrome** — favicons fetched from the site origin (never a
  third-party service), incognito tabs excluded from all persistence, real
  CSP.
- **Daily ergonomics** — command palette (Ctrl+K), find-in-page, reader
  mode, native zoom, immersive mode, dark/light themes, speed dial,
  bookmarks, recently-closed ring, downloads with toasts.

## Quick start

```bash
npm install            # installs all workspaces (legacy-peer-deps in .npmrc)

# Desktop browser (the product)
npm run dev:desktop     # vite dev (port 1420)
npm run build:desktop   # frontend typecheck + vite build
npm run test:desktop    # Rust unit tests (cargo test)
npm run bundle:desktop  # tauri build (bundles/installers)

# Web shell (experiment + backend)
npm run dev:shell
npm run build:shell
```

Linux build deps: `webkit2gtk` (+ `libayatana-appindicator` for tray).

## Status & direction

- Phase 0 (privacy/hygiene) — done. See `docs/decisions/ADR-006`.
- Phase 1 — multi-live-webview pool: background tabs keep audio/SPA state
  (ADR-003). This is the daily-driver gate (ADR-005).
- Phase 2 — shell surfaces in the browser: Home, app windows (ADR-002).
- Phase 3 — plugin SDK + ecosystem.

All decisions and their rationale: **`docs/decisions/`**. Plan documents
marked SUPERSEDED are historical records, not direction.

## Notes

- The desktop app is fully self-contained (`apps/desktop` has its own Vite +
  Tauri config). Its Rust backend lives in `apps/desktop/src-tauri`.
- The shell's deployment config (`vercel.json`, `.vercelignore`, Dockerfile)
  lives inside `apps/shell`. On Vercel, set the **Root Directory** to
  `apps/shell`.
