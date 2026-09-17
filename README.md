# Continua — The Persistent Context Protocol

> **"Pick up exactly where you left off. On any machine, in any tool, at any time."**

Continua is a **continuity browser** — a Tauri desktop app where your entire
browsing context (tabs, history, scroll positions, workspaces) follows you
across machines, encrypted, via your own cloud.

```
apps/
  desktop-electron/ — Continua Browser (Electron + Chromium). THE PRODUCT:
                WebContentsView pool (6 live, LRU discard), local-first
                continuity (SQLite FTS + Supabase delta sync), workspaces,
                downloads manager, reader, extensions autoload, onboarding.
                Run it: npm run dev:browser
  desktop/   — React chrome + legacy Tauri WebKitGTK host (frozen lite
                fallback). Chrome UI in src/ is shared by both hosts.
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

## Download

- Linux **AppImage** (v0.1.0, legacy Tauri build) + install guide: the
  **Download** page (`/download`, manifest-driven).
- Fresh **Chromium** builds (AppImage/deb/dmg/nsis) are published to
  **GitHub Releases** on every `v*` tag via the `browser` release job.
- From source: `npm install && npm run build:browser-chrome && npm run dev:browser`.

## What the browser does today

- **Tabs that stay alive** — pooled Chromium views (6 live, LRU discard to
  metadata); switching live tabs is instant, discarded tabs rehydrate
  swap-on-ready (no white flash).
- **Continuity without the tax** — local-first session (autosave + snapshots),
  delta sync to your Continua cloud over TLS, merge-on-pull (never destructive),
  workspaces, memory timeline, recently-closed ring.
- **Daily-driver kit** — command palette (Ctrl+K), omnibox suggestions,
  find-in-page, reader mode, per-tab zoom + mute badges, vertical tab rail,
  screenshot (Ctrl+Shift+S), print/PDF, downloads manager, history search,
  bookmark import (Chrome/Firefox HTML), extensions autoload, onboarding.

## Quick start

```bash
npm install            # installs all workspaces (legacy-peer-deps in .npmrc)

# Continua Browser (the product — Electron + Chromium)
npm run dev:browser     # launch the browser
npm run build:browser-chrome  # build the React chrome (apps/desktop/dist)
npm run test:browser    # pool + sync unit tests with perf budgets

# Legacy Tauri host (frozen lite fallback)
npm run dev:desktop
npm run build:desktop
npm run test:desktop    # Rust unit tests (cargo test)

# Web shell (experiment + backend)
npm run dev:shell
npm run build:shell
```

Linux build deps: `webkit2gtk` (+ `libayatana-appindicator` for tray).

## Status & direction

- Engine: Electron Chromium is the product (ADR-008). Tauri WebKitGTK is a
  frozen Linux-lite fallback. Privacy-first/vault/E2E were deliberately
  removed — continuity is TLS + Supabase RLS.
- Design system: Apple (designmd.supply) — see `apps/desktop/DESIGN.md`.
- Next: password-manager story (Bitwarden via extension autoload), tab
  groups, mobile companion (see below), backend pairing polish.

All decisions and their rationale: **`docs/decisions/`**. Plan documents
marked SUPERSEDED are historical records, not direction.

## Notes

- The desktop app is fully self-contained (`apps/desktop` has its own Vite +
  Tauri config). Its Rust backend lives in `apps/desktop/src-tauri`.
- The shell's deployment config (`vercel.json`, `.vercelignore`, Dockerfile)
  lives inside `apps/shell`. On Vercel, set the **Root Directory** to
  `apps/shell`.
