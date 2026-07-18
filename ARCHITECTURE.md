# ContinuaOS — Architecture

> **Single source of truth for what exists, what's missing, and what comes next.**

---

## 1. System Overview

ContinuaOS is a browser-based universal workspace platform. Persistent, personalized desktop that syncs across machines.

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
| Storage | OPFS (primary), IndexedDB (fallback), Cloud APIs |
| WebSocket | Express + Socket.IO |
| Terminal | xterm.js + VirtualFS + OPFS bridge |
| Deployment | Vercel (frontend) + Supabase (backend) |

**Stats:**

| Metric | Count |
|---|---|
| App components | 33 (in manifest) |
| Library files | 70+ |
| Test files | 40 |
| Total tests | 632 |

---

## 2. Three-Layer Architecture

```
╔═══════════════════════════════════════════════════════════╗
║  LAYER 3 — ECOSYSTEM (Marketplace)                        ║
║  [ContinuaOS Pack] [Developer] [Photography] [Clothing]    ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 2 — BUILT-IN APPS                                  ║
║  [Browser] [Campaign Lab] [Moodboard] [Files] [Calls]     ║
║  [Terminal] [Code Editor] [Productivity Suite] [PDF]       ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 1 — CORE                                           ║
║  Supabase (auth+db+realtime) │ IndexedDB (offline)        ║
║  Yjs (collaboration) │ Event Sourcing │ Privacy Model     ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 3. Layer 1 — Core Platform

### 3.1 State Management

| Component | File | Description |
|---|---|---|
| OS Context | `lib/os-context.tsx` | Central React context wrapping all Zustand stores |
| Storage | `lib/storage.ts` | Dual-mode: Supabase (online) + IndexedDB (offline) |
| OPFS File System | `lib/fs.ts` | Origin Private File System with .meta companion files |
| VirtualFS | `lib/terminal/virtual-fs.ts` | Terminal's FS abstraction over OPFS; dispatches `os:fs-changed` events |
| Workspace Types | `lib/workspace-types.ts` | All data models (Workspace, Project, File, Event) |
| Sync Queue | `lib/sync-queue.ts` | Offline event queue with retry |
| Zustand Stores | `lib/stores/` | 18 stores (see table below) |

**Zustand Stores (`lib/stores/`):**

| Store | File | Purpose |
|---|---|---|
| Auth | `auth.store.ts` | User session, login state, `sessionChecked` flag |
| Window | `window.store.ts` | Window lifecycle, single-instance apps, z-index |
| Theme | `theme.store.ts` | Colors, fonts, wallpaper, shaders, dark mode |
| Workspace | `workspace.store.ts` | Active workspace, installed apps, snapshots |
| File | `file.store.ts` | Smart route resolution, compatible apps |
| Browser | `browser.store.ts` | Tabs, pinned apps, sidebar, split view |
| Campaign | `campaign.store.ts` | Pages, databases, notifications, share links |
| Moodboard | `moodboard.store.ts` | Nodes, edges, viewport, selection |
| Plugin | `plugin.store.ts` | Installed plugins, enable/disable state |
| Privacy | `privacy.store.ts` | Per-app privacy levels, restricted users |
| Marketplace | `marketplace.store.ts` | Marketplace plugins (UI queries only) |
| Notification | `notification.store.ts` | In-app toast notifications |
| Onboarding | `onboarding.store.ts` | First-launch wizard state |
| Feedback | `feedback.store.ts` | User feedback submissions |
| Brand | `brand.store.ts` | Brand guidelines data |
| DevOps | `devops.store.ts` | Deployment tracking |
| Forensics | `forensics.store.ts` | Ziklag forensics case data |
| DevTools | `devtools.store.ts` | Developer tools state |

### 3.2 Backend (Supabase)

| Component | File | Description |
|---|---|---|
| Client Singleton | `lib/supabase.ts` | `getSupabase()` factory using `@supabase/ssr` |
| Database Types | `lib/supabase-types.ts` | 12 tables typed |
| CRUD Adapters | `lib/supabase-adapter.ts` | workspace, project, file, event, presence, snapshot |
| Storage Factory | `lib/storage.ts` | SupabaseAdapter + LocalAdapter |
| Schema SQL | `supabase-schema.sql` | Ready to paste into Supabase SQL Editor |

**Tables:** users, workspaces, projects, files, events, presence, snapshots, apps, plugins, terminals, calls, call_candidates

### 3.3 Authentication

| Component | File | Description |
|---|---|---|
| Provider Interface | `lib/auth-providers/auth-provider.ts` | Abstract auth interface |
| Provider Factory | `lib/auth-providers/provider-factory.ts` | supabase, custom |
| Supabase Provider | `lib/auth-providers/supabase-provider.ts` | Email + OAuth |
| Custom Provider | `lib/auth-providers/custom-provider.ts` | PostgreSQL |
| Session Store | `lib/session-store.ts` | Crypto-random tokens |
| Login API | `app/api/auth/login/route.ts` | POST /api/auth/login |
| Session API | `app/api/auth/session/route.ts` | GET /api/auth/session |
| Logout API | `app/api/auth/logout/route.ts` | POST /api/auth/logout |
| WebAuthn | `lib/services/webauthn.service.ts` | Passkey auth |

### 3.4 Real-time Collaboration

| Component | File | Description |
|---|---|---|
| Collaborative Doc | `lib/hooks/useCollaborativeDoc.ts` | Y.Doc + WebSocket + IndexedDB persistence |
| Presence | `lib/services/presence.service.ts` | 15s heartbeat, cursor tracking |
| File Lock Manager | `lib/file-lock-manager.ts` | Edit conflict prevention |
| Event History | `lib/event-history-manager.ts` | Audit trail + undo/redo |
| Yjs WebSocket | `server.ts` | Per-IP rate limiting |
| Socket.IO | `server.ts` | CORS restricted, MCP bridge |

### 3.5 AI Gateway

| Component | File | Description |
|---|---|---|
| Provider Interface | `lib/ai-providers/ai-provider.ts` | Abstract chat/stream interface |
| Provider Factory | `lib/ai-providers/ai-provider-factory.ts` | Fallback chain: local → cloud |
| Claude | `lib/ai-providers/claude-provider.ts` | Anthropic Claude |
| Gemini | `lib/ai-providers/gemini-provider.ts` | Google Gemini |
| OpenAI | `lib/ai-providers/openai-provider.ts` | GPT-4, GPT-4o |
| Qwen | `lib/ai-providers/qwen-provider.ts` | Alibaba Qwen |
| Local (Ollama) | `lib/ai-providers/local-provider.ts` | Self-hosted models |

### 3.6 Plugin System

| Component | File | Description |
|---|---|---|
| Plugin SDK | `lib/plugin-sdk.ts` | postMessage RPC, origin verification |
| Plugin Registry | `lib/plugin-registry.ts` | Install/uninstall/enable lifecycle |
| Plugin Store | `lib/stores/plugin.store.ts` | Persisted install states |
| Plugin Service | `lib/services/plugin.service.ts` | Lifecycle + permissions |
| Plugin Sandbox | `components/apps/plugin-sandbox.tsx` | iframe sandbox with `allow-scripts` only |
| App Store | `components/apps/app-store.tsx` | Browse/install/register plugins |

### 3.7 Proxy & Security

| Component | File | Description |
|---|---|---|
| Proxy Route | `app/api/proxy/route.ts` | SSRF protection, rate limiting, URL rewriting |
| CSP Builder | `app/api/proxy/route.ts` | Domain-restricted Content-Security-Policy |
| SSRF Blocker | `app/api/proxy/route.ts` | Private IP ranges, localhost, internal names |
| Rate Limiter | `app/api/proxy/route.ts` | 60 req/min per IP, in-memory |

**Security Features:**
- Session tokens: crypto-random 32-byte
- Plugin origin verification: throws on unknown parent origin
- API key encryption: AES-GCM 256-bit before IndexedDB
- Admin server-side auth: role checks on all admin endpoints
- Frame-busting neutralization in proxied content

---

## 4. Layer 2 — Built-in Apps

### App Registry System

Apps are registered in `lib/app-manifest.ts` with two structures:

1. **`appRegistry`** — Dynamic import map: `appId → () => import(path)`
   - Used by `resolveAppComponent()` to lazily load components
   - Only loaded when a window opens (code splitting)

2. **`APP_MANIFEST`** — Static metadata array: `{ id, title, icon, roles, isCore, category, description }`
   - Used by Command Palette, Launchpad, Dock, Assistant for listing
   - Each entry's `id` MUST match a key in `appRegistry`

**Adding a new app:**
1. Create `components/apps/my-app.tsx` exporting a component
2. Add dynamic import: `'my-app': () => import('@/components/apps/my-app')`
3. Add metadata: `{ id: 'my-app', component: null, icon: ..., title: '...', roles: [...], isCore: false, category: '...' }`
4. Done — lazy-loaded on first open

### Core Apps (isCore: true)

| App | File(s) | Description |
|---|---|---|
| Terminal | `terminal.tsx` | xterm.js + VirtualFS, real OPFS commands |
| File Manager | `file-manager.tsx` | OPFS browser + cloud shortcuts, auto-refreshes on `os:fs-changed` |
| Settings | `settings.tsx` | Theme, performance, privacy, keybinds |
| App Store | `app-store.tsx` | Plugin registry UI with publish flow |
| Admin Panel | `admin-panel.tsx` | User management, system config |

### Productivity Apps

| App | File(s) | Description |
|---|---|---|
| Power Browser | `power-browser.tsx` | Iframe browser with proxy, pinned apps, search engine selector (G/D/B) |
| Campaign Lab | `campaign-lab/` (6 files) | Notion-like pages + databases, Yjs collaboration |
| Moodboard | `moodboard/` (8 files) | Free-form canvas, draggable nodes, voting |
| Code Editor | `code-editor/` (5 files) | Monaco editor with live preview |
| Productivity Suite | `productivity-suite.tsx` | Word/Sheets/Slides with hot-formula-parser |
| PDF Reader | `pdf-reader.tsx` | PDF viewer with iframe |
| Calls | `calls.tsx` | Google Meet embed |
| Side Gigs | `side-gigs-pack.tsx` | Gig management with income tracking |
| Proposal Generator | `proposal-generator.tsx` | Client proposals |
| Brand Guides | `brand-guides.tsx` | Brand style guide editor |
| Client Portal | `client-portal.tsx` | Client-facing project portal |
| Assistant | `assistant.tsx` | AI chat with OS context (knows all apps) |

### Media Apps

| App | File(s) | Description |
|---|---|---|
| Media Player | `media-player.tsx` | Video/audio playback |
| Screen Recorder | `screen-recorder.tsx` | Browser screen recording |
| Color Picker | `color-picker.tsx` | Color selection tool |
| Photography Pack | `photography-pack.tsx` | Gallery, client delivery, print orders |

### System Apps

| App | File(s) | Description |
|---|---|---|
| Plugin Sandbox | `plugin-sandbox.tsx` | iframe isolation with postMessage |
| Config Manager | `config-manager.tsx` | System configuration |
| History | `history.tsx` | Activity history |
| Privacy Settings | `privacy-settings.tsx` | Per-app privacy controls |
| Hardware Manager | `hardware-manager.tsx` | Device management |

### Venture Packs (Layer 3)

| Pack | File | Description |
|---|---|---|
| Developer Pack | `developer-pack.tsx` | Freelance dev tools |
| Clothing Brand Pack | `clothing-brand-pack.tsx` | Fashion + model-viewer 3D |
| Hardware Pack | `hardware-pack.tsx` | Electronics + model-viewer 3D |
| Ziklag Tools | `ziklag-tools.tsx` | Platform tools |
| Ziklag Forensics | `ziklag-forensics-pack.tsx` | Case management, evidence, chain of custody |
| Asset Pipeline | `asset-pipeline.tsx` | Asset processing |

---

## 5. File System Architecture

### OPFS (Origin Private File System)

```
lib/fs.ts                    # Core FS module (OPFS primary, IndexedDB fallback)
├── FS.read(path)            # Read file → { id, name, content, size, mimeType }
├── FS.write(path, data)     # Write file + .meta companion
├── FS.readDir(path)         # List directory (skips .meta files)
├── FS.delete(path)          # Remove file + .meta companion
└── Object URL caching       # Binary files → blob URLs for instant rendering
```

### Terminal ↔ File Manager Sync

```
Terminal (terminal.tsx)
  → VirtualFS (virtual-fs.ts)
    → FS.write() / FS.delete()
      → Dispatches 'os:fs-changed' CustomEvent

