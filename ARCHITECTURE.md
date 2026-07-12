# ANICHISOM OS — Architecture

> **Single source of truth for what exists, what's missing, and what comes next.**

---

## 1. System Overview

ANICHISOM OS is a browser-based universal workspace platform. Persistent, personalized desktop that syncs across machines.

**Tech Stack:**

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.9 (strict mode) |
| UI | React 19 + Tailwind CSS 4 |
| State | Zustand 5 + idb-keyval (IndexedDB) |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Real-time | Yjs + y-websocket + y-indexeddb |
| Editors | TipTap (rich text), Monaco (code), Fabric.js (canvas) |
| AI | Gemini, OpenAI, Claude, Qwen, Local (Ollama) |
| Storage | Google Drive, Dropbox, Local (OPFS) |
| WebSocket | Express + Socket.IO |
| Deployment | Vercel (frontend) + Supabase (backend) |

**Stats:**

| Metric | Count |
|---|---|
| App components | 49 |
| Library files | 70+ |
| Test files | 37 |
| Total tests | 609 |

---

## 2. Three-Layer Architecture

```
╔═══════════════════════════════════════════════════════════╗
║  LAYER 3 — ECOSYSTEM (Marketplace)                        ║
║  [ANICHISOM Pack] [Developer] [Photography] [Clothing]    ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 2 — BUILT-IN APPS                                  ║
║  [Browser] [Campaign Lab] [Moodboard] [Files] [Calls]     ║
║  [Terminal] [Code Editor] [Notes] [Side-Gigs] [Suite]     ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 1 — CORE                                           ║
║  Supabase (auth+db+realtime) │ IndexedDB (offline)        ║
║  Yjs (collaboration) │ Event Sourcing │ Privacy Model     ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 3. Layer 1 — Core Platform

### 3.1 State Management

| Component | File | Status |
|---|---|---|
| OS Context | `lib/os-context.tsx` | ✅ Thin Zustand wrapper |
| Storage | `lib/storage.ts` | ✅ Supabase + IndexedDB dual-mode |
| OPFS File System | `lib/fs.ts` | ✅ Origin Private File System |
| Workspace Types | `lib/workspace-types.ts` | ✅ All data models |
| Sync Queue | `lib/sync-queue.ts` | ✅ Offline queue + retry |
| Zustand Stores | `lib/stores/` | ✅ 21 stores (auth, window, theme, workspace, etc.) |

### 3.2 Backend (Supabase)

| Component | File | Status |
|---|---|---|
| Client Singleton | `lib/supabase.ts` | ✅ `getSupabase()` factory |
| Database Types | `lib/supabase-types.ts` | ✅ 12 tables typed |
| CRUD Adapters | `lib/supabase-adapter.ts` | ✅ workspace, project, file, event, presence, snapshot |
| Storage Factory | `lib/storage.ts` | ✅ SupabaseAdapter + LocalAdapter |
| Schema SQL | `supabase-schema.sql` | ✅ Ready to paste into Supabase |

**Tables:** users, workspaces, projects, files, events, presence, snapshots, apps, plugins, terminals, calls, call_candidates

### 3.3 Authentication

| Component | File | Status |
|---|---|---|
| Provider Interface | `lib/auth-providers/auth-provider.ts` | ✅ |
| Provider Factory | `lib/auth-providers/provider-factory.ts` | ✅ supabase, custom |
| Supabase Provider | `lib/auth-providers/supabase-provider.ts` | ✅ Email + OAuth |
| Custom Provider | `lib/auth-providers/custom-provider.ts` | ✅ PostgreSQL |
| Session Store | `lib/session-store.ts` | ✅ Crypto-random tokens |
| Login API | `app/api/auth/login/route.ts` | ✅ |
| Session API | `app/api/auth/session/route.ts` | ✅ |
| Logout API | `app/api/auth/logout/route.ts` | ✅ |
| WebAuthn | `lib/services/webauthn.service.ts` | ✅ Passkey auth |

### 3.4 Real-time Collaboration

| Component | File | Status |
|---|---|---|
| Collaborative Doc | `lib/hooks/useCollaborativeDoc.ts` | ✅ Y.Doc + WebSocket |
| Presence | `lib/services/presence.service.ts` | ✅ 15s heartbeat |
| File Lock Manager | `lib/file-lock-manager.ts` | ✅ Edit conflict prevention |
| Event History | `lib/event-history-manager.ts` | ✅ Audit trail + undo/redo |
| Yjs WebSocket | `server.ts` | ✅ Per-IP rate limiting |
| Socket.IO | `server.ts` | ✅ CORS restricted |

### 3.5 AI Gateway

| Component | File | Status |
|---|---|---|
| Provider Interface | `lib/ai-providers/ai-provider.ts` | ✅ |
| Provider Factory | `lib/ai-providers/ai-provider-factory.ts` | ✅ Fallback chain |
| Claude | `lib/ai-providers/claude-provider.ts` | ✅ |
| Gemini | `lib/ai-providers/gemini-provider.ts` | ✅ |
| OpenAI | `lib/ai-providers/openai-provider.ts` | ✅ |
| Qwen | `lib/ai-providers/qwen-provider.ts` | ✅ |
| Local (Ollama) | `lib/ai-providers/local-provider.ts` | ✅ |

### 3.6 Plugin System

| Component | File | Status |
|---|---|---|
| Plugin SDK | `lib/plugin-sdk.ts` | ✅ postMessage RPC |
| Plugin Registry | `lib/plugin-registry.ts` | ✅ |
| Plugin Store | `lib/stores/plugin.store.ts` | ✅ |
| Plugin Service | `lib/services/plugin.service.ts` | ✅ Lifecycle + permissions |
| Plugin Sandbox | `components/apps/plugin-sandbox.tsx` | ✅ iframe sandbox |
| Marketplace UI | `components/apps/app-store.tsx` | ✅ |

### 3.7 Security

| Feature | Status |
|---|---|
| SSRF Protection | ✅ Auth + IP blocking + rate limiting |
| Session Tokens | ✅ Crypto-random 32-byte |
| CSP Headers | ✅ Domain-restricted |
| Socket.IO CORS | ✅ Restricted origins |
| Plugin Origin Verification | ✅ |
| Session Encryption | ✅ AES-GCM 256-bit |
| API Key Encryption | ✅ Encrypted before IndexedDB |
| WebAuthn/Passkeys | ✅ |
| Admin Server-Side Auth | ✅ Role checks |

---

## 4. Layer 2 — Built-in Apps

### Core Apps

| App | File(s) | Status | Replaces |
|---|---|---|---|
| Browser | `browser.tsx`, `power-browser.tsx` | ✅ | Chrome + bookmarks |
| Campaign Lab | `campaign-lab/` (6 files) | ✅ | Notion, Asana |
| Moodboard | `moodboard.tsx` | ✅ | Milanote, Pinterest |
| Files | `file-manager.tsx` | ✅ | Finder + cloud apps |
| Calls | `calls.tsx` | ⚠️ Basic | Google Meet |
| Terminal | `terminal.tsx` | ✅ | iTerm |
| Code Editor | `code-editor/` (5 files) | ✅ | VS Code (browser) |
| Notes | `notes.tsx` | ✅ | Notion Notes |

### Productivity

| App | Status |
|---|---|
| Productivity Suite (Word/Sheets/Slides) | ✅ |
| PDF Reader | ✅ |
| Side-Gigs | ✅ |
| Proposal Generator | ✅ |
| Brand Guides | ✅ |
| Client Portal | ✅ |

### System

| App | Status |
|---|---|
| Settings | ✅ |
| Control Center | ✅ |
| Command Palette | ✅ |
| App Store | ✅ |
| Admin Panel | ✅ |
| History | ✅ |
| Onboarding Wizard | ✅ |
| Feedback Widget | ✅ |

---

## 5. Layer 3 — Ecosystem

| Pack | Price | Status |
|---|---|---|
| ANICHISOM Creative Pack | $15/mo | ✅ |
| Developer Pack | $10/mo | ✅ |
| Photography Pack | $10/mo | ✅ |
| Clothing Brand Pack | $12/mo | ✅ |
| Hardware Pack | $12/mo | ✅ |
| Side Gigs Pack | $5/mo | ✅ |

---

## 6. Infrastructure

### Deployment Architecture

```
┌─────────────────────────────────────────────┐
│  Vercel (Free Tier)                          │
│  ├── Next.js 15 (standalone output)         │
│  ├── Express + Socket.IO + Yjs              │
│  └── Static assets (CDN)                    │
└──────────────┬──────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────┐
│  Supabase (Free Tier)                        │
│  ├── PostgreSQL (users, workspaces, etc.)    │
│  ├── Auth (email, Google SSO)               │
│  ├── Realtime (live subscriptions)          │
│  └── Row Level Security                     │
└─────────────────────────────────────────────┘

