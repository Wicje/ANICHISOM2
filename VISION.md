# ANICHISOM OS
## The Universal Workspace Platform — Vision v2.0
*June 2026 | Supersedes v1.0 | Owner: Founder / ANICHISOM*

---

> ### ⚠️ NOTICE TO ALL AI TOOLS (Cursor, Claude, v0, Copilot, and others)
>
> This v2.0 **supersedes** ANICHISOM OS Vision v1.0. Do not reference v1.0.
> This document is the single authoritative source of truth.
> Do not introduce tools, patterns, or architecture not explicitly endorsed here.
> Do not simplify scope to make implementation easier.
> When in doubt about any decision, **ask the founder before implementing.**

---

## 0. What Changed from v1 to v2

| Aspect | v1 | v2 |
|---|---|---|
| **Audience** | ANICHISOM + Ziklag teams | Anyone running multi-venture workflows |
| **Structure** | 9 apps in a flat list | Three-layer architecture (Core / Built-in / Ecosystem) |
| **Browser** | One of 9 apps | Most critical built-in — universal integration layer |
| **Files** | File browser | Universal cloud bridge (Drive, Dropbox, MinIO, local) |
| **Campaign Lab** | Project manager | Explicit Notion replacement |
| **Moodboard** | Design references | Explicit Milanote replacement |
| **Video calling** | Not in scope | Built-in Calls app (Phase 3C) |
| **Plugins** | Not in scope | Marketplace with venture-specific packs |
| **Native apps** | Not addressed | Defined strategy per tool (DaVinci, Adobe) |
| **Monetization** | Workspace plans only | Workspace plans + plugin marketplace |
| **Ventures** | ANICHISOM + Ziklag | + Clothing brand + Hardware company + any future venture |

---

## 1. The North Star (v2)

> **ANICHISOM OS is a universal workspace platform that eliminates machine-switching and context-switching friction for anyone running multiple ventures — giving each user a persistent, personalized environment that connects to every tool they use and grows with every new venture they start.**

The original portability insight is unchanged. What expands is the scope of who benefits and how the platform grows. ANICHISOM's team and the founder's ventures are not the end goal — they are the proof of concept and the first tenants. Every plugin built from real use becomes a product that others can install.

---

## 2. The Three-Layer Architecture

This is the fundamental structural reorganization of v2. Everything is organized into three layers:

```
╔═══════════════════════════════════════════════════════════╗
║  LAYER 3 — ECOSYSTEM (Marketplace, install what you need) ║
║                                                           ║
║  [ANICHISOM Pack] [Ziklag Forensics] [Clothing Brand]    ║
║  [Hardware Pack] [Developer Pack] [Photography Pack] [+]  ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 2 — BUILT-IN APPS (Come with every workspace)      ║
║                                                           ║
║  [Browser ⚡]  [Campaign Lab]  [Moodboard]  [Files]       ║
║  [Calls]  [Notes/Reader]  [Terminal]  [Code Editor]       ║
║  [Side-Gigs]                                              ║
╠═══════════════════════════════════════════════════════════╣
║  LAYER 1 — THE CORE (The platform itself)                 ║
║                                                           ║
║  Persistent State │ Auth + Workspaces │ Real-time         ║
║  Presence │ Event Sourcing │ Privacy Model │ File Bridge  ║
╚═══════════════════════════════════════════════════════════╝
```

**Layer 1 (Core)** is the OS. It handles state persistence, authentication, real-time presence, event sourcing, the privacy model, and the cloud file bridge. Every app in Layers 2 and 3 builds on Layer 1. No app bypasses it.

**Layer 2 (Built-in Apps)** ship with every workspace. These replace the 5+ tools the team currently switches between. The Browser is the most important — it is the integration layer for every web-based tool (Figma, Framer, Webflow, Gemini, Claude, Webflow, Shopify, and hundreds more).

**Layer 3 (Ecosystem)** are installable packs, per workspace. A clothing brand workspace installs the Clothing Pack. A forensics team installs the Ziklag Pack. A developer installs the Developer Pack. The platform grows without the core team building everything. This layer is also the primary long-term revenue driver.

---

## 3. Who This Serves

