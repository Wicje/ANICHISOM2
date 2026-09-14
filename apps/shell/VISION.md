# Continua
## The Persistent Context Layer — Vision & Execution Document
*July 2026 | Owner: Founder / Continua*

---

> **NOTICE TO ALL AI TOOLS (Cursor, Claude, v0, Copilot, and others)**
>
> This document is the single authoritative source of truth for Continua.
> Do not reference any earlier versions of this document.
> Do not introduce tools, patterns, or architecture not endorsed here.
> Do not simplify scope to make implementation easier.
> When in doubt about any decision, **ask the founder before implementing.**

---

## PART I: WHAT WE ARE

### The One-Line Truth

**Continua is the persistent context layer of human computation.**

### The Problem We Solve

Every time you switch devices, restart an app, or close a tab, you lose context. Not files — context. The mental model of where you were, what you were doing, and why. Rebuilding that context costs hours every day across every person who works on a laptop.

Continua eliminates that cost. Open it on any device and everything is exactly where you left it. Every app, every tab, every conversation, every file. The interface changes. The context doesn't.

### What We Sound Like

Continua speaks like a founder who already knows the future — not because we're arrogant, but because we've done the work to see it clearly. Confident. Direct. Never loud.

**On-brand vocabulary:**
- Context, persistence, continuity, the layer, no re-entry cost
- "The layer that remembers"
- "Every interface is a renderer"

**Off-brand vocabulary (never use):**
- Browser-based OS, cloud save, autosave, sync, productivity suite
- "Like Notion but for..." or any competitor comparison
- Game-changing, revolutionary, cutting-edge

### Who We Serve

Everyone who uses a laptop and works online. Not just designers. Not just developers. Not just filmmakers. **Everyone.** Filmmakers, developers, designers, marketers, business operators, students, writers, accountants — anyone whose work involves context that gets lost between sessions.

The wedge is not a creative discipline. The wedge is the context restore moment itself.

### The Product Promise

> Pick up exactly where you stopped. Not the file. The context.

---

## PART II: THE THREE-LAYER ARCHITECTURE

```
╔═══════════════════════════════════════════════════════════╗
║  LAYER 3 — ECOSYSTEM (Marketplace, install what you need) ║
║                                                           ║
║  [Community plugins]  [First-party packs]  [Enterprise]   ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 2 — BUILT-IN APPS (Come with every workspace)      ║
║                                                           ║
║  [Browser]  [Files]  [Code Editor]  [Terminal]  [Notes]   ║
║  [Productivity]  [Campaign Lab]  [Digital Journal]  [...]  ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 1 — THE CONTEXT LAYER (The protocol we own)        ║
║                                                           ║
║  Context Persistence │ Auth │ State Sync │ Event Sourcing  ║
║  File Bridge │ Privacy Model │ Real-time Presence          ║
╚═══════════════════════════════════════════════════════════╝
```

**Layer 1 (The Context Layer)** is the product. It persists, syncs, and restores context across devices and sessions. Every app in Layers 2 and 3 builds on Layer 1. No app bypasses it. This is the protocol we own.

**Layer 2 (Built-in Apps)** ship with every workspace. They prove the context layer works. The most important is the Browser — it's the integration layer for every web-based tool.

**Layer 3 (Ecosystem)** is installable via marketplace. The platform grows without us building everything. This is the long-term revenue driver, but NOT the priority now.

**The critical rule:** Layer 1 is the protocol. Layers 2 and 3 are renderers. We are building the protocol. Everything else is a proof that the protocol works.

---

## PART III: TECHNICAL ARCHITECTURE (As It Actually Is)

### Current Stack (Live, July 2026)