Cost for 200 users: $0/month
```

### Database Schema

See `supabase-schema.sql` — 12 tables, indexes, RLS policies.

### PWA & Offline

| Feature | Status |
|---|---|
| Web App Manifest | ✅ |
| Service Worker | ✅ Cache-first + offline fallback |
| Install Prompt | ✅ |
| Offline Mode | ✅ IndexedDB state restore |

### Performance (Figma-Level Targets)

| Technique | Status |
|---|---|
| Lazy app loading (dynamic imports) | ✅ All 49 apps |
| React Suspense boundaries | ✅ Loading spinners per window |
| Memoized OSContext (useMemo) | ✅ Prevents cascading re-renders |
| Precomputed highestZIndex | ✅ Eliminates O(N²) per-component |
| CSS containment | ✅ Window frames, dock, menu bar |
| Performance-mode backdrop-filter toggle | ✅ Disables blur globally in light mode |
| useTransition for search filtering | ✅ Non-blocking keystroke processing |
| useMemo for derived state | ✅ Command palette, app list, window list |
| Server package isolation | ✅ socket.io/pg/redis excluded from client |
| Font preloading | ✅ Google Fonts with preconnect |
| requestIdleCallback | ✅ SW registration + IDB snapshots |
| Debounced session checks | ✅ 2s debounce on focus/visibility |
| Throttled idle timer | ✅ 1s throttle on mousemove |
| Service worker caching | ✅ Cache-first + stale-while-revalidate |
| Offline-first state | ✅ IndexedDB primary, Supabase sync |

---

## 7. Codebase Structure

```
ANICHISOM2/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── desktop/                  # Desktop shell (11 files)
│   └── apps/                     # App components (49 files)
├── lib/
│   ├── stores/                   # Zustand stores (21 files)
│   ├── services/                 # Business logic (28 files)
│   ├── supabase.ts               # Client singleton
│   ├── supabase-adapter.ts       # All DB operations
│   ├── supabase-types.ts         # Database types
│   ├── storage.ts                # Dual-mode storage
│   ├── os-context.tsx            # OS context
│   ├── app-manifest.ts           # App registry
│   └── ...                       # 70+ lib files
├── __tests__/                    # 37 test files, 609 tests
├── supabase-schema.sql           # Database schema
├── server.ts                     # Express + Socket.IO + Yjs
├── .env.local                    # Environment config
├── VISION.md                     # Product vision
├── ARCHITECTURE.md               # This file
├── BUILD_LOG.md                  # Session log
└── README.md                     # User-facing docs
```

---

## 8. Contributing

### Verification

```bash
npx tsc --noEmit --incremental false    # Type check
npm test                                # Tests
```

### Adding an App

1. Create `components/apps/my-app.tsx`
2. Add entry to `lib/app-manifest.ts`
3. Done.

### Principles

1. **Repository Pattern** — All data through abstract interfaces
2. **Event Sourcing** — Every action is an immutable event
3. **Offline-First** — IndexedDB primary, Supabase sync
4. **Privacy by Default** — Private mode unless explicitly shared

---

*Vision: `VISION.md` | Progress: `BUILD_LOG.md`*