| Persona | Ventures | Core Need |
|---|---|---|
| **Founder** | ANICHISOM + Ziklag + Clothing + Hardware + student | Portability across all machines and all ventures |
| **Creative Director** | ANICHISOM | Browser sessions (Figma/Framer/Webflow), Campaign Lab, Moodboard |
| **UI/UX Designer** | ANICHISOM / freelance | Pinned design tools, Moodboard, Files (Design assets) |
| **Frontend Developer** | ANICHISOM / freelance | Terminal, Code Editor, Campaign Lab, pinned dev tools |
| **Motion Designer** | ANICHISOM | Files (asset organization), Campaign Lab, Moodboard |
| **Filmmaker / Photographer** | ANICHISOM / freelance | Files, Moodboard, Campaign Lab, Side-Gigs, native app context bridge |
| **Copywriter / Writer** | ANICHISOM / personal | Notes, Campaign Lab, PDF reader, pinned research tools |
| **Data Recovery / Forensics** | Ziklag | Ziklag Forensics Pack, Files, event audit trail |
| **Clothing Brand Operator** | New venture | Clothing Pack (lookbook, inventory, Shopify), Campaign Lab, Moodboard |
| **Hardware Engineer** | Ziklag / new venture | Hardware Pack (BOM, firmware, supplier), Terminal, Code Editor |
| **Multi-Venture External User** | Any | Portability + the exact plugins their ventures need |

---

## 4. The Non-Negotiable UX Flow

*(Unchanged from v1 — this is the product)*

```
1. Open the site in any browser OR click the installed PWA app on any OS
2. Workspace avatar grid appears (active members with presence dots)
3. User clicks their avatar → passkey / email / org SSO
4. Exact workspace state loads: windows positioned, apps open at last state,
   files at last scroll, pinned browser apps at last URL
5. Private apps show only personal data (invisible to others)
6. Shared apps show team state with real-time presence indicators
7. File locking activates on shared files when opened
8. All state syncs continuously
9. Close anywhere → reopen on any machine → step 4 restores everything
```

This experience is the product. If it is broken, nothing else matters.

---

## 5. The Browser App — Universal Integration Layer

**This is the most important built-in app. Do not underestimate it.**

### The Core Insight

The founder currently uses: Gemini, Claude.ai, Figma, Framer, Webflow, Notion, CapCut, Adobe Lightroom Web, Google Meet, Shopify — and more. Every single one of these runs in a browser. Instead of switching between separate browser tabs on a local machine, they run as **pinned workspace apps** inside the ANICHISOM OS power browser, with their sessions persisted to the workspace backend.

When you switch machines, you are not re-logging into Figma. Your Figma session was pinned and persisted as part of your workspace state. Same for every other pinned tool. This is true tool portability.

### Power Browser Features

| Feature | What It Does |
|---|---|
| **Pinned Workspace Apps** | Pin any URL as a named app icon. Figma becomes "Design". Claude.ai becomes "AI". Google Meet becomes "Calls". They appear in the app launcher like built-in OS apps |
| **Persistent Sessions** | Each pinned app's auth session is stored per-user per-workspace. Log in once, stay logged in across all machines |
| **Context Memory** | The browser remembers the last URL per pinned app. Opening "Design" returns to your last Figma file, not the Figma home screen |
| **Split View** | Run any browser app alongside any OS app side by side. Figma open while Campaign Lab is on the left. Research in browser while Notes is open |
| **Download to Files** | All browser downloads route to the OS Files app, not the local machine. Files downloaded in Figma, saved from Webflow — all go to the connected cloud storage |
| **Quick Launch** | `Cmd/Ctrl + Space` opens a launcher to switch between any pinned app instantly |
| **Focus Mode** | Hide all OS chrome, run a single pinned app full-screen for deep work |
| **Privacy Mode** | Per-pinned-app privacy. Work sessions in Claude.ai or Gemini can be private to the user |
| **Ad Blocking** | Clean workspace. No tracker interference between sessions |

### What This Immediately Unlocks (No Integration Work)

By just pinning these URLs, the following tools become "native" OS apps:

| Tool | Category | Already in Browser |
|---|---|---|
| Figma | Design | ✓ Pin it |
| Framer | Web design | ✓ Pin it |
| Webflow | Web development | ✓ Pin it |
| Claude.ai | AI assistant | ✓ Pin it |
| Gemini | AI assistant | ✓ Pin it |
| Adobe Photoshop Web | Image editing | ✓ photoshop.adobe.com |
| Adobe Illustrator Web | Vector editing | ✓ illustrator.adobe.com |
| Adobe Lightroom Web | Photo editing | ✓ lightroom.adobe.com |
| Adobe Express | Quick design | ✓ express.adobe.com |
| CapCut Web | Video editing | ✓ capcut.com |
| Descript | Audio/video editing | ✓ web.descript.com |
| Runway ML | AI video tools | ✓ runwayml.com |
| Google Meet | Video calling | ✓ meet.google.com |
| Shopify Admin | E-commerce | ✓ admin.shopify.com |
| Linear | Issue tracking | ✓ linear.app |
| Notion | (Until replaced) | ✓ notion.so |

**The browser is the integration strategy for all web-based tools.** No API, no SDK, no integration work.

---

## 6. Native Heavy App Strategy

Some tools are desktop-only with no browser version. Here is the explicit strategy for each:

### Tier 1 — Already in the Browser (Use the Browser App)

| Tool | Browser Version |
|---|---|
| Adobe Photoshop | photoshop.adobe.com |
| Adobe Illustrator | illustrator.adobe.com |
| Adobe Lightroom | lightroom.adobe.com |
| Adobe Express | express.adobe.com |
| CapCut | capcut.com |
| Descript | web.descript.com |
| Runway ML | runwayml.com |

No desktop Adobe or CapCut needed for most work. Use the web versions, pinned in the browser app.

### Tier 2 — Context Bridge (Desktop app stays, OS manages context)

For tools with no web version — **DaVinci Resolve, Adobe Premiere Pro, After Effects, InDesign**:

The OS cannot run these. But it manages the *context* around them:
- Campaign Lab stores the project file path and status ("Brand Video Q2 → `/Projects/BrandVideo/v3.drp` → In Edit")
- Files tracks exported assets when they land in a watched folder (connected Drive/Dropbox folder)
- The campaign deliverable links to the file with a one-click "Open Location" button
- Two team members cannot both claim the same video project (file locking via Campaign Lab status)

The OS is the coordination layer. DaVinci and Premiere are the execution layer. They work alongside each other, not in competition.

### Tier 3 — Remote Desktop (Optional Plugin, Phase 5+)

For users who need full desktop apps on borrowed hardware (a Chromebook at a conference, a hotel computer):
- A premium plugin that integrates with Shadow, Parsec, or AWS AppStream
- Streams a full desktop environment with any native app into the OS browser
- This is a power-user add-on, not a core feature
- Never block any v1–v4 decisions on this

### Tier 4 — Tauri Desktop App (Long-Term Option)

If the PWA is later upgraded to a Tauri-based desktop app (Rust + WebView), the OS gains the ability to launch native apps from within the OS UI and receive context back when they close. Phase 6+ at the earliest. Design nothing around this assumption now.

---

## 7. Files — Universal Cloud Bridge

Files is not a file browser. It is a **unified file system** that gives you one view of all files across all connected storage providers.

### Connected Sources

| Provider | Integration | Phase |
|---|---|---|
| **Google Drive** | Google Drive API + OAuth | Phase 2D |
| **Dropbox** | Dropbox API + OAuth | Phase 2D |
| **OneDrive** | Microsoft Graph API | Phase 3B |
| **Local folder** | PWA File System Access API (installed app) | Phase 3B |
| **MinIO (self-hosted S3)** | S3-compatible API | Phase 5A |
| **iCloud Drive** | Limited API (advisory only) | Phase 5+ |

### Key Features

| Feature | Description |
|---|---|
| **Unified Explorer** | Google Drive + Dropbox + local in one file tree with a source indicator |
| **Smart Routing** | Design files → opens in pinned Figma; video files → shows DaVinci context; docs → opens in Notes |
| **Upload from Browser** | Files downloaded in the browser app land in Files, not the local machine's Downloads folder |
| **Campaign Attach** | Attach any file from any connected source to a Campaign Lab deliverable |
| **Version History** | Every version of every OS-stored file tracked via the event system |
| **Offline Cache** | Recent files cached via Service Worker for low-connectivity travel |
| **Share Links** | Time-limited share links to any file, in any connected storage |

### What Files + Campaign Lab Together Replace