```
Frontend:
  Next.js 15 (App Router) + React 19 + TypeScript
  Tailwind CSS 4 (dark-first, infrastructure aesthetic)
  Motion (animations, transitions)
  PWA (Service Worker + Web App Manifest)
  IndexedDB (offline state, VirtualFS)
  WebSockets via Socket.IO (real-time, agency mode)

Backend (Cloud, Live):
  Supabase (PostgreSQL + Auth + Realtime)
  Vercel (hosting, edge functions)

  ⚠️ Supabase is a RENDERER for our context layer.
     It is not the context layer.
     We must build our own API abstraction over it.

Backend (Future, Protocol):
  Context Layer API (our protocol, Supabase as first implementation)
  → Swappable to: self-hosted Supabase, direct Postgres, Rust backend

Authentication:
  Supabase Auth (email/password + Google OAuth + GitHub OAuth)
  Bootstrap endpoint for first admin (no invite needed)

AI:
  Gemini (free tier, configured)
  Provider fallback chain: Gemini → OpenAI → Claude → Qwen → Local

Cloud Storage:
  Google Drive (OAuth, configured)
  Dropbox (planned)
  OneDrive (planned)

Monetization:
  Stripe (Checkout + Portal + Webhook) — not configured yet
  3-tier pricing defined: Free / Pro / Team

Database:
  16 tables in Supabase PostgreSQL
  RLS policies on all tables
  Auth trigger for user sync
  snake_case columns, proper UUID-to-text casts
```

### The Supabase Relationship (Strategic)

Supabase is the first implementation of our context layer, not the context layer itself.

```
Our Context Layer API  ←  the protocol we own
        ↑
    Supabase              ←  first implementation
        ↑
    PostgreSQL            ←  the real standard
```

Every API route must be our protocol that happens to use Supabase today. The URL contract, the schema, the auth checks — these are Continua's intellectual property. We can swap the implementation behind the API at any point.

### Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Database | PostgreSQL via Supabase | Open standard, swappable |
| Auth | Supabase Auth | Battle-tested, free tier, migrable |
| Hosting | Vercel | Zero-ops for 70 beta users |
| Frontend | Next.js + React | Ecosystem, performance, SSR |
| Real-time | Socket.IO + Supabase Realtime | Agency mode + built-in |
| Offline | IndexedDB + Service Worker | PWA standard, works everywhere |
| State persistence | VirtualFS + IndexedDB | Browser-native, no server dependency |
| AI | Gemini (free tier) | Zero cost for beta |

---

## PART IV: WHAT WE'VE DONE (Completed Work)

### Sessions 1-46: Foundation (Complete)

Built the entire OS from scratch:
- 47 apps in manifest with brand-inspired SVG icons
- Window management system (drag, resize, snap, minimize, genie effect)
- Menu bar with clock, WiFi, battery, volume
- Dock with pinned apps + currently open apps
- Command palette (Cmd+K) with fuzzy search, system commands
- Notification system with center, badges, auto-read
- Desktop with boot splash, startup chime, parallax, context menu
- Settings app (appearance, audio, notifications, all persisted to IndexedDB)
- App Store / Marketplace UI
- Admin panel with user management and marketplace reviews
- Onboarding wizard (3-step: welcome, role selection, app selection)
- 8 user roles with curated app sets
- Full privacy model (private/shared modes per app)
- Plugin SDK v1 with iframe sandbox security
- File Manager with multi-select, drag-to-move, batch operations, cloud storage connectors (Google Drive, Dropbox, OneDrive)
- Power Browser with proxy, frame-busting protection, search engine selector
- Code Editor (Monaco), Terminal (xterm), Productivity Suite
- Screen Recorder with 7-codec fallback chain
- Digital Journal with mood tracking, streak counter
- Activity Monitor, Focus Mode, Screenshot Tool, Clipboard History
- Ambient Sounds (rain, cafe, forest)
- Context menu with smart routing
- VirtualFS with OPFS sync
- Performance instrumentation (Web Vitals)
- PWA with offline support, service worker v3

### Sessions 47-50: Build Plan Phases 0-3 (Complete)

**Phase 0 — Foundation:**
- Locked product name: Continua (was ContinuaOS)
- Context Layer Spec written
- Performance instrumentation
- Cross-device sync architecture

**Phase 1 — MVP:**
- SSO buttons (Google + GitHub + Passkey)
- Context export/import API
- Context Layer class
- BootSplash wired to real restore (not mock)
- Cloud sync pipeline

