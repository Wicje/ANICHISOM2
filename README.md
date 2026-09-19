# Continua — The Persistent Context Protocol

> **"Pick up exactly where you left off. On any machine, in any tool, at any time."**

Continua is a **continuity browser** — an Electron + Chromium desktop app
where your entire browsing context (tabs, history, scroll positions,
workspaces, profiles) follows you across machines, over TLS to your own
Continua cloud. Local-first (no account needed to browse); no cloud AI
reads your tabs. See `docs/decisions/` for what each phrase means.

```
WHAT WE BUILD (product — all investment goes here):
apps/
  desktop-electron/ — Continua Browser (Electron + Chromium). THE PRODUCT:
                WebContentsView pool (6 live, LRU discard), per-profile
                isolation (Work ↔ Personal partitions + sharded stores),
                local-first continuity (SQLite FTS + Supabase delta sync),
                workspaces, downloads manager, reader, extensions autoload,
                onboarding. Run it: npm run dev:browser
  desktop/src/  — Shared React chrome UI (used by the product above).
  shell/        — Sync backend ONLY (Next.js + Supabase): /api/context,
                /api/devices, /api/connect, pairing pages, /download.
                Web-OS UI deleted (ADR-009). No product UI investment.

FROZEN (no investment — do not build on these):
  desktop/src-tauri/ — Legacy Tauri WebKitGTK host (Linux-lite fallback).
  packages/sdk/       — Plugin SDK (archived, no importers).
  chrome-extension/   — REDUNDANT Context Bridge (MV3): kept only because
                      the backend download route zips it. No investment.
  cloudflare-worker/  — ARCHIVED edge proxy (unused; shell /api/proxy wins).
docs/
  decisions/ — Architecture Decision Records. START HERE. ADR-009 is the
               latest ground truth (shell backend-only).
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
  profiles (Work ↔ Personal: separate cookies, history, extensions), workspaces,
  memory timeline, durable recently-closed ring, per-tab back-history + scroll +
  zoom resurrection across restarts.
- **Daily-driver kit** — command palette (Ctrl+K) with local Tidy-tabs
  intelligence (on-device group suggestions, duplicates, sleeping tabs with
  wake-on-click, per-tab memory), omnibox suggestions,
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

# Sync backend (no product UI)
npm run dev:shell
npm run build:shell
```

Linux build deps: `webkit2gtk` (+ `libayatana-appindicator` for tray).

## Status & direction

- Engine: Electron Chromium is the product (ADR-008). Tauri WebKitGTK is a
  frozen Linux-lite fallback. Privacy-first/vault/E2E were deliberately
  removed — continuity is TLS + Supabase RLS.
- Design system: Apple (designmd.supply) — see `apps/desktop/DESIGN.md`.
- Next: one-click extension installs, content blocking, mobile companion
  (phone app — the backend already accepts its saves), ongoing pairing polish.

All decisions and their rationale: **`docs/decisions/`**. Plan documents
marked SUPERSEDED are historical records, not direction.
What's left and what's blocking: **`ROADMAP.md`**.

## Notes

- The desktop app is fully self-contained (`apps/desktop` has its own Vite +
  Tauri config). Its Rust backend lives in `apps/desktop/src-tauri`.
- The shell's deployment config (`vercel.json`, `.vercelignore`, Dockerfile)
  lives inside `apps/shell`. On Vercel, set the **Root Directory** to
  `apps/shell`.