Notion's greatest value is organizing content alongside linked databases. Campaign Lab is the database. Files is the asset layer. Together they fully replace Notion for project and team organization.

---

## 8. Campaign Lab — The Notion Replacement

| Notion Feature | Campaign Lab Equivalent |
|---|---|
| Pages and sub-pages | Campaign → Phase → Task → Sub-task hierarchy |
| Databases with views | Timeline, kanban, list, calendar views per campaign |
| Linked databases | Campaign links to clients, files, team members, calls |
| Embeds | Attaches files directly from the OS Files app |
| Templates | Campaign templates for ANICHISOM, Clothing, Hardware workflows |
| Comments and @mentions | Native to every item in Campaign Lab |
| Client sharing | Read-only client view per campaign, no OS account needed |

### What Campaign Lab Does That Notion Cannot
- Every change is an immutable event (undo/redo, full audit trail)
- File locking: two people cannot edit the same campaign simultaneously
- Native presence: see who is in the campaign right now
- Generates proposals directly (ANICHISOM Pack feature)
- Connects to Calls app: meetings auto-link to their campaign and generate notes
- Phase-aware UI: Discovery view looks different from Delivery view
- Works offline with cached state (Notion requires network for almost everything)

---

## 9. Moodboard — The Milanote Replacement

| Milanote Feature | Moodboard Equivalent |
|---|---|
| Visual freeform canvas | Drag-and-drop image canvas |
| Pinterest-style pinning | Clip any image from the browser, auto-fetch |
| Columns and sticky notes | Flexible canvas: notes, columns, images, links |
| Sharing with clients | Shared workspace access, client view-only mode |
| Board export | Export as PDF or shareable link |
| Multiple boards | Unlimited boards per workspace |

### What Moodboard Does That Milanote Cannot
- **Moodboard Mill** (ANICHISOM Pack): Shared boards with clients use Tinder-style voting to aggregate preferences and generate taste profiles
- Connected to Campaign Lab: moodboards attach directly to campaigns
- Browser integration: one-click clip from any pinned browser app to a moodboard
- Privacy mode: private boards are invisible to other workspace members
- Event-sourced: every addition, removal, and rearrangement is undoable

---

## 10. Video Calling — The Calls App

### Why a Built-in Calls App (Not Just Google Meet via Browser)

Google Meet works great in the browser app. The distinction is **contextual integration**:

A call started from a Campaign Lab deliverable automatically:
- Creates a meeting note in Notes with timestamp, attendees, and duration
- Records the call and saves it to the campaign's Files folder
- Adds the call to the campaign's event history
- Marks the relevant campaign as "In Review" or whatever phase the call determines

That contextual linking is what Meet and Zoom can never do natively. **That is the differentiation.** If the Calls app is built without this contextual integration, it should not be built at all — users should just use Meet via the browser.

### Calls App Feature Set (Phase 3C)

| Feature | Detail |
|---|---|
| **One-click call** | Start a call from any Campaign Lab item, File, or Moodboard |
| **Screen share** | Share any OS window or the full workspace |
| **Recording** | Recordings go directly to Files, linked to the originating campaign |
| **Auto meeting notes** | A note is auto-created in Notes with timestamp and attendees |
| **Campaign context** | Calls are pinned to a campaign and visible in the campaign event log |
| **Guest links** | Clients and external guests join via a link, no OS account needed |

### Technology
- Phase 3C: Embed **Daily.co** or **Whereby** SDK (embeddable WebRTC, no infrastructure complexity)
- Native WebRTC only if demand validates the investment in Phase 5+
- Google Meet via the browser app remains the fallback for external, non-contextual calls

---

## 11. The Plugin / Marketplace System

**The platform's growth engine and primary long-term revenue driver.**

### What a Plugin Is