**Phase 2 — Private Beta:**
- Web Vitals tracking
- Offline hardening
- App SDK v1
- 3-tier pricing defined
- Marketplace pipeline
- Plugin version management

**Phase 3 — Public Launch:**
- Email service (Resend templates, 7 templates)
- Analytics dashboard
- Admin marketplace reviews
- SDK docs site
- Credential setup guide

### 6-Phase Comprehensive Bug Fix (Complete)

- Screen recorder rewrite (6 bugs fixed: stale closure, race condition, onerror, empty chunks, ref cleanup, try/catch)
- DB column names fixed across 6 files (snake_case)
- Auth cookie fix (login/logout using shared createClient)
- Security hardening (11 files: Stripe webhook HMAC, proxy XSS, email admin check, getSession→getUser)
- Runtime bugs (5 files: App Store memory leak, persisted store double-invoke, terminal stat, rate limiter dedup, vitals init)
- Notification persistence (localStorage)

### UI Brand Redesign (Complete)

- Login screen: dark infrastructure aesthetic, #10F4A0 green accent, grid texture, ambient glow
- Boot splash: green gradient logo, mono typography, progress bar with glow
- Onboarding wizard: brand green accents, infrastructure language
- Global CSS: dark-first theme, green primary, all glass effects updated
- PWA manifest: "Continua" branding, green theme color
- Bootstrap endpoint: first admin user without invite, server-gated (disappears after first admin created)

### Infrastructure Setup

- Supabase project: live at tmajgvivaizcjpysggod.supabase.co
- Supabase schema: 16 tables, RLS policies, auth trigger, split into step1/step2 SQL files
- Supabase types: aligned with actual SQL schema
- Vercel deployment: anichisom-2.vercel.app
- Google Drive OAuth: configured
- Gemini AI: API key configured
- Supabase Realtime: enabled for all tables
- .npmrc: legacy-peer-deps=true
- Custom server: Express + Socket.IO + Yjs WebSocket (port 1234)
- Vercel config: installCommand with --include=dev
- TypeScript: moved to dependencies for Vercel build compatibility

---

## PART V: WHAT WE'RE DOING NEXT (Priority Order)

### Priority 1: Get the App Live and Working (This Week)

**Goal:** First admin account created, all users can sign up, Google auth works.

| Task | Status | Owner |
|---|---|---|
| Set real SUPABASE_SECRET_KEY in Vercel | ⏳ Pending | Founder |
| Enable Google auth in Supabase dashboard | ⏳ Pending | Founder |
| Add Google Cloud Console redirect URI | ⏳ Pending | Founder |
| Disable Supabase email confirmation (until Resend set up) | ⏳ Pending | Founder |
| Verify all env vars in Vercel, rebuild | ⏳ Pending | Founder |
| Test: bootstrap admin → invite users → login → onboarding → desktop | ⏳ Pending | Founder + AI |

### Priority 2: Context Layer API Abstraction (✅ COMPLETED)

**Goal:** Build our own protocol layer over Supabase. This is the core intellectual property.

The Context Layer API is a clean abstraction that:
1. Defines OUR URL contract (`/api/context/save`, `/api/context/pull`, `/api/context/export`, `/api/context/import`, `/api/context/snapshot`, `/api/context/stats`)
2. Uses OUR schema (`ContextRecord`, `VectorClock`, `ContextDelta`, `ContextTombstone`)
3. Is swappable — `MemoryContextRepository` and `SupabaseContextRepository` operate interchangeably via `ContextRepository` and `createContextDriver`.
4. Executes deterministic conflict resolution (`resolveVectorClockConflict`) and granular diff sync (`computeDeltaOperations`, `applyDeltaOperations`).

| Task | Status | Owner |
|---|---|---|
| Write the Context Kernel schema spec (versioned, conflict resolution, tombstones) | ✅ Done | AI |
| Build `/api/context/*` routes as clean protocol endpoints | ✅ Done | AI |
| Wrap Supabase & Memory behind a repository interface (`ContextRepository`) | ✅ Done | AI |
| Build context export/import as protocol-native (JSON snapshots) | ✅ Done | AI |
| Lamport Vector Clocks & Granular Delta synchronization engine | ✅ Done | AI |
| Verify: client uses clean protocol, storage is pluggable driver | ✅ Done | AI |