File Manager (file-manager.tsx)
  → Listens for 'os:fs-changed' events
    → Calls fetchFiles() to refresh directory listing
```

### .meta Companion Files

Every file written to OPFS gets a `.meta` companion containing `{ mimeType }`. This allows:
- Correct MIME detection without reading file content
- File type icons in the File Manager
- Smart route resolution for opening files

---

## 6. Desktop Shell

### Window Management (`components/desktop/`)

| Component | File | Description |
|---|---|---|
| Desktop | `index.tsx` | Main shell: renders windows, wallpaper, shaders |
| Window Frame | `../window-frame.tsx` | Draggable/resizable window with title bar |
| Menu Bar | `menu-bar.tsx` | Top bar: app menu, workspace switcher |
| Dock | `dock.tsx` | Bottom dock: all role-eligible apps |
| Launchpad | `launchpad.tsx` | Full app grid with search |
| Mission Control | `mission-control.tsx` | Workspace overview |
| Control Center | `control-center.tsx` | Quick settings panel |
| Command Palette | `../command-palette.tsx` | Cmd+K: search apps, files, clipboard |
| Lock Screen | `lock-screen.tsx` | 5-min idle timeout |
| Context Menu | `context-menu.tsx` | Right-click menu |
| Window Switcher | `window-switcher.tsx` | Ctrl+Tab cycling |
| Desktop Icons | `desktop-icons.tsx` | File shortcuts |
| Widgets | `widgets.tsx` | Sticky notes, CPU monitor |
| Snapshots | `snapshots-menu.tsx` | Save/restore window layouts |

### Error Handling

| Component | File | Description |
|---|---|---|
| WindowErrorBoundary | `index.tsx` | React class error boundary per window |
| AppCrashFallback | `index.tsx` | Crash UI with retry button |
| Failed Import Tracking | `index.tsx` | `failedImportsRef` prevents infinite loading skeletons |

### Onboarding

| Component | File | Description |
|---|---|---|
| Onboarding Wizard | `onboarding-wizard.tsx` | 3-step: Welcome → Pick Apps → Desktop |
| Login Screen | `login-screen.tsx` | Email/password + dev master key |

---

## 7. Infrastructure

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

Cost for 70 beta users: $0/month
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

### Performance

| Technique | Status |
|---|---|
| Lazy app loading (dynamic imports) | ✅ All 33 apps |
| React Suspense boundaries | ✅ Loading spinners per window |
| Memoized OSContext (useMemo) | ✅ Prevents cascading re-renders |
| Granular Zustand selectors | ✅ Desktop uses per-field selectors |
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

## 8. Codebase Structure

```
ContinuaOS2/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Login, session, logout
│   │   ├── proxy/                # SSRF-protected proxy
│   │   └── storage/              # Cloud storage connectors
│   ├── layout.tsx                # Root layout (fonts, globals)
│   └── page.tsx                  # Entry point → Desktop
├── components/
│   ├── desktop/                  # Desktop shell (11 files)
│   │   ├── index.tsx             # Main shell, error boundary, window rendering
│   │   ├── menu-bar.tsx          # Top menu bar
│   │   ├── dock.tsx              # Bottom dock
│   │   ├── launchpad.tsx         # App grid with search
│   │   └── ...
│   ├── apps/                     # App components (33 in manifest)
│   │   ├── terminal.tsx          # xterm.js + VirtualFS
│   │   ├── file-manager.tsx      # OPFS browser + cloud shortcuts
│   │   ├── power-browser.tsx     # Proxy browser with search engine selector
│   │   ├── campaign-lab/         # Notion-like pages + databases
│   │   ├── moodboard/            # Free-form canvas
│   │   ├── code-editor/          # Monaco editor
│   │   ├── assistant.tsx         # AI chat with OS context
│   │   └── ...
│   ├── window-frame.tsx          # Draggable/resizable window
│   └── command-palette.tsx       # Cmd+K search
├── lib/
│   ├── stores/                   # Zustand stores (18 files)
│   │   ├── window.store.ts       # Window lifecycle, single-instance
│   │   ├── auth.store.ts         # Session, sessionChecked
│   │   ├── theme.store.ts        # Colors, fonts, shaders
│   │   └── ...
│   ├── services/                 # Business logic (25+ files)
│   ├── ai-providers/             # AI provider implementations (6 files)
│   ├── auth-providers/           # Auth provider implementations
│   ├── hooks/                    # Custom React hooks
│   ├── terminal/                 # Terminal subsystem
│   │   ├── virtual-fs.ts         # VirtualFS over OPFS
│   │   └── commands.ts           # Shell commands (ls, cd, mkdir, etc.)
│   ├── supabase.ts               # Client singleton
│   ├── supabase-adapter.ts       # All DB operations
│   ├── supabase-types.ts         # Database types
│   ├── storage.ts                # Dual-mode storage
│   ├── fs.ts                     # OPFS file system
│   ├── os-context.tsx            # Central React context
│   ├── app-manifest.ts           # App registry + metadata
│   ├── plugin-registry.ts        # Plugin lifecycle
│   ├── plugin-sdk.ts             # Plugin SDK
│   └── ...
├── __tests__/                    # 40 test files, 632 tests
├── supabase-schema.sql           # Database schema
├── server.ts                     # Express + Socket.IO + Yjs
├── .env.local                    # Environment config
├── VISION.md                     # Product vision
├── ARCHITECTURE.md               # This file
├── BUILD_LOG.md                  # Session log
└── README.md                     # User-facing docs
```

---

## 9. Contributing

### Verification Gates

```bash
npx tsc --noEmit --incremental false    # Type check (must be clean)
npx vitest run                          # Tests (all must pass)
```

### Adding an App

1. Create `components/apps/my-app.tsx` exporting a component that accepts `{ window: OSWindow }`
2. Add dynamic import to `appRegistry` in `lib/app-manifest.ts`
3. Add metadata to `APP_MANIFEST` array with matching `id`
4. Assign roles: which user types can see this app
5. Done — lazy-loaded on first open

### Key Conventions

- **`generateId(prefix?)`** in `lib/utils.ts` — use for all IDs (not `Math.random`)
- **`os:fs-changed` event** — dispatch after any FS mutation for File Manager sync
- **`os:notify` event** — dispatch for in-app toasts
- **Single-instance apps** — listed in `SINGLE_INSTANCE_APPS` in `window.store.ts`
- **.meta companion files** — automatically created by `FS.write()` for MIME persistence
- **Granular Zustand selectors** — always use field-level selectors in components to prevent re-render cascading

### Principles

1. **Lazy Everything** — Apps, services, and heavy deps load on demand via dynamic import
2. **Offline-First** — IndexedDB primary, Supabase sync when online
3. **Privacy by Default** — Private mode unless explicitly shared
4. **Event-Driven Sync** — File system changes broadcast via CustomEvent for cross-component refresh
5. **Security at the Edge** — SSRF protection, rate limiting, origin verification at proxy boundary

---

*Vision: `VISION.md` | Progress: `BUILD_LOG.md`*
