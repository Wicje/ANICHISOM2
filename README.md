# ANICHISOM OS

**The Universal Workspace Platform** — A browser-based operating system that eliminates machine-switching and context-switching friction for anyone running multiple ventures.

> Your workspace follows you. Open on any machine, close, reopen on another — everything restores exactly where you left off.

---

## Table of Contents

1. [What ANICHISOM OS Is](#1-what-anichisom-os-is)
2. [Quick Start (Development)](#2-quick-start-development)
3. [Beta Tester Onboarding](#3-beta-tester-onboarding)
4. [Architecture Overview](#4-architecture-overview)
5. [Built-in Apps](#5-built-in-apps)
6. [Venture Packs](#6-venture-packs)
7. [Configuration & Environment](#7-configuration--environment)
8. [Deployment](#8-deployment)
9. [Development Guide](#9-development-guide)
10. [Project Structure](#10-project-structure)
11. [Testing](#11-testing)
12. [Security](#12-security)
13. [Contributing](#13-contributing)

---

## 1. What ANICHISOM OS Is

ANICHISOM OS runs in your browser and gives you a persistent desktop environment — windows, apps, files, and sessions — that syncs across machines. It replaces 5-10 separate tools with one unified workspace.

### The Core Experience

```
1. Open anichisom.com in any browser (or install the PWA)
2. Log in with your passkey, email, or Google SSO
3. Your exact workspace loads: windows positioned, apps open, files at last scroll
4. Close on any machine → reopen on any other → everything restores
```

### Who It's For

| Persona | What They Get |
|---|---|
| **Creative Agency** | Browser with Figma/Framer/Webflow pinned, Campaign Lab (Notion replacement), Moodboard (Milanote replacement), Files (unified cloud bridge) |
| **Freelancer** | Portable workspace across client machines, Side-Gigs for time tracking + invoicing, Proposal Generator |
| **Developer** | Terminal, Code Editor (Monaco), Deployment Tracker, API Monitor |
| **Student** | Notes, PDF Reader, research tools pinned in browser, personal cloud files |
| **Multi-venture Operator** | Separate workspace contexts per venture, each with its own apps and files |

---

## 2. Quick Start (Development)

### Prerequisites

- Node.js v18+
- npm or yarn

### Install & Run

```bash
# Clone the repo
git clone <repo-url>
cd ANICHISOM2

# Install dependencies
npm install

# Configure environment (see Section 7)
cp .env.example .env.local
# Edit .env.local with your keys

# Start development server
npm run dev
```

The OS starts at `http://localhost:3000`.

### Minimal Setup (No External APIs)

For local exploration, you only need:

```env
NEXT_PUBLIC_AUTH_PROVIDER=custom
DEV_MASTER_KEY=any-secret-string
DATABASE_URL=postgresql://user:password@localhost:5432/anichisom
```

Or use the dev master key shortcut to bypass auth entirely in development.

### What Works Without API Keys

| Feature | Requires API Key? |
|---|---|
| Desktop, window management, themes | No |
| App launcher, command palette | No |
| Local file system (OPFS) | No |
| Notes, PDF Reader, Terminal | No |
| Campaign Lab, Moodboard (local state) | No |
| Code Editor (Monaco) | No |
| AI features (chat, proposals) | Yes — at least one of: Gemini, OpenAI, Claude |
| Cloud files (Drive, Dropbox) | Yes — OAuth credentials per provider |
| Real-time collaboration | Yes — Firebase or Supabase |

---

## 3. Beta Tester Onboarding

### What to Expect

You're testing a browser-based workspace platform. Think of it as "your desktop, in a browser, that follows you everywhere."

**Key things to try:**

1. **Open a few apps** — Terminal, Notes, Campaign Lab, Moodboard. Arrange windows how you like.
2. **Close the tab. Reopen it.** Your windows should restore exactly where they were.
3. **Try the Command Palette** — `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux). Launch any app from here.
4. **Pin a website** — Open the Browser app, pin Figma, Claude.ai, or any tool you use. It becomes a "native" app in your launcher.
5. **Connect cloud storage** — In the Files app, connect Google Drive or Dropbox. Your files appear alongside local files.
6. **Install a venture pack** — From the App Store, install the Developer Pack, Photography Pack, or others relevant to your work.

### Giving Feedback

**The feedback widget is built into the OS.** Look for the floating button in the bottom-right corner of the screen.

You can report:
- **Bugs** — Something broke or doesn't work right
- **Features** — Something you wish it did
- **UX Issues** — Something that's confusing or awkward
- **General** — Anything else

Each feedback submission includes:
- Type (bug/feature/UX/general)
- Title and description
- Star rating (1-5)
- Which app it's related to (optional)

Feedback is stored locally in IndexedDB and synced when connected.

### What's Working Now (Beta)

| App | Status | Notes |
|---|---|---|
| Desktop & Window Management | Working | Full macOS-style desktop with dock, menu bar, windows |
| Command Palette | Working | `Cmd+K` / `Ctrl+K` |
| Browser (Power Browser) | Working | Pin websites, persistent sessions, split view |
| Campaign Lab | Working | Notion replacement — hierarchy, views, templates |
| Moodboard | Working | Milanote replacement — canvas, voting, export |
| Files | Working | Unified cloud bridge — Drive, Dropbox, OneDrive, local |
| Terminal | Working | Command execution, AI integration |
| Code Editor | Working | Monaco-based IDE with collaboration |
| Notes / PDF Reader | Working | Rich text editing, PDF viewing |
| Side-Gigs | Working | Time tracking, invoicing, client management |
| Proposal Generator | Working | AI-powered proposal creation |
| Brand Guides | Working | Brand style guide editor |
| Client Portal | Working | Read-only client view with approvals |
| Developer Pack | Working | Deployments, code review, API monitoring |
| Photography Pack | Working | Gallery, delivery, watermarking, prints |
| Clothing Pack | Working | Lookbook, suppliers, collection planning |
| Hardware Pack | Working | BOM, firmware, suppliers, components |
| Onboarding Wizard | Working | 3-step setup on first launch |
| Feedback Widget | Working | Bottom-right floating button |
| Settings | Working | Wallpaper, theme, fonts, shaders |

### Known Limitations (Beta)

- **Calls app** — Basic WebRTC only. No campaign linking or auto meeting notes yet.
- **Offline mode** — Partial. Most features work offline; cloud sync pauses and resumes.
- **Real-time collaboration** — Requires Firebase or Supabase configuration.
- **Mobile** — Not optimized for mobile. Desktop/laptop browsers only for now.

---

## 4. Architecture Overview

### Three-Layer Design

```
╔═══════════════════════════════════════════════════════════╗
║  LAYER 3 — ECOSYSTEM (Marketplace, install what you need) ║
║                                                           ║
║  [ANICHISOM Pack] [Ziklag Forensics] [Clothing Brand]    ║
║  [Hardware Pack] [Developer Pack] [Photography Pack] [+]  ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 2 — BUILT-IN APPS (Come with every workspace)      ║
║                                                           ║
║  [Browser]  [Campaign Lab]  [Moodboard]  [Files]          ║
║  [Calls]  [Notes]  [Terminal]  [Code Editor]              ║
║  [Side-Gigs]  [Productivity Suite]                        ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 1 — THE CORE (The platform itself)                 ║
║                                                           ║
║  Persistent State | Auth | Real-time | Event Sourcing     ║
║  Privacy Model | File Bridge | Plugin System | Security   ║
╚═══════════════════════════════════════════════════════════╝
```

**Layer 1 (Core)** — The platform engine. State persistence (IndexedDB), authentication (5 providers), real-time sync (Yjs/WebSocket), event sourcing, privacy model, cloud file bridge, plugin system.

**Layer 2 (Built-in Apps)** — Ship with every workspace. Replace 5-10 separate tools. Browser is the most important — it's the integration layer for all web-based tools (Figma, Claude.ai, Webflow, etc.).

**Layer 3 (Ecosystem)** — Installable packs per workspace. The platform grows without the core team building everything. First-party packs: ANICHISOM Creative, Ziklag Forensics, Clothing, Hardware, Developer, Photography.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.9 (strict mode) |
| UI | React 19 + Tailwind CSS 4 |
| State | Zustand 5 + idb-keyval (IndexedDB) |
| Real-time | Yjs + y-websocket + y-indexeddb |
| Editors | TipTap (rich text), Monaco (code), Fabric.js (canvas) |
| Auth | Custom PostgreSQL / Firebase / Supabase (choice) |
| AI | Gemini, OpenAI, Claude, Qwen, Local (Ollama) |
| Storage | Google Drive, Dropbox, OneDrive, Local (OPFS), MinIO |
| WebSocket | Express + Socket.IO + Redis adapter |
| Backend (optional) | Rust (auth, WebSocket, events, file proxy, hardware bridge) |
| Deployment | Docker, Docker Compose, Vercel |

### Privacy Model

Every app operates in one of two modes:

- **Private** — Visible only to you. No presence indicators. Feels local and personal.
- **Shared** — Visible to invited collaborators. Presence active. File locking active. Audit trail visible.

**Default: Private.** Sharing is always an explicit action.

---

## 5. Built-in Apps

### Core Apps

| App | What It Does | Replaces |
|---|---|---|
| **Browser** | Pin any website as a "native" app. Persistent sessions across machines. Split view, focus mode, ad blocking. | Chrome + bookmarks |
| **Campaign Lab** | Project hierarchy (Campaign → Phase → Task), multiple views (kanban, timeline, table), templates, @mentions, client sharing. | Notion, Asana, Trello |
| **Moodboard** | Visual canvas for design references. Browser clipping, voting mode, campaign linking, export (PNG/PDF). | Milanote, Pinterest |
| **Files** | Unified file explorer across Google Drive, Dropbox, OneDrive, and local storage. Smart routing, version history, share links. | Finder + cloud apps |
| **Calls** | Video calling with campaign context. Auto meeting notes, recording-to-Files, guest links. | Google Meet + manual notes |
| **Terminal** | Full terminal with AI integration, process management, Firebase sync. | iTerm + manual commands |
| **Code Editor** | Monaco-based IDE. Multi-file, terminal panel, AI copilot, Yjs collaboration. | VS Code (browser) |
| **Notes** | Rich text editor with markdown, PDF annotation. | Notion Notes, Obsidian |

### Productivity Apps

| App | What It Does |
|---|---|
| **Productivity Suite** | Word (TipTap), Sheets (formula engine), Slides (Fabric.js) with HTML/CSV/PNG export |
| **PDF Reader** | PDF viewer with annotation |
| **Side-Gigs** | Private time tracking, invoicing, client management |
| **Proposal Generator** | AI-powered client proposal creation |
| **Brand Guides** | Brand style guide editor (colors, typography, voice, logos) |
| **Client Portal** | Read-only client view with approval UI |

### System Apps

| App | What It Does |
|---|---|
| **Settings** | Wallpaper, theme, fonts, shaders, performance mode |
| **Control Center** | Quick settings panel (macOS-style) |
| **Command Palette** | Spotlight search — launch apps, run commands (`Cmd+K`) |
| **AI Gateway** | Multi-provider AI configuration |
| **App Store** | Install/manage venture packs and plugins |
| **Admin Panel** | User and role management |
| **Privacy Settings** | Per-app privacy controls |
| **History** | Event history viewer with undo/redo |

---

## 6. Venture Packs

Installable per workspace. Available from the App Store.

| Pack | Price | What You Get |
|---|---|---|
| **ANICHISOM Creative Pack** | $15/mo | Moodboard Mill, Proposal Generator, Client Portal, Brand Guides |
| **Ziklag Forensics Pack** | $25/mo | Case Manager, Chain of Custody, Evidence Log, Hash Verifier |
| **Clothing Brand Pack** | $12/mo | Lookbook, Supplier Tracker, Collection Planner, Shopify Sync |
| **Hardware Pack** | $12/mo | BOM Manager, Firmware Tracker, Supplier Contacts, Component Library |
| **Developer Pack** | $10/mo | Deployment Tracker, Code Review Log, API Monitor, CI Bridge |
| **Photography Pack** | $10/mo | Gallery Manager, Client Delivery, Watermarking, Print Orders |

---

## 7. Configuration & Environment

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

#### Required

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_AUTH_PROVIDER` | Auth backend: `custom`, `firebase`, or `supabase` |
| `DATABASE_URL` | PostgreSQL connection (if using custom auth) |
| `SESSION_SECRET` | Random 64-char hex for session signing |

#### AI (at least one recommended)

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini |
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic Claude |
| `QWEN_API_KEY` | Alibaba Qwen |
| `LOCAL_AI_BASE_URL` | Ollama/LM Studio endpoint |

#### Cloud Storage (optional)

| Variable | Purpose |
|---|---|
| `GOOGLE_DRIVE_CLIENT_ID` / `SECRET` | Google Drive integration |
| `DROPBOX_CLIENT_ID` / `SECRET` | Dropbox integration |
| `TOKEN_ENCRYPTION_KEY` | 64-char hex for encrypting OAuth tokens |

#### Security

| Variable | Purpose |
|---|---|
| `DEV_MASTER_KEY` | Dev-only auth bypass (never in production) |
| `ALLOWED_ORIGINS` | Socket.IO CORS origins (production) |

Full list: see `.env.example`.

---

## 8. Deployment

### For 70 Beta Users (Recommended)

The simplest path: **Vercel (frontend) + Supabase (auth + database)**. Total cost: $0.

```bash
# 1. Create a Supabase project (free tier)
#    - Get URL and anon key
#    - Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 2. Deploy to Vercel
#    - Connect your GitHub repo
#    - Set environment variables in Vercel dashboard
#    - Deploy

# 3. Custom domain (optional)
#    - Add your domain in Vercel
#    - Update NEXT_PUBLIC_APP_URL
```

### Docker (Self-Hosted)

```bash
# Basic deployment
docker compose up -d

# Full self-hosted (Supabase + MinIO)
docker compose -f docker-compose.self-hosted.yml up -d
```

### When You Need the Rust Backend

The Rust backend is only required for:
- **Hardware bridge** — IoT device communication
- **Background jobs at scale** — Event processing, sync coordination
- **Advanced WebSocket features** — High-throughput real-time collaboration

```bash
cd rust
cargo build --release
# Services: auth(:3001), ws(:3002), events(:3003), files(:3004), hardware(:3005)
```

---

## 9. Development Guide

### Commands

| Command | What It Does |
|---|---|
| `npm run dev` | Start development server (with Socket.IO + Yjs) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |

### Adding a New App

1. Create component: `components/apps/my-app.tsx`
2. Register in: `lib/app-manifest.ts`
3. Done. No other files need editing.

The manifest handles lazy loading, role-based visibility, and categorization automatically.

### Adding a New Storage Connector

1. Implement `IStorageConnector` in `lib/storage-connectors/`
2. Register in `lib/storage-connectors/connector-registry.ts`
3. Add OAuth env vars to `.env.example`
4. Done.

### Adding a New AI Provider

1. Implement `IAiProvider` in `lib/ai-providers/`
2. Register in `lib/ai-providers/ai-provider-factory.ts`
3. Add API key env var to `.env.example`
4. Done.

### Adding a New Zustand Store

1. Create `lib/stores/my-feature.store.ts`
2. Follow existing pattern (see `auth.store.ts` or `window.store.ts`)
3. Optionally add debounced persistence with idb-keyval
4. Write tests in `__tests__/stores/`

### Key Architectural Patterns

- **Zustand stores** — All state lives in Zustand stores (`lib/stores/`). Components subscribe via selectors.
- **App manifest** — Declarative app registration (`lib/app-manifest.ts`). Adding an app = one entry.
- **Service layer** — Business logic in `lib/services/`. Components call services; services manage stores.
- **Plugin SDK** — Plugins communicate via postMessage RPC with 8 namespaces.
- **Event sourcing** — Every action is an immutable event. Full audit trail and undo/redo.

---

## 10. Project Structure

```
ANICHISOM2/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (17 files)
│   │   ├── auth/                 # Login, session, logout, socket-token
│   │   ├── ai/                   # Chat, models
│   │   ├── storage/              # OAuth callbacks, file browsing
│   │   ├── plugins/              # Plugin CRUD
│   │   └── workspaces/           # Workspace sync
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Entry point
│
├── components/
│   ├── desktop/                  # Desktop shell (decomposed)
│   │   ├── index.tsx             # Main desktop component
│   │   ├── menu-bar.tsx          # Top menu bar
│   │   ├── dock.tsx              # App dock
│   │   ├── launchpad.tsx         # App launcher
│   │   ├── window-switcher.tsx   # Ctrl+Tab window switcher
│   │   ├── mission-control.tsx   # Window overview
│   │   ├── control-center.tsx    # Quick settings
│   │   ├── lock-screen.tsx       # Lock screen
│   │   ├── context-menu.tsx      # Right-click menu
│   │   ├── widgets.tsx           # Desktop widgets
│   │   ├── desktop-icons.tsx     # Desktop icons
│   │   └── snapshots-menu.tsx    # Snapshot management
│   │
│   └── apps/                     # App components (46 files)
│       ├── browser.tsx           # Power Browser
│       ├── campaign-lab/         # Campaign Lab (6 files)
│       ├── moodboard.tsx         # Moodboard
│       ├── file-manager.tsx      # Files
│       ├── terminal.tsx          # Terminal
│       ├── code-editor/          # Code Editor (5 files)
│       ├── productivity-suite.tsx # Word/Sheets/Slides
│       ├── developer-pack.tsx    # Developer Pack
│       ├── photography-pack.tsx  # Photography Pack
│       ├── onboarding-wizard.tsx # First-launch wizard
│       ├── feedback-widget.tsx   # Beta feedback
│       └── ...                   # 46 total app files
│
├── lib/
│   ├── stores/                   # Zustand stores (21 files)
│   │   ├── auth.store.ts         # Authentication state
│   │   ├── window.store.ts       # Window management
│   │   ├── theme.store.ts        # Theme/appearance
│   │   ├── workspace.store.ts    # Workspace mode
│   │   ├── campaign.store.ts     # Campaign Lab data
│   │   ├── moodboard.store.ts    # Moodboard data
│   │   ├── file.store.ts         # File system state
│   │   └── ...                   # 21 total store files
│   │
│   ├── services/                 # Business logic (28 files)
│   │   ├── auth.service.ts       # Auth operations
│   │   ├── storage.service.ts    # Storage persistence
│   │   ├── event.service.ts      # Event pub/sub
│   │   ├── plugin.service.ts     # Plugin lifecycle
│   │   └── ...                   # 28 total service files
│   │
│   ├── storage-connectors/       # Cloud file bridge
│   │   ├── storage-connector.ts  # Interface + utilities
│   │   ├── connector-registry.ts # Factory/registry
│   │   ├── token-store.ts        # Encrypted token storage
│   │   ├── google-drive-connector.ts
│   │   ├── dropbox-connector.ts
│   │   ├── onedrive-connector.ts
│   │   └── local-folder-connector.ts
│   │
│   ├── ai-providers/             # AI gateway (5 providers)
│   ├── auth-providers/           # Auth backends (3 providers)
│   ├── os-context.tsx            # OS context provider (thin Zustand wrapper)
│   ├── app-manifest.ts           # App registry + dynamic loader
│   ├── crypto.ts                 # AES-GCM encryption
│   ├── fs.ts                     # OPFS file system wrapper
│   ├── sync-queue.ts             # Offline sync queue
│   └── ...                       # 70 total lib files
│
├── rust/                         # Rust backend (5 crates)
│   ├── auth-service/             # Authentication (:3001)
│   ├── ws-server/                # WebSocket (:3002)
│   ├── event-engine/             # Event sourcing (:3003)
│   ├── file-proxy/               # File proxy (:3004)
│   └── hardware-bridge/          # Hardware communication (:3005)
│
├── __tests__/                    # Test suite (37 files, 609+ tests)
│   ├── stores/                   # Store tests
│   ├── services/                 # Service tests
│   └── setup.ts                  # Test configuration
│
├── server.ts                     # Express + Socket.IO + Yjs server
├── middleware.ts                  # CSP nonce + security headers
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── VISION.md                     # Product vision (authoritative)
├── ARCHITECTURE.md               # Architecture documentation
├── BUILD_LOG.md                  # Development session log
└── README.md                     # This file
```

---

## 11. Testing

### Run Tests

```bash
# Full test suite
npm test

# Watch mode
npm run test:watch

# TypeScript type checking
npx tsc --noEmit --incremental false
```

### Test Structure

| Category | Files | Tests |
|---|---|---|
| Zustand stores | 18 | ~350 |
| Services | 12 | ~150 |
| Core libs | 7 | ~109 |
| **Total TypeScript** | **37** | **609+** |
| Rust crates | 5 | 30 |
| **Grand Total** | **42** | **639+** |

### Writing Tests

Tests use Vitest + Testing Library. See existing tests for patterns:

```bash
# Store test example
__tests__/stores/auth.store.test.ts

# Service test example
__tests__/services/brand.store.test.ts
```

---

## 12. Security

### What's Implemented

| Feature | Status |
|---|---|
| SSRF proxy protection | Fixed — auth check, private IP blocking, rate limiting |
| Session tokens | Crypto-random 32-byte tokens |
| CSP headers | Domain-restricted + per-request nonce |
| Socket.IO CORS | Restricted to configured origins |
| Plugin sandbox | Origin-verified iframe, permission-gated |
| Session encryption | AES-GCM 256-bit, PBKDF2 key derivation |
| API key encryption | Encrypted before IndexedDB storage |
| WebAuthn/Passkeys | Browser-native passwordless auth |
| Admin auth | Server-side role checks on all admin endpoints |
| WebSocket rate limiting | Per-IP connection limits |

### Privacy

- **All user data stays in IndexedDB/OPFS** — nothing stored on servers by default
- **OAuth tokens encrypted at rest** — AES-256-CBC, server cannot read plaintext
- **No tracking by default** — anonymous usage only if explicitly configured
- **Per-app privacy** — each app can be Private or Shared

---

## 13. Contributing

### Code Style

- TypeScript strict mode
- No `any` types (use proper typing)
- No comments unless requested
- Follow existing patterns in neighboring files
- Prefer editing existing files over creating new ones

### Verification Before Submitting

```bash
# Must pass all three:
npx tsc --noEmit --incremental false    # Type check
npm test                                # Tests
npm run lint                            # Lint
```

### Architecture Principles

1. **Repository Pattern** — All data through abstract interfaces
2. **Event Sourcing** — Every action is an immutable event
3. **Workspace as Root Entity** — No orphaned data
4. **Offline-First** — Service Worker + IndexedDB
5. **Privacy by Default** — Private mode unless explicitly shared

---

*Built by the ANICHISOM Development Engine.*
*Vision: `VISION.md` | Architecture: `ARCHITECTURE.md` | Progress: `BUILD_LOG.md`*