### Priority 3: Product Brutalism — Prove the Core Promise (✅ COMPLETED)

**Goal:** The experience so good users feel its absence everywhere else.

The product for every user is: **"Continua is a workspace that remembers. Open it on any device and everything is exactly where you left it."**

| Task | Status | Owner |
|---|---|---|
| Make context restore instant (<3 seconds) via local IDB + Vector Clock sync | ✅ Done | AI |
| Cross-device sync working end-to-end with causal merge | ✅ Done | AI |
| Context portability: one-click JSON export & import of full context | ✅ Done | AI |
| UI polish: brand accents across window frames, dock, menu bar, and NotchNook | ✅ Done | AI |
| Open access onboarding: instant signup & credential auth without beta-code wall | ✅ Done | AI |

### Priority 4: Hardening & Desktop Native Runtime (✅ COMPLETED)

| Task | Status | Owner |
|---|---|---|
| Offline hardening: PWA Service Worker caching + IndexedDB local operation | ✅ Done | AI |
| Dual-Target Native Desktop Runtime: Tauri Rust commands & IPC Bridge | ✅ Done | AI |
| Layer 3 Plugin Developer Platform: Public SDK (`@/lib/plugin-sdk`) & Sandbox Host | ✅ Done | AI |
| Developer CLI: Scaffolding generator (`scripts/continua-plugin-cli.mjs`) | ✅ Done | AI |
| Error monitoring & Next.js 15 Sentry instrumentation (`instrumentation-client.ts`) | ✅ Done | AI |
| Test suite hardening: 45 test suites, 649 tests passing, 0 TypeScript errors | ✅ Done | AI |

### Priority 5: Monetization and Scale (Next)

| Task | Status | Owner |
|---|---|---|
| Resend email setup (needs verified custom domain) | ⏳ Deferred | Founder |
| Stripe billing integration & live keys | ⏳ Deferred | Founder |
| Pro/Team tier feature gates & usage quotas | ⏳ Next | AI |
| Public plugin marketplace store portal | ⏳ Next | AI |

---

## PART VI: THE NON-NEGOTIABLE UX FLOW

```
1. Open the site in any browser OR click the installed PWA on any OS
2. Login screen appears (green accent, infrastructure aesthetic)
3. User signs in (email/password, Google, GitHub, or Passkey)
4. Onboarding wizard: pick role → select apps
5. Desktop loads with exact previous state:
   - Windows positioned where they were
   - Apps open at last state
   - Files at last scroll position
   - Browser tabs at last URL
   - Terminal history restored
   - Notification state restored
6. Close anywhere → reopen on any machine → step 5 restores everything
```

**If this flow is broken, nothing else matters.** This is the product.

---

## PART VII: STRATEGIC ANALYSIS

### Problems We've Identified and How We Handle Them

| Problem | Severity | Our Approach |
|---|---|---|
| Session state schema fragility | Critical | Context Kernel spec (Priority 2) — versioned, conflict resolution, tombstones |
| V1 being too thin to prove the vision | Critical | Product Brutalism (Priority 3) — make the core promise so good users feel its absence |
| No clear payment trigger | Medium | Charge for compute/reach, not storage. Context is sacred. Performance and cross-device sync are premium. |
| Browser performance ceiling | Medium | Not our problem yet. Our target is "laptop users who work online," not 8K video editors. |
| Schema version drift | Medium | Context Kernel spec handles this from day one with schema_version field |
| Safari/iOS restrictions | Low | Edge case for beta. Most users are on Chrome/Edge. |
| Cold start / no users | Medium | The waitlist-as-product trick: signup flow demonstrates persistence before the user uses the product |
| Trust — who owns my context | High | Context portability: one-click JSON export from day one. "Your context is yours. Always." |

