# ContinuaOS

**The Creative OS Infrastructure** — A browser-based operating system that eliminates machine-switching and context-switching friction for anyone running multiple ventures.

> Your workspace follows you. Open on any machine, close, reopen on another — everything restores exactly where you left off.

---

## Table of Contents

1. [What ContinuaOS Is](#1-what-continuaos-os-is)
2. [Quick Start](#2-quick-start)
3. [Architecture](#3-architecture)
4. [Built-in Apps](#4-built-in-apps)
5. [Venture Packs](#5-venture-packs)
6. [Configuration](#6-configuration)
7. [Deployment](#7-deployment)
8. [Development](#8-development)
9. [Project Structure](#9-project-structure)
10. [Testing](#10-testing)
11. [Contributing](#11-contributing)

---

## 1. What ContinuaOS Is

ContinuaOS runs in your browser and gives you a persistent desktop environment — windows, apps, files, and sessions — that syncs across machines. It replaces 5-10 separate tools with one unified workspace.

### The Core Experience

```
1. Open your-domain.com in any browser (or install the PWA)
2. Sign up with email/password
3. Pick your role → pick your apps → workspace loads
4. Close on any machine → reopen on any other → everything restores
```

### Who It's For

| Persona | What They Get |
|---|---|
| **Creative Agency** | Browser with Figma/Framer pinned, Campaign Lab, Moodboard, Files bridge |
| **Freelancer** | Portable workspace, Side-Gigs, Proposal Generator |
| **Developer** | Terminal, Code Editor (Monaco), Deployment Tracker, API Monitor |
| **Student** | Notes, PDF Reader, research tools, personal cloud files |
| **Multi-venture Operator** | Separate workspace contexts per venture, each with its own apps |

### Positioning

```
Layer 3:  Marketplace (revenue)     → plugins, packs, templates
Layer 2:  Vertical Apps (stickiness) → filmmaker, agency, dev, designer packs
Layer 1:  Core OS (infrastructure)   → runtime, storage, sync, auth, collaboration
```

**The pitch:** *"ContinuaOS is the operating system your creative team runs in the browser. We provide the infrastructure — you install the apps you need."*

---

## 2. Quick Start

### Prerequisites

- Node.js v18+
- A [Supabase](https://supabase.com) account (free tier)

### Install & Run

```bash
# Clone the repo
git clone git@github.com:Wicje/ContinuaOS.git
cd ContinuaOS

# Install dependencies
npm install --legacy-peer-deps

# Configure environment
cp .env.example .env.local
# Edit .env.local — see Section 6

# Start development server
npm run dev
```

The OS starts at `http://localhost:3000`.

### Setup Supabase (required)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** → copy Project URL, Publishable Key, and Secret Key
3. Paste into `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY_HERE
   SUPABASE_SECRET_KEY=YOUR_SECRET_KEY_HERE
   ```
4. Go to **SQL Editor** → paste contents of `supabase-schema.sql` → Run
5. Go to **Database → Replication** → enable for all tables
6. Done — apps will appear after completing the onboarding wizard

### What Works Without API Keys

| Feature | Requires Supabase? |
|---|---|
| Desktop, window management, themes | No |
| App launcher, command palette | No |
| Local file system (OPFS) | No |
| Notes, PDF Reader | No |
| Campaign Lab, Moodboard (local state) | No |
| Code Editor (Monaco) | No |
| Terminal | No |
| User accounts, cloud sync, collaboration | **Yes** |
| Real-time presence, event history | **Yes** |

---

## 3. Architecture

### Three-Layer Design

```
╔═══════════════════════════════════════════════════════════╗
║  LAYER 3 — ECOSYSTEM (Marketplace, install what you need) ║
║                                                           ║
║  [ContinuaOS Pack] [Ziklag Forensics] [Clothing Brand]    ║
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
║  Supabase (auth+db+realtime) | IndexedDB (offline)        ║
║  Yjs (collaboration) | Event Sourcing | Privacy Model     ║
╚═══════════════════════════════════════════════════════════╝
```

### How Storage Works

| Layer | Who owns it | What it stores |
|---|---|---|
| **Supabase** (your instance) | You (the founder) | Accounts, workspaces, events, presence, app registry, terminal history, plugins |
| **IndexedDB** (browser) | Each user | Private files, offline data, local preferences — stays on THEIR machine |
| **Cloud connectors** | Per-user OAuth | Google Drive / Dropbox / OneDrive — user authenticates, tokens stored encrypted in Supabase |

**Users never touch `.env`.** They visit your URL, sign up, and use the OS. The `.env` is configured once on your deployment.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.9 (strict mode) |
| UI | React 19 + Tailwind CSS 4 |
| State | Zustand 5 + idb-keyval (IndexedDB) |
| Real-time | Yjs + y-websocket + y-indexeddb |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Editors | TipTap (rich text), Monaco (code), Fabric.js (canvas) |
| AI | Gemini, OpenAI, Claude, Qwen, Local (Ollama) |
| Storage | Google Drive, Dropbox, OneDrive, Local (OPFS) |
| WebSocket | Express + Socket.IO |
| Deployment | Vercel (frontend) + Supabase (backend) |

### Privacy Model

- **All user data stays in IndexedDB/OPFS** by default
- **OAuth tokens encrypted at rest** — AES-256-CBC
- **No tracking** — anonymous usage only if explicitly configured
- **Per-app privacy** — each app can be Private or Shared

---

## 4. Built-in Apps

ContinuaOS ships with **46 apps**. Each app has a unique brand-inspired SVG icon.

### Core Apps

| App | What It Does | Replaces |
|---|---|---|
| **Browser** | Pin any website as a "native" app. Persistent sessions, search engine selector. | Chrome + bookmarks |
| **Campaign Lab** | Project hierarchy, multiple views (kanban, timeline, table), templates. | Notion, Asana, Trello |
| **Moodboard** | Visual canvas for design references. Browser clipping, voting, export. | Milanote, Pinterest |
| **Files** | Unified file explorer with multi-select, drag-to-move, batch ops. Cloud sync (Drive, Dropbox, OneDrive). | Finder + cloud apps |
| **Calls** | Video calling with campaign context, auto meeting notes. | Google Meet |
| **Terminal** | Full terminal with AI integration, session sync, persistent history. | iTerm |
| **Code Editor** | Monaco-based IDE. Multi-file, AI copilot, Yjs collaboration, live preview. | VS Code (browser) |
| **Notes** | Rich text editor with markdown, PDF annotation. | Notion Notes, Obsidian |

### Productivity Apps

| App | What It Does |
|---|---|
| **Productivity Suite** | Word (TipTap), Sheets (formula engine), Slides (Fabric.js) |
| **PDF Reader** | PDF viewer with annotation |
| **Side-Gigs** | Private time tracking, invoicing, client management |
| **Proposal Generator** | AI-powered client proposal creation |
| **Brand Guides** | Brand style guide editor |
| **Client Portal** | Read-only client view with approval UI |
| **Bookmarks** | Visual bookmark manager with folders and tags |
| **Assistant** | AI copilot with app context awareness |

### System Apps

| App | What It Does |
|---|---|
| **Settings** | Wallpaper (dynamic time-of-day), theme, fonts, shaders, performance mode |
| **Control Center** | Quick settings panel (macOS-style) |
| **Command Palette** | Spotlight search — launch apps, run commands (`Cmd+K`) |
| **App Store** | Install/manage venture packs and plugins |
| **Admin Panel** | User and role management |
| **History** | Event history viewer with undo/redo |
| **Notifications** | Notification center with real-time alerts |
| **Task Manager** | System resource monitoring |

### Widget System

| Widget | What It Does |
|---|---|
| **Notch Nook** | System overlay with quick actions (toggle with `Alt+N`) |
| **Widget Stack** | Customizable widget panel (toggle with `Alt+W`) |

---

## 5. Venture Packs

Installable per workspace. Available from the App Store.

| Pack | Price | What You Get |
|---|---|---|
| **ContinuaOS Creative Pack** | $15/mo | Moodboard Mill, Proposal Generator, Client Portal, Brand Guides |
| **Ziklag Forensics Pack** | $25/mo | Case Manager, Chain of Custody, Evidence Log, Hash Verifier |
| **Clothing Brand Pack** | $12/mo | Lookbook, Supplier Tracker, Collection Planner, Shopify Sync |
| **Hardware Pack** | $12/mo | BOM Manager, Firmware Tracker, Supplier Contacts, Component Library |
| **Developer Pack** | $10/mo | Deployment Tracker, Code Review Log, API Monitor, CI Bridge |
| **Photography Pack** | $10/mo | Gallery Manager, Client Delivery, Watermarking, Print Orders |
| **Side Gigs Pack** | $5/mo | Income Tracker, Client CRM, Task Boards, Tax Export |

---

## 6. Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

#### Required — Supabase

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_AUTH_PROVIDER` | Set to `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable (anon) key |
| `SUPABASE_SECRET_KEY` | Your Supabase service role key (server-side only) |

#### Optional — AI (at least one recommended)

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini |
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic Claude |
| `QWEN_API_KEY` | Alibaba Qwen |
| `LOCAL_AI_BASE_URL` | Ollama/LM Studio endpoint |

#### Optional — Cloud Storage

| Variable | Purpose |
|---|---|
| `GOOGLE_DRIVE_CLIENT_ID` / `SECRET` | Google Drive integration |
| `DROPBOX_CLIENT_ID` / `SECRET` | Dropbox integration |
| `ONEDRIVE_CLIENT_ID` / `SECRET` | OneDrive integration |
| `TOKEN_ENCRYPTION_KEY` | 64-char hex for encrypting OAuth tokens |

#### Optional — Power Browser

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Your deployed URL for proxy redirects (defaults to `http://localhost:3000`) |

---

## 7. Deployment

### Recommended: Vercel + Supabase

For 70 beta users: **$0 infrastructure cost.**

```bash
# 1. Create Supabase project (free tier: 50k MAU)
# 2. Run supabase-schema.sql in SQL Editor
# 3. Enable Realtime on all tables (Database → Replication)
# 4. Deploy to Vercel (free tier: 100GB bandwidth)
# 5. Set env vars in Vercel dashboard
# 6. Done
```

### Scaling

| Users | Supabase Plan | Vercel Plan | Monthly Cost |
|---|---|---|---|
| 1-50 | Free | Free | $0 |
| 50-200 | Free | Free | $0 |
| 200-1k | Pro ($25/mo) | Pro ($20/mo) | $45 |
| 1k-10k | Pro ($25/mo) | Pro ($20/mo) | $45 |
| 10k+ | Team ($599/mo) | Enterprise | Custom |

---

## 8. Development

### Commands

| Command | What It Does |
|---|---|
| `npm run dev` | Start development server (with Socket.IO + Yjs) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |

### Adding a New App

1. Create component: `components/apps/my-app.tsx`
2. Add icon SVG to `ICO` object in `lib/app-manifest.ts`
3. Register in both `APP_MANIFEST` and `appRegistry`
4. Add role-app mappings in `lib/roles.ts`

### Adding a New Zustand Store

1. Create `lib/stores/my-feature.store.ts`
2. Follow existing pattern (see `auth.store.ts`)
3. Write tests in `__tests__/stores/`

### Key Patterns

- **Zustand stores** — All state in `lib/stores/`. Components subscribe via selectors.
- **App manifest** — Declarative app registration. Every app needs entries in both `APP_MANIFEST` and `appRegistry`.
- **Supabase adapters** — All DB ops via Supabase client. Server-side uses `@supabase/ssr`.
- **Event sourcing** — Every action is an immutable event. Full audit trail.
- **Cloud storage connectors** — OAuth2 flow in `lib/storage-connectors/`, API routes in `app/api/storage/`.
- **Power Browser proxy** — SSRF-protected, frame-busting neutralized, JWT-authenticated.

---

## 9. Project Structure

```
ContinuaOS/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (auth, proxy, cloud storage)
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Entry point
│
├── components/
│   ├── desktop/                  # Desktop shell (menu bar, taskbar, overlays)
│   ├── apps/                     # 46 app components
│   ├── notifications/            # Notification center
│   └── ui/                       # Shared UI (OSModal, Skeleton, AppIcon, etc.)
│
├── lib/
│   ├── stores/                   # Zustand stores (auth, windows, files, etc.)
│   ├── services/                 # Business logic (plugin, campaign, etc.)
│   ├── hooks/                    # Custom React hooks
│   ├── storage-connectors/       # Google Drive, Dropbox, OneDrive connectors
│   ├── supabase.ts               # Supabase client
│   ├── app-manifest.ts           # App registry + SVG icons
│   ├── fs.ts                     # Virtual filesystem (OPFS + IDB)
│   ├── campaign-types.ts         # Campaign Lab types
│   └── ...                       # 70+ lib files
│
├── __tests__/                    # Test suite (38 files, 606 tests)
├── supabase-schema.sql           # Database schema (12 tables + RLS + triggers)
├── server.ts                     # Express + Socket.IO + Yjs WebSocket server
├── middleware.ts                  # Auth guard, CSP, security headers
├── .env.local                    # Environment config
├── .npmrc                        # legacy-peer-deps=true
├── VISION.md                     # Product vision (authoritative)
├── ARCHITECTURE.md               # Architecture documentation
├── BUILD_LOG.md                  # Development session log
└── README.md                     # This file
```

---

## 10. Testing

```bash
# Full test suite
npm test

# TypeScript type check
npx tsc --noEmit --incremental false
```

| Category | Files | Tests |
|---|---|---|
| Zustand stores | 18 | ~350 |
| Services | 12 | ~150 |
| Core libs | 8 | ~106 |
| **Total** | **38** | **606** |

---

## 11. Contributing

### Code Style

- TypeScript strict mode (`noUncheckedIndexedAccess`)
- No `any` types
- No comments unless requested
- Follow existing patterns

### Before Submitting

```bash
npx tsc --noEmit --incremental false    # Type check
npm test                                # Tests
```

### Principles

1. **Repository Pattern** — All data through abstract interfaces
2. **Event Sourcing** — Every action is an immutable event
3. **Offline-First** — IndexedDB primary, Supabase sync
4. **Privacy by Default** — Private mode unless explicitly shared

---

*Vision: `VISION.md` | Architecture: `ARCHITECTURE.md` | Progress: `BUILD_LOG.md`*
