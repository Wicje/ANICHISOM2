# ANICHISOM OS

**The Creative OS Infrastructure** — A browser-based operating system that eliminates machine-switching and context-switching friction for anyone running multiple ventures.

> Your workspace follows you. Open on any machine, close, reopen on another — everything restores exactly where you left off.

---

## Table of Contents

1. [What ANICHISOM OS Is](#1-what-anichisom-os-is)
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

## 1. What ANICHISOM OS Is

ANICHISOM OS runs in your browser and gives you a persistent desktop environment — windows, apps, files, and sessions — that syncs across machines. It replaces 5-10 separate tools with one unified workspace.

### The Core Experience

```
1. Open your-domain.com in any browser (or install the PWA)
2. Sign up with email or Google SSO
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

**The pitch:** *"ANICHISOM is the operating system your creative team runs in the browser. We provide the infrastructure — you install the apps you need."*

---

## 2. Quick Start

### Prerequisites

- Node.js v18+
- A [Supabase](https://supabase.com) account (free tier)

### Install & Run

```bash
# Clone the repo
git clone git@github.com:Wicje/ANICHISOM2.git
cd ANICHISOM2

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
2. Go to **Settings → API** → copy Project URL and Anon Key
3. Paste into `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
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
║  Supabase (auth+db+realtime) | IndexedDB (offline)        ║
║  Yjs (collaboration) | Event Sourcing | Privacy Model     ║
╚═══════════════════════════════════════════════════════════╝
```

### How Storage Works

| Layer | Who owns it | What it stores |
|---|---|---|
| **Supabase** (your instance) | You (the founder) | Accounts, workspaces, events, presence, app registry, terminal history, plugins |
| **IndexedDB** (browser) | Each user | Private files, offline data, local preferences — stays on THEIR machine |
| **Cloud connectors** | Per-user OAuth | Google Drive / Dropbox — user authenticates, tokens stored encrypted in Supabase |

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
| Storage | Google Drive, Dropbox, Local (OPFS) |
| WebSocket | Express + Socket.IO |
| Deployment | Vercel (frontend) + Supabase (backend) |

### Privacy Model

- **All user data stays in IndexedDB/OPFS** by default
- **OAuth tokens encrypted at rest** — AES-256-CBC
- **No tracking** — anonymous usage only if explicitly configured
- **Per-app privacy** — each app can be Private or Shared

---

## 4. Built-in Apps

### Core Apps

| App | What It Does | Replaces |
|---|---|---|
| **Browser** | Pin any website as a "native" app. Persistent sessions, split view. | Chrome + bookmarks |
| **Campaign Lab** | Project hierarchy, multiple views (kanban, timeline, table), templates. | Notion, Asana, Trello |
| **Moodboard** | Visual canvas for design references. Browser clipping, voting, export. | Milanote, Pinterest |
| **Files** | Unified file explorer across Drive, Dropbox, and local storage. | Finder + cloud apps |
| **Calls** | Video calling with campaign context, auto meeting notes. | Google Meet |
| **Terminal** | Full terminal with AI integration, session sync. | iTerm |
| **Code Editor** | Monaco-based IDE. Multi-file, AI copilot, Yjs collaboration. | VS Code (browser) |
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

### System Apps

| App | What It Does |
|---|---|
| **Settings** | Wallpaper, theme, fonts, shaders, performance mode |
| **Control Center** | Quick settings panel (macOS-style) |
| **Command Palette** | Spotlight search — launch apps, run commands (`Cmd+K`) |
| **App Store** | Install/manage venture packs and plugins |
| **Admin Panel** | User and role management |
| **History** | Event history viewer with undo/redo |

---

## 5. Venture Packs

Installable per workspace. Available from the App Store.

| Pack | Price | What You Get |
|---|---|---|
| **ANICHISOM Creative Pack** | $15/mo | Moodboard Mill, Proposal Generator, Client Portal, Brand Guides |
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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

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
| `TOKEN_ENCRYPTION_KEY` | 64-char hex for encrypting OAuth tokens |

---

## 7. Deployment

### Recommended: Vercel + Supabase

For 200 users: **$0 infrastructure cost.**

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
2. Register in: `lib/app-manifest.ts`
3. Done.

### Adding a New Zustand Store

1. Create `lib/stores/my-feature.store.ts`
2. Follow existing pattern (see `auth.store.ts`)
3. Write tests in `__tests__/stores/`

### Key Patterns

- **Zustand stores** — All state in `lib/stores/`. Components subscribe via selectors.
- **App manifest** — Declarative app registration. Adding an app = one entry.
- **Supabase adapters** — All DB ops in `lib/supabase-adapter.ts`. CRUD + Realtime.
- **Event sourcing** — Every action is an immutable event. Full audit trail.

---

## 9. Project Structure

```
ANICHISOM2/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Entry point
│
├── components/
│   ├── desktop/                  # Desktop shell (11 files)
│   └── apps/                     # App components (46+ files)
│
├── lib/
│   ├── stores/                   # Zustand stores (21 files)
│   ├── services/                 # Business logic (28 files)
│   ├── supabase.ts               # Supabase client singleton
│   ├── supabase-adapter.ts       # All DB operations
│   ├── supabase-types.ts         # Database type definitions
│   ├── storage.ts                # Dual-mode storage (Supabase + IndexedDB)
│   ├── os-context.tsx            # OS context provider
│   ├── app-manifest.ts           # App registry + dynamic loader
│   └── ...                       # 70+ lib files
│
├── __tests__/                    # Test suite (37 files, 609 tests)
├── supabase-schema.sql           # Database schema (run in Supabase SQL Editor)
├── server.ts                     # Express + Socket.IO + Yjs server
├── .env.local                    # Environment config
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
| Core libs | 7 | ~109 |
| **Total** | **37** | **609** |

---

## 11. Contributing

### Code Style

- TypeScript strict mode
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