### The Wedge Strategy

We are NOT niching down to a creative discipline. We are NOT building a video editor or a design tool.

**The wedge is the context restore moment itself.**

The product: "Open Continua → everything is exactly where you left it. Every app. Every tab. Every conversation. Every file. On any device."

That's not a video editor. That's not a design tool. That's a **workspace that remembers.** And it applies to everyone who uses a laptop.

**The one move that proves everything:** A user opens Continua on their laptop. Closes the tab. Opens it on their phone. Everything is there. They open it on a different laptop a week later. Everything is there. That moment — the green flash, the context snapping back — IS the product.

### The Payment Strategy

Do NOT turn persistence into the paywall. The brand says "your context lives in the layer." Then the product says "we deleted it after 7 days unless you pay." That's not infrastructure.

**Instead:** Charge for compute and reach, not storage.

| Tier | Context | What You Pay For |
|---|---|---|
| Free | Unlimited context, 1 device | — |
| Pro | Unlimited context, unlimited devices | Cross-device sync speed, AI features, priority restore |
| Team | Shared context pools | Collaboration, admin, audit, SSO |

The context is sacred — it's always there. The performance and reach of the layer is what you pay for.

### Community Strategy (Deferred Until 50+ Active Users)

The brand guardrails document defines a community playbook (Founders of Context, Discord, build logs, content cadence). **Defer all of this until 50 users actually care.** Use the vocabulary rules now. Defer the community infrastructure until the product proves itself.

---

## PART VIII: BRAND IDENTITY

### Visual Identity

- **Primary color:** #10F4A0 (signature green — appears only for context restore moments and primary actions)
- **Background:** #060608 (near-black, infrastructure aesthetic)
- **Typography:** ABeeZee (sans), Montserrat (display), JetBrains Mono (code/system)
- **Aesthetic:** Dark-first, sparse, functional motion. Linear/Vercel/Stripe, not Notion/Canva/Loom.
- **Logo:** Layered hexagon in green gradient with ambient glow

### Voice Rules

- Declarative, not descriptive
- Precise, not dense
- Timeless, not trendy
- Earned confidence, not hype

**Never:** Compare to competitors, use hype language, emphasize "browser-based," or describe ourselves as a productivity tool.

**Always:** Lead with the claim. One idea per post. End on solidity.

### The One Sentence to Remember

> Continua is the layer that remembers. Everything else is a renderer.

---

## PART IX: SUCCESS METRICS

### 3 Months
- First admin account created, 70 beta users onboarded
- Context Layer API abstraction built and working
- Context restore working end-to-end across devices
- The "open on device B, everything is there" moment working

### 6 Months
- 70 beta users daily-active
- Cross-device sync reliable
- Context portability (JSON export) working
- Zero "where was I?" incidents

### 12 Months
- 500+ users
- Context Layer API documented as a protocol
- Plugin SDK in private beta
- First external developer building on the protocol

### 24 Months
- Context Layer as an open protocol specification
- Public marketplace with third-party plugins
- 5000+ users
- Enterprise adoption

---

## PART X: RULES FOR EXECUTION

1. **Layer 1 first.** No app feature starts until the context layer is solid.
2. **Product brutalism.** Make the core promise work so well users feel its absence everywhere else.
3. **Everyone inclusivity.** We serve everyone who uses a laptop, not a niche.
4. **Protocol ownership.** Every API route is our contract. Supabase is a driver, not the product.
5. **Context is sacred.** Never delete context for monetization. Charge for performance and reach.
6. **No hype.** The idea carries itself. No superlatives, no comparisons, no "revolutionary."
7. **Ship and iterate.** Perfect is the enemy of persistent. Get the restore moment working, then polish.
8. **One move at a time.** Don't build the marketplace before the context layer. Don't build the protocol before the product proves itself.

---

*This document is the authoritative source of truth for Continua.*

*File: `VISION.md` in project root. Version controlled. Update before architectural decisions — not after.*

*When confused about where we are, read Part V. When confused about what we are, read Part I. When confused about how we sound, read Part VIII.*
