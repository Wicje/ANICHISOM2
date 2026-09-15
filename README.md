# Continua — The Persistent Context Protocol

> **"Pick up exactly where you left off. On any machine, in any tool, at any time."**

Monorepo layout:

```
apps/
  desktop/   — Continua Browser (Tauri + React). The desktop-first product:
               single-window tabbed browser (in-app overlay), encrypted
               vault tabs, session restore, history, bookmarks, private tabs.
  shell/     — ContinuaOS web shell (Next.js + Supabase). The cloud OS
               workspace / dashboard (formerly the repo root).
packages/
  sdk/       — Public plugin SDK (`continuaos-sdk`).
chrome-extension/   — Continua Context Bridge (Manifest V3).
cloudflare-worker/  — RLS proxy worker.
scripts/     — Shared build/automation scripts.
docs/        — Design + roadmap docs (see docs/CONTINUA_BROWSER_PLAN.md).
```

## Quick start

```bash
npm install            # installs all workspaces (legacy-peer-deps in .npmrc)

# Desktop browser (primary product)
npm run dev:desktop     # vite dev (port 1420)
npm run tauri -w apps/desktop build   # Tauri CLI in apps/desktop
npm run build:desktop   # frontend typecheck + vite build
npm run test:desktop    # Rust unit tests (cargo test)
npm run bundle:desktop  # tauri build (bundles/installers)

# Web shell
npm run dev:shell
npm run build:shell
```

## Notes

- The desktop app is fully self-contained (`apps/desktop` has its own Vite +
  Tauri config). Its Rust backend lives in `apps/desktop/src-tauri`.
- The shell's deployment config (`vercel.json`, `.vercelignore`, Dockerfile)
  lives inside `apps/shell`. On Vercel, set the **Root Directory** to
  `apps/shell` in the project settings.
- Per-package docs: shell architecture history in `apps/shell/ARCHITECTURE.md`,
  browser roadmap in `docs/CONTINUA_BROWSER_PLAN.md`.