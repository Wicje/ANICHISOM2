# Continua — The Persistent Context Protocol

> **"Pick up exactly where you left off. On any machine, in any tool, at any time."**

---

## 📌 Executive Summary

Modern knowledge workers lose hours every week to **context fragmentation**. When a laptop dies, when you switch between your work desktop and home machine, when you borrow a friend's laptop, or when you switch between client projects, your active mental model is obliterated.

**Continua** is the cross-platform, local-first state synchronization protocol that remembers your exact working state—open files, cursor lines, Git branches, active documentation tabs, terminal directories, and notes—and teleports it across machines in seconds.

---

## 🎯 The Core Problem: The Context Re-Entry Tax

```
           THE TRADITIONAL NIGHTMARE                       THE CONTINUA REALITY
┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────────────┐
│ • Laptop dies or switches machine            │  │ • Laptop dies or switches machine            │
│ • Spend 45 mins downloading apps & repos     │  │ • Open Continua (Web or Native)              │
│ • Re-login to 10 services (2FA friction)     │  │ • Authenticate once via SSO / Passkey        │
│ • Search history for the 8 tabs you had open │  │ • Within 3 seconds: Everything restores to   │
│ • Reconstruct mental model from scratch      │  │   the exact line, branch, tab, and layout.   │
└──────────────────────────────────────────────┘  └──────────────────────────────────────────────┘
```

---

## ⚡ The Dual-Habitat Architecture

Continua does not force users into a single rigid workflow. It meets users wherever they work:

```
                         CONTINUA CONTEXT ENGINE
                       (Vector Clocks + Delta Sync)
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
   GUEST / BORROWED MODE                             PRO / NATIVE MODE
   (Instant Web OS / Zero Install)                  (Invisible Native Connectors)
   • For borrowed laptops, lab PCs,                 • For power users & developers
     emergencies & travel                           • Works inside native VS Code,
   • 100% sandboxed in browser                       Chrome, and Terminal
   • Ghost Mode: Zero local trace on exit           • Background sync via Rust daemon
```

### 1. Mode A: Instant Web Workspace (For Borrowers, Switchers & Emergencies)
* **Target**: People on borrowed laptops, university/lab computers, internet cafes, or recovering from hardware failure.
* **How it works**: Navigate to `continua.app` in any browser. Log in, and your sandboxed virtual desktop instantly rehydrates with an in-browser code editor, terminal, browser, and document tools.
* **Ghost Mode (Zero-Trace)**: When you close the tab or log out, your local storage and cookies are wiped completely. No private files or passwords remain on the host machine.

### 2. Mode B: Native-to-Native Teleportation (For Local Setup Diehards)
* **Target**: Developers and power users who refuse to leave their native macOS/Linux/Windows tools.
* **How it works**: A silent background daemon (Tauri/Rust) paired with a VS Code extension and browser add-on tracks active state metadata.
* **The Magic**: Leave your office MacBook (`Cmd+Shift+S`) ➔ Open your home PC (`Cmd+Shift+R`) ➔ Native VS Code opens to the exact Git branch and line number, native Chrome opens the exact documentation tabs, and the terminal `cd`s to the right folder.

---

## 🤖 The AI Working Memory Layer (Model Context Protocol / MCP)

Continua serves as the real-time context bridge for **Claude, Cursor, and ChatGPT**:

* Includes a built-in **MCP Server** (`mcp.mjs`).
* Instead of spending 15 minutes explaining your current problem to an AI assistant, Claude or Cursor queries Continua's local daemon:
  > *"User is editing `api/checkout.ts` on branch `feat/stripe-billing` resolving a webhook signature error, with Stripe API documentation open in Chrome."*

---

## 🔬 Deep Technical Architecture

```
╔═════════════════════════════════════════════════════════════════════════╗
║ LAYER 3: ECOSYSTEM & PLUGINS                                            ║
║ Plugin SDK ↔ Capability Sandbox Host ↔ Developer CLI                    ║
╠═════════════════════════════════════════════════════════════════════════╣
║ LAYER 2: INTERFACES (RENDERERS)                                         ║
║ [Native VS Code / Chrome Connectors] ↔ [Web Sandbox Workspace / Apps]   ║
╠═════════════════════════════════════════════════════════════════════════╣
║ LAYER 1: CONTEXT KERNEL PROTOCOL (Core IP)                              ║
║ • Lamport Vector Clocks (Causal ordering & deterministic merge)         ║
║ • Granular Delta Sync (Incremental JSON diffing & patching)             ║
║ • Pluggable Storage Drivers (Local OPFS / IndexedDB ↔ Supabase Cloud)   ║
║ • Tombstone Tracking (Soft-deletion preventing resurrection on sync)    ║
╚═════════════════════════════════════════════════════════════════════════╝
```

### Key Architectural Subsystems

* **🧠 Context Kernel Protocol (`lib/context-kernel/`)**:
  * **Lamport Vector Clocks (`vector-clock.ts`)**: True causal ordering and deterministic conflict resolution for distributed, offline multi-device editing.
  * **Granular Delta Synchronization (`delta-sync.ts`)**: Recursive diffing & patching engine to sync incremental object/array changes rather than full domain snapshots.
  * **Pluggable Storage Drivers (`repository.ts`, `supabase-driver.ts`, `memory-driver.ts`)**: Decoupled repository layer with zero-cloud local execution and cloud sync.
  * **Tombstone Preservation**: Soft-deletion with causal tracking preventing deleted domain items from resurrecting on sync.
* **🖥️ Dual-Target Architecture (Web & Native Desktop)**:
  * Run anywhere in the browser as an installable PWA or compile as a native **Tauri** desktop executable for macOS, Windows, and Linux.
  * Native IPC bridge (`src-tauri/`) providing direct local filesystem IO and host system telemetry.
* **🛍️ Plugin SDK & Developer Platform (`lib/plugin-sdk/`)**:
  * Official `@/lib/plugin-sdk` providing `context`, `storage`, `ui`, and `audio` APIs.
  * Capability-based permission sandbox host intercepting `postMessage` calls with fine-grained access control.
  * CLI template generator (`node scripts/continua-plugin-cli.mjs init <name>`) for community developers.
* **🐚 WebAssembly Linux Terminal Engine**: Run real Linux commands (`neofetch`, `htop`, `python`, `node`, `curl`, `ping`, `uname`, `uptime`, `env`) powered by WebAssembly and Origin Private File System (OPFS).
* **🤖 Offline WebGPU Local AI Engine**: 100% offline, zero-latency local LLM text generation using `navigator.gpu` without external API keys.

---

## 🗺️ Competitive Landscape & The Unfair Advantage

| Feature / Dimension | Apple Continuity / Handoff | Rewind / Limitless | Raycast / Workspaces | **Continua** |
|---|---|---|---|---|
| **Cross-Platform** | ❌ Apple only | ❌ macOS only | ❌ macOS/Windows only | ✅ **Mac, Windows, Linux, Web** |
| **Zero-Install (Web)** | ❌ No | ❌ No | ❌ No | ✅ **Yes (Runs on any borrowed PC)** |
| **Reconstitutes State** | ⚠️ Shallow (1 URL) | ❌ Raw video pixels | ⚠️ Static bookmarks | ✅ **Deep dynamic state (IDE, tabs, git)** |
| **Enterprise Privacy** | ⚠️ Closed ecosystem | ❌ Screen recording ban | ⚠️ Local only | ✅ **Encrypted structured state only** |
| **AI Integration** | ❌ Apple only | ⚠️ Vector search text | ⚠️ Basic prompt tools | ✅ **Native MCP Protocol Server** |

---

## 🚀 Future Expansion Axes & High-Value Markets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HIGH-VALUE MARKET EXPANSIONS                          │
├───────────────────────┬─────────────────────────┬───────────────────────────┤
│ 🏢 Multi-Client       │ 👥 Team Onboarding      │ 🤖 Human-to-AI Agent      │
│    Agencies           │    "Golden Contexts"    │    Delegation Handoff     │
│ 1-click silo switch   │ New hires clone senior  │ Delegate a bug to Claude/ │
│ between Client A & B  │ dev's working state on  │ Devin; it resolves it and │
│ with zero auth leaks. │ Day 1 in 10 seconds.    │ teleports state back.     │
├───────────────────────┼─────────────────────────┼───────────────────────────┤
│ ⏳ Workspace          │ 🔒 Enterprise Zero-     │ 🎓 Education &            │
│    Time Machine       │    Trust Sandboxes      │    Coding Bootcamps       │
│ Scrub backward to any │ Secure ephemeral work   │ Professor pushes live     │
│ minute/day to restore │ for BYOD contractors    │ environment to 50 student │
│ lost setups.          │ with zero local data.   │ laptops simultaneously.   │
└───────────────────────┴─────────────────────────┴───────────────────────────┘
```

---

## ⚙️ Quick Start & Setup

### 1. Running Locally (Web + Real-Time Server)

```bash
# Clone the repository
git clone git@github.com:Wicje/ANICHISOM2.git
cd ANICHISOM2

# Install dependencies
npm install --legacy-peer-deps

# Start Next.js frontend + local WebSocket collaboration server
npm run dev:local
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 2. Desktop Installation (Native Tauri App)

For native performance, system tray background execution, and direct host filesystem access:

```bash
# Run Desktop Dev Mode
npm run desktop:dev

# Build Native Binary (macOS .dmg, Windows .msi, Linux .AppImage)
npm run desktop:build
```

---

### 3. Self-Hosting Stack (Docker Compose)

A production-ready stack is available for self-hosting with local file storage (MinIO) and session caching (Redis):

```bash
cp .env.example .env.local
docker-compose -f docker-compose.self-hosted.yml up --build -d
```

---

### 4. Cloud Deployment (Vercel & Supabase)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FWicje%2FANICHISOM2&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,SUPABASE_SECRET_KEY,SUPABASE_JWTS_URL,NEXT_PUBLIC_APP_URL,NEXT_PUBLIC_AUTH_PROVIDER)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL schema from [`supabase-schema.sql`](supabase-schema.sql) in the Supabase SQL Editor.
3. Enable replication for `users`, `context_records`, and `apps`.
4. Deploy to Vercel with your Supabase credentials.

---

## 🧪 Testing & Verification

```bash
# Run unit & integration test suite (45 test suites, 649 tests passing)
npm test

# Run TypeScript type checks
npx tsc --noEmit

# Run End-to-End (E2E) UI Tests with Playwright
npx playwright test
```

---

## 💬 Frequently Asked Questions (FAQ)

#### Q: "Why not just use Chrome Tab Sync and Git?"
**A**: Git only syncs committed code; it doesn't know your uncommitted drafts, cursor line, active breakpoints, or terminal directory. Chrome Tab Sync only syncs raw history; it doesn't know which tabs belong to which project. Continua binds code, tabs, terminal, and notes into one coherent, synchronizable unit.

#### Q: "Is my data safe on a friend's or public laptop?"
**A**: Yes. In Guest Mode, Continua runs inside the browser's origin-isolated sandbox (OPFS) and encrypted memory. When you log out or close the tab, all local tokens and cache files are purged automatically.

#### Q: "Do local developers have to use a browser IDE?"
**A**: No. Local developers keep their native VS Code, terminal, and browser. Continua operates as an invisible background daemon that connects their machines together.

---

## 📝 Project Documentation Links

| Document | Description |
|---|---|
| [EXPLAINER.md](EXPLAINER.md) | Product explainer answering auth, tracking, and real-world scenarios |
| [VISION.md](VISION.md) | Comprehensive product vision, multi-tier roadmap, and business strategy |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full technical specification, Context Kernel schema, and IPC protocols |
| [CONTEXT_LAYER_SPEC.md](CONTEXT_LAYER_SPEC.md) | Mathematical specification of Vector Clocks and Delta Synchronization |
| [SETUP.md](SETUP.md) | In-depth credential configuration (Supabase, Sentry, Resend, OAuth) |
| [AUDIT_JULY2026.md](AUDIT_JULY2026.md) | Architectural audit and QA verification report |
| [supabase-schema.sql](supabase-schema.sql) | SQL setup queries for database tables, triggers & policies |

---

## 👥 Stakeholder & Pitch Summary

* **To a User**: *"Never lose your place again. If your laptop breaks or you borrow a computer, your entire workspace is one link away."*
* **To a Developer**: *"Teleport your native VS Code and research tabs between your work Mac and home PC without changing your setup."*
* **To an Investor**: *"A cross-platform, local-first context infrastructure layer sitting between native operating systems, cloud SaaS, and autonomous AI agents."*