An ANICHISOM OS plugin is an app that:
- Runs inside the OS window manager alongside built-in apps
- Accesses Layer 1 services via a defined API (auth, state, files, events, presence, calls)
- Is sandboxed in an iframe with postMessage communication (cannot touch other apps' DOM)
- Is installable per workspace, not globally
- Has Private and Shared modes like any built-in app
- Can be free or paid through the marketplace

### Plugin API (Defined in Phase 4A)

```typescript
interface OSPluginAPI {
  workspace: WorkspaceService    // read/write workspace data
  files: FilesService            // access files from any cloud bridge
  events: EventService           // emit and subscribe to events
  presence: PresenceService      // know who is online, who is in what app
  calls: CallsService            // start or join a call with campaign context
  ui: UIService                  // render windows, notifications, modals
  auth: AuthService              // current user, permissions check
  campaignLab: CampaignService   // read/write campaign data (with permission)
}
```

### First-Party Packs (Built by ANICHISOM)

These ship with the OS and are the first paid marketplace offerings:

| Pack | Venture | Key Apps | Price |
|---|---|---|---|
| **ANICHISOM Creative Pack** | Agency | Moodboard Mill + Proposal Generator + Client Portal + Brand Guides | $15/mo |
| **Ziklag Forensics Pack** | Data recovery / forensics | Case Manager + Chain of Custody + Evidence Log + Hash Verifier | $25/mo |
| **Clothing Brand Pack** | Fashion venture | Lookbook Manager + Supplier Tracker + Collection Planner + Shopify Sync | $12/mo |
| **Hardware Pack** | Electronics venture | BOM Manager + Firmware Tracker + Supplier Contacts + Component Library | $12/mo |
| **Developer Pack** | Freelance dev | Deployment Tracker + Code Review Log + API Monitor + CI Bridge | $10/mo |
| **Photography Pack** | Freelancers | Gallery Manager + Client Delivery + Watermarking + Print Orders | $10/mo |

### Marketplace Growth Sequence

| Phase | Status | What Exists |
|---|---|---|
| Phase 4A | Private | Plugin SDK + sandbox. First-party plugins installed manually via GitHub |
| Phase 5+ | Private beta | ANICHISOM and Ziklag packs tested in production |
| Phase 6 | Public | Public submission open. 25% revenue share. Review process defined |

**Rule**: No public marketplace until the platform is stable, the first 3 first-party plugins are in production use, and there is a designated person managing review and developer relations.

---

## 12. Technical Architecture

### 12.1 Core Principles (All inherited from v1, non-negotiable)

1. Repository Pattern from Day 1 — all data through abstract interfaces
2. Event Sourcing — every action is an immutable event
3. Workspace as Root Entity — no orphaned data
4. File Locking before real-time editing
5. Offline-First PWA — Service Worker + IndexedDB
6. Self-hosting as first-class target (designed for in Phase 1, built in Phase 5A)

### 12.2 New in v2 — Plugin Sandbox Architecture

```
OS Core (Layer 1)
    │
    ├── Built-in Apps (direct Layer 1 access, no sandbox)
    │   └── Browser, Campaign Lab, Files, Moodboard, etc.
    │
    └── Ecosystem Plugins (sandboxed iframe + postMessage)
        ├── Receives only permitted data via message API
        ├── Cannot access DOM of other apps
        ├── Cannot read Layer 1 directly — must request via API
        └── Revenue share tracked by Plugin SDK licensing key
```

### 12.3 Browser App Architecture

- Session persistence: each pinned app's cookies and tokens are stored per-user per-workspace, encrypted with a per-user key derived from the user's passkey. The backend cannot read these in plaintext.
- Download intercept: a Service Worker intercepts all browser downloads and routes them to the Files app API instead of the local machine.
- URL state: the last URL per pinned app is part of user workspace state, persisted and restored on login.
- On the web version: browser apps run in isolated iframes with `sandbox` attributes.
- On the installed PWA: browser apps use the system WebView component.

### 12.4 Cloud File Bridge Architecture

```
User: "Open my Google Drive folder"
→ Files app requests token from OS Core auth layer
→ OS Core retrieves encrypted OAuth token for this user's Drive connection
→ Files fetches directory via Google Drive API
→ Files renders Drive folder alongside Dropbox and OS-native files
→ User opens a file → file is fetched, cached in IndexedDB, URL returned to app
→ File open event is emitted to the event log (for audit trail)
→ File lock is set if the file is shared
```

In self-hosted mode, MinIO (S3) replaces Google Drive. No Google dependency.

### 12.5 Full Stack (Updated)

```
Frontend:
  Next.js (App Router) + React + TypeScript
  Tailwind CSS + CSS Custom Properties (theming / personalization)
  Framer Motion (transitions, presence animations)
  PWA (Service Worker + Web App Manifest)
  IndexedDB (offline state cache for low-connectivity travel)
  WebSockets (presence + file locking signals)
  Daily.co SDK (video calling, Phase 3C)

Backend (Cloud Default):
  Firebase Auth + Firestore + Cloud Run + Firebase Storage

Backend (Self-Hosted):
  Supabase (Postgres + Auth + Realtime + Storage)
  MinIO (S3-compatible file storage)
  NestJS on Docker (API layer)
  Docker Compose (single-command deployment)

Plugin System:
  TypeScript SDK (plugin developer library)
  Sandboxed iframe + postMessage protocol
  Private plugin registry (Phase 4A)
  Public marketplace (Phase 6+)
```

---

## 13. Build Phases v2

| Phase | Weeks | Goal | Deliverables |
|---|---|---|---|
| **P1** | 1–2 | Core infrastructure | Workspace entity, event queue, state sync, Repository Pattern, plugin API scaffold |
| **P2A** | 3–4 | Portability MVP ★ | Avatar login, window hydration, Notes + PDF Reader — **MVP MILESTONE** |
| **P2B** | 4–5 | Power Browser | Pinned apps, persistent sessions, context memory, split view, download-to-Files |
| **P2C** | 5–6 | Campaign Lab | Notion replacement: hierarchy, views, @mentions, client sharing, templates |
| **P2D** | 6–7 | Files + Cloud Bridge | Google Drive + Dropbox integration, unified explorer, version history |
| **P2E** | 7–8 | Moodboard | Milanote replacement: canvas, URL clipping, browser integration, campaign attach |
| **P3A** | 8–9 | History + Safety | Event log UI, undo/redo (10-step), version snapshots, file locking |
| **P3B** | 9–10 | Installable PWA | Manifest, install prompt, offline mode, tested on Windows + Linux + ArchLinux |
| **P3C** | 10–11 | Calls App | Daily.co/Whereby embed, screen share, recording-to-Files, auto meeting notes, campaign link |
| **P4A** | 12–14 | Plugin Marketplace | Plugin SDK, sandbox architecture, private registry, install/uninstall flow, store UI |
| **P4B** | 14–15 | ANICHISOM Pack | Moodboard Mill + Proposal Generator + adaptive phase-aware UI |
| **P4C** | 15–16 | Side-Gigs | Private time tracking, auto-invoicing, client billing — full isolation from team |
| **P5A** | 17–18 | Self-Hosting | Docker Compose, Supabase + MinIO adapter, Firestore migration tools |
| **P5B** | 18–19 | Ziklag Pack | Forensics Desk, case management, chain of custody, hash verification |
| **P5C** | 19–22 | Venture Packs | Clothing Brand Pack, Hardware Pack, Developer Pack, Photography Pack |
| **P6** | 23+ | Intelligence + Scale | Behavior learning, smart defaults, CRDT exploration, public marketplace |

**Critical MVP Rule**: Phase 1 + 2A is the product. No Phase 2B work starts until Phase 1 + 2A is in daily personal use on at least two machines. The portability experience is the proof of concept for everything else.

**Phase 2B Elevated**: The Power Browser is now Phase 2B (moved up from previously being lower priority). This unlocks Figma, Framer, Claude.ai, Webflow, Adobe Web, and dozens of other tools immediately with no integration work, which motivates team adoption faster than any other feature.

---

## 14. Privacy Model

*(Unchanged from v1)*

Every app — built-in and ecosystem — operates in one of two modes:

**Private Mode**: Visible only to the logged-in user. No presence indicators. No collaboration. Feels entirely local and personal.

**Shared Mode**: Visible to invited collaborators or the full workspace. Presence active. File locking active. Audit trail visible. Owner controls permissions (view / comment / edit / admin).

**Default**: Private. Sharing is always an explicit action. No accidental visibility.

**Plugin inheritance**: Ecosystem plugins inherit the same privacy model. A Clothing Brand Pack app is Private by default until the workspace owner explicitly shares it with the team.

---

## 15. VC Risk Analysis v2

*(Inherits all 10 risks from v1. Five new risks are introduced by v2 scope.)*

### Risk 11 — Browser Security: Stored Sessions Are a High-Value Attack Target

**The Problem:**
Storing persistent auth sessions for Figma, Google Meet, Claude, Shopify, etc. in the OS backend means a backend breach exposes not just workspace data but potentially dozens of third-party app sessions. This is a concentrated honeypot.

**Solution:**
Session tokens are encrypted at rest using per-user keys derived from the user's passkey. The OS backend stores only encrypted blobs — it cannot decrypt them without the user's auth credential. OAuth tokens are refreshed client-side; plaintext tokens never leave the client. A dedicated security audit is required before any public launch involving session persistence. The self-hosted version means users' sessions stay on their own server.

### Risk 12 — Cloud File Bridge API Dependency

**The Problem:**
Google Drive and Dropbox APIs have rate limits, change pricing, can be deprecated with little notice, and require OAuth flows that confuse non-technical users. Building a product where a core feature (Files) depends on Google creates a fragile dependency.

**Solution:**
No connected storage source is essential. If Drive disconnects, Files still works with the OS-native storage and any other connected source. The self-hosted version defaults to MinIO — no Google or Dropbox dependency at all. Cloud bridges are additive, not foundational. Design the Files data model so that connected sources are optional extensions, not core dependencies.

### Risk 13 — Marketplace Quality Control Is a Full-Time Job

**The Problem:**
A plugin marketplace requires ongoing review, security auditing, and developer relations. Figma, Notion, and Slack each have dedicated teams for this. For a small team building the core product simultaneously, this is an unacceptable ongoing overhead before the core is proven.

**Solution:**
Phase 4A ships a private marketplace only. Plugins are installed manually via GitHub or a private registry. No public submission until Phase 6+, after the core is stable and there are validated real users. The first five plugins are all first-party. Public submission opens only when there is a dedicated person managing it. The plugin model exists in the architecture before it exists as a public marketplace.

### Risk 14 — New Ventures Are Distractions (Clothing Brand, Hardware)

**The Problem:**
Both the clothing brand and the hardware company are early-stage ventures that haven't generated enough operational history to know what tools they need. Building plugin packs for ventures that don't yet have their first product is speculative engineering. Combined with the OS build and existing agency + Ziklag work, this creates a context-switching trap that prevents anything from reaching quality.

**Solution:**
ANICHISOM OS is the platform. The clothing brand and hardware company are future tenants. The Clothing Pack and Hardware Pack are Phase 5C at the earliest — built only after the platform has real users and the ventures have enough operational experience to know what the tools actually need to do. Do not build a Clothing Pack for a clothing brand that doesn't have its first collection yet.

### Risk 15 — Video Calling Differentiation Is Easy to Lose

**The Problem:**
Google Meet and Zoom are deeply embedded, well-funded, and free for most use cases. A built-in Calls app that isn't significantly differentiated will be ignored by users who just use Meet via the browser. Spending Phase 3C engineering time on undifferentiated video calling is a waste.

**Solution:**
The differentiation is contextual integration, not video quality. A call launched from a Campaign Lab deliverable that auto-creates a meeting note, links the recording to the campaign, and adds to the campaign's event log is meaningfully different from Meet. If that contextual integration cannot be delivered well, deprioritize the Calls app entirely and let users use Meet via the browser. Only build Phase 3C if the contextual integration story is compelling.

---

## 16. Monetization v2

**Model: Open-Core SaaS + Plugin Marketplace**

### Workspace Plans

| Tier | Limit | Price | Key Differentiators |
|---|---|---|---|
| **Free (Cloud)** | 1 workspace, 3 users, 5GB | $0 | Portability, core apps, 3 browser pins |
| **Pro (Cloud)** | 3 workspaces, 10 users, 50GB | $15/mo | All built-in apps, unlimited browser pins, cloud file bridge, Calls app |
| **Team (Cloud)** | Unlimited | $19/user/mo | SSO, admin console, audit export, plugin marketplace access |
| **Enterprise** | Unlimited | Custom | Self-hosting support, SLA, white-label, all packs included |

### Plugin Marketplace

| Revenue Type | Terms |
|---|---|
| **Free plugins** | Community-built, open-source, no platform fee |
| **Paid plugins** | Developer sets price, platform takes 25% |
| **First-party packs** | $10–$25/mo each; highest margin, first to ship |
| **Enterprise plugins** | Custom pricing, negotiated per-org |

### Self-Hosted

| Tier | Features | Model |
|---|---|---|
| **Community** | Core apps, no AI, no marketplace | Free / open-source |
| **Enterprise Self-Hosted** | All features + Ziklag Pack + SLA | Annual license |

### Revenue Protection Rules (Architecture Implications)
- AI features (Proposal Generator, smart layout learning, call transcription) are cloud-only — never force to ship in community edition
- Calls recording and transcription are Pro+ only
- Plugin marketplace access requires Pro+ workspace — community edition installs plugins manually only
- The cloud browser session persistence (persistent logins across machines) is a Pro feature — free tier gets manual login per machine

---

## 17. Venture Contexts

Each venture the founder runs gets its own workspace context:

### ANICHISOM Creative Agency
```
Built-in apps: Browser (Figma, Framer, Webflow, Claude.ai pinned)
               Campaign Lab, Moodboard, Files (Drive connected), Calls, Terminal, Code Editor
Ecosystem:     ANICHISOM Creative Pack (Moodboard Mill + Proposal Generator)
External:      DaVinci Resolve (context bridge via Campaign Lab file links)
               Adobe Premiere (context bridge)
```

### Ziklag Data Recovery + Forensics
```
Built-in apps: Campaign Lab (cases as campaigns), Files (evidence storage)
               Terminal, Code Editor, Notes (case documentation)
Ecosystem:     Ziklag Forensics Pack (chain of custody, hash verifier, evidence log)
Hardware:      Future integration with Ziklag recovery hardware devices
```

### Clothing Brand (Future — Phase 5C)
```
Built-in apps: Campaign Lab (collections as campaigns), Files (lookbook assets)
               Moodboard (seasonal inspiration), Browser (Shopify admin pinned)
Ecosystem:     Clothing Brand Pack (inventory, supplier, collection planner, Shopify sync)
```

### Hardware / Embedded Systems (Future — Phase 5C)
```
Built-in apps: Campaign Lab (hardware iterations as projects), Files (schematics + firmware)
               Terminal, Code Editor (embedded dev environment), Notes (technical docs)
Ecosystem:     Hardware Pack (BOM manager, firmware tracker, supplier contacts, component library)
```

### Personal / Student
```
Built-in apps: Notes + PDF Reader (reading, annotation, markdown writing)
               Browser (Gemini, Claude.ai, research pinned), Files (personal cloud)
               Side-Gigs (personal freelance hours, invoicing)
```

---

## 18. What Success Looks Like

### 3 Months
- Phase 1 + 2A complete and in daily personal use on 2+ machines
- Power browser (Phase 2B): Figma, Claude.ai, Framer, Webflow, Adobe Photoshop Web pinned and sessions persisted
- Window state restores in < 3 seconds on any machine

### 6 Months
- Phase 2C–2E complete: Campaign Lab replaced Notion for the ANICHISOM team; Moodboard replaced Milanote; Google Drive + Dropbox connected in Files
- Entire ANICHISOM team (4+ people) daily-active; zero "where's that file?" incidents

### 12 Months
- Phase 3A–3C complete: History working, PWA installed on all team machines, Calls app with campaign context
- First external user using the OS (outside ANICHISOM/Ziklag)

### 18 Months
- Phase 4A–4C complete: Plugin SDK in private beta; ANICHISOM Creative Pack shipped and used in real client work
- Self-hosting in alpha with at least one external team running their own instance

### 24 Months
- Phase 5A–5B: Self-hosting production-ready; Ziklag Pack in production use for forensics cases
- 100+ external users, validated paying users in Pro or Team tier
- Plugin marketplace private beta with 3 first-party + 2 community plugins

### 36 Months
- Phase 5C–6: Clothing Brand Pack and Hardware Pack in production
- Public plugin marketplace open
- 500+ users across all tiers
- 10+ third-party plugins in marketplace
- ANICHISOM OS is the platform that powers every venture the founder runs

---

*This document is the authoritative source of truth for ANICHISOM OS v2.0.*

*The three-layer architecture (Core / Built-in / Ecosystem) is the organizational framework. All feature decisions should map to one of the three layers.*

*The Browser app is the most critical Phase 2 feature. It unlocks all web-based tools with no integration work. Treat it with the same engineering priority as the core persistence layer.*

*File: `VISION.md` in project root. Version controlled. Update before architectural decisions — not after.*
