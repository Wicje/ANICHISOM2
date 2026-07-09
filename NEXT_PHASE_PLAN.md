# ANICHISOM OS — Next Phase Plan (Phase 4+)
> **Evolution, not revolution.** Building on Phases 1–3. We don't start from scratch — we make what's already great even better, and add what's missing.

---

## Design Philosophy

**Best, but not restrictive.** Our built-in apps (Campaign Lab, Moodboard, Files, Browser) aim to surpass their alternatives (Notion, Milanote, Google Drive, Chrome). But users who prefer Notion or Milanote can still bring them in through the plugin ecosystem and use them alongside our tools. We win by being better, not by being mandatory.

**AI works FOR the user.** The OS Assistant connects to any AI model — Claude, Gemini, OpenAI, Qwen, Codex, GLM, local models (Ollama, LM Studio), and future ones. The user picks their preferred model; the Assistant orchestrates on their behalf.

**Privacy-first.** Default: Private. Sharing is always an explicit action. Per-app privacy toggles. Session encryption. No tracking. Self-hosting option.

**Desktop/laptop only for now.** Mobile is deferred — focus on delivering the best desktop workspace experience first. Cross-machine state restore on laptops/desktops.

---

## Executive Summary

**What we built (Phases 1–3):** A functional web desktop with 27 apps, Yjs real-time collaboration, StorageAdapter persistence (local + cloud), undo/redo across all content apps, accessibility (ARIA/keyboard/reduced-motion), and a proxy browser. This is a **solid foundation**.

**What we're adding (Phase 4+):**

| New Capability | What It Means | Builds On |
|---|---|---|
| **Multi-AI Provider Gateway** | Assistant connects to Claude, Gemini, OpenAI, Qwen, Codex, GLM, local models — user picks their AI | Existing `assistant.tsx` + AI Gateway app |
| **Files as Universal Bridge** | Google Drive, Dropbox, OneDrive, self-hosted storage all mount into Files app | Existing `StorageAdapter` pattern + `file-manager.tsx` + OPFS |
| **Campaign Lab > Notion** | Hierarchy, linked databases, templates, client sharing — but users can still embed Notion via plugin | Existing block editor + Yjs collab |
| **Moodboard > Milanote** | Browser clipping, campaign attach, voting, export — but users can still bring Milanote via plugin | Existing canvas + Yjs collab |
| **Plugin/App Ecosystem** | Install apps/plugins from marketplace, use your own, share with others | Existing `OSPluginAPI` interface + App Store + sandbox |
| **Privacy-Focused Experience** | Per-app privacy toggles, encrypted sessions, no tracking, self-hosting option | Existing `workspaceMode` + auth providers |
| **Real Auth** | Passkey + Google SSO + unique ID, no backdoors | Existing auth provider factory |
| **Security Hardening** | Fix 4 CRITICAL + 9 HIGH vulnerabilities | Existing proxy, auth routes, Socket.IO server |
| **Modular Architecture** | Zustand stores, app manifest, service extraction — incremental, not rewrite | Existing `os-context.tsx` + `desktop.tsx` |

---

## Recent Progress

- Completed Google Drive connector updates in `lib/storage-connectors/google-drive-connector.ts`.
- Added refresh-token support, upload/create-folder handling, safer download proxy URL encoding, and full Drive OAuth write scope.
- Fixed connector token handling by awaiting `getValidToken()` calls in list/read flows.

## Next Agent Start

- Start from `lib/storage-connectors/google-drive-connector.ts` to validate the connector implementation and ensure cloud storage methods work end-to-end.
- Then continue with the storage API routes in `app/api/storage/files/route.ts` and `app/api/storage/download/[provider]/[fileId]/route.ts` for flow/error handling.
- After that, move to `components/apps/file-manager.tsx` for cloud source UI, connect/disconnect state, and browse/download interactions.

### Next Agent Tasks

1. Validate Google Drive connector functionality:
   - OAuth connection and callback handling
   - token refresh behavior
   - file listing, downloads, upload, create folder and delete operations
2. Verify storage API route behavior for connected/unauthenticated states and proxy download responses.
3. Confirm file manager UI uses provider state correctly, displays cloud connectors, and handles cloud navigation and downloads smoothly.

---

## I. Vision Gap Analysis — What's Missing

### A. Layer 1 — The Core (Platform Infrastructure)

| VISION Requirement | Current Status | Gap |
|---|---|---|
| Passkey + Google SSO + Unique ID auth | Multi-provider factory exists; Firebase/Custom/Supabase adapters implemented | **CRITICAL**: Hardcoded `'ANICHISOM'` master key bypass; session token = userId (forgeable); no passkey; no Google SSO on custom provider |
| Multi-AI provider gateway | AI Gateway app exists (single-provider API key input) | **CRITICAL**: No unified adapter pattern; no Claude/Gemini/OpenAI/Qwen/GLM/local routing; Assistant only does local commands |
| Files as universal cloud bridge | OPFS file manager with createObjectURL viewer | **CRITICAL**: No OAuth for Drive/Dropbox; no unified cross-source explorer; no smart routing; Files is local-only |
| Persistent state restore on any machine | IndexedDB + `/api/workspaces/sync` POST exists | **GAP**: Monolithic serialization; 2s throttle on drag; no checksum; no < 3s benchmark |
| Real-time presence | Socket.IO + Firestore presence manager exist | **PARTIAL**: Socket.IO CORS wildcard (no auth); presence writes every 5s to Firestore |
| Event sourcing (immutable event log) | `sync-queue.ts` with max 1000 events | **GAP**: Not immutable — events dequeued and discarded; no replay; no audit trail |
| Privacy model (Private/Shared per app) | `workspaceMode` ('private'|'agency') exists | **GAP**: Workspace-level, not per-app. VISION requires each app to have its own Private/Shared toggle |
| PWA + Service Worker + offline mode | Next.js standalone output configured | **GAP**: No manifest; no Service Worker; no install prompt (deferred — desktop/laptop focus first) |
| Repository Pattern | StorageAdapter/IStorageAdapter pattern exists | **PARTIAL**: Works for key-value CRUD; desktop.tsx and admin-panel bypass it |

### B. Layer 2 — Built-in Apps

| VISION App | Current Status | Gap |
|---|---|---|
| **Assistant (AI Hub)** | Local command handler (open apps, change themes, toggle shaders) | **CRITICAL**: No AI provider connectivity; no chat intelligence; no model switching; must connect to any AI and work for the user |
| **Browser (within the OS)** | Arc-style sidebar, history, bookmarks, proxy | **GAP**: No pinned workspace apps; no persistent sessions; no context memory; no split view; no privacy/focus modes. Must be good enough that users don't need to leave the OS |
| **Campaign Lab (> Notion)** | Block editor with 35 block types, database views, Yjs collab | **GAP**: No hierarchy; no linked databases; no templates; no client sharing; no @mentions. Must surpass Notion but allow users to embed Notion via plugin |
| **Files (Universal Bridge)** | OPFS file manager | **CRITICAL**: No Drive/Dropbox/OneDrive integration; no unified cross-source explorer; no smart routing; no version history; no share links |
| **Moodboard (> Milanote)** | Yjs canvas with nodes, connections, comments, undo | **GAP**: No browser clipping; no campaign attachment; no voting; no client view-only; no PDF export. Must surpass Milanote but allow users to bring Milanote via plugin |
| **Calls (with campaign context)** | WebRTC P2P with Firestore signaling | **GAP**: No campaign linking; no auto notes; no recording-to-Files; no guest links |
| **Notes/Reader** | Not built | **GAP**: Missing built-in app |
| **Side-Gigs** | Marketplace component exists | **GAP**: No time tracking; no invoicing; no client billing |

### C. Layer 3 — Ecosystem / Marketplace

| VISION Requirement | Current Status | Gap |
|---|---|---|
| Plugin SDK with OSPluginAPI | `lib/plugin-sdk.ts` defines interface with 8 namespaces | **STUB**: All methods return `postMessage` proxies; no real implementation |
| Plugin sandbox | Two duplicate sandbox components (one unused) | **DEMO**: No origin verification; `'*'` targetOrigin; no permission enforcement |
| Plugin marketplace | App Store has "Add Custom Web App" (URL pinning in Firestore) | **NOT A MARKETPLACE**: No install/uninstall lifecycle; no versioning; no review; no sharing between users |
| Custom app integration | Not supported | **GAP**: Users can't bring their own apps/tools into the OS and share them with others |

---

## II. Security Triage — Must Fix Before Any External Access

### CRITICAL (Exploitable with no auth)

| ID | Issue | File | Fix |
|---|---|---|---|
| S-01 | **Open SSRF Proxy** — `/api/proxy` accepts any URL, no auth, no rate limit | `app/api/proxy/route.ts` | Add session auth check; block private IPs (10.x, 172.16-31.x, 169.254.x, 192.168.x); domain whitelist for workspace; rate limit |
| S-02 | **Hardcoded Master Key Bypass** — login with `'ANICHISOM'` gives admin | `app/api/auth/login/route.ts` | Remove entirely. Gate with `NODE_ENV=development` only if needed for debugging |
| S-03 | **Hardcoded Session Token** — `'master-session-token-override'` accepted as admin | `app/api/auth/session/route.ts` | Remove hardcoded token; generate crypto-random session tokens |
| S-04 | **CSP disabled + frame-busting broken** — proxy returns `default-src * 'unsafe-inline' 'unsafe-eval'` | `app/api/proxy/route.ts` | Restrict CSP to proxied domain origin; remove `X-Frame-Options: ALLOWALL`; don't universally break `self !== top` |

### HIGH (Must fix before any external user access)

| ID | Issue | Fix |
|---|---|---|
| S-05 | Socket.IO CORS wildcard (`origin: "*"`) | Restrict to workspace domain; add auth handshake |
| S-06 | Session token = userId (forgeable) | Crypto-random tokens (32+ bytes); HTTP-only secure cookies |
| S-07 | postMessage with `'*'` targetOrigin in plugin SDK | Use specific origin; verify `event.origin` on receive |
| S-08 | Plugin sandbox no origin verification | Check `event.origin` against registered plugin URLs |
| S-09 | MCP bridge without auth (readFS/writeFS) | Require session auth on Socket.IO events |
| S-10 | dangerouslySetInnerHTML for style injection | Replace with React `style` prop or CSS modules |
| S-11 | innerHTML direct assignment | Use DOMPurify for all HTML sanitization |
| S-12 | API key stored unencrypted in IndexedDB | Encrypt before storage; decrypt only in memory |
| S-13 | Admin panel no server-side auth gate | Add server-side role check API |

---

## III. Architecture Evolution — Incremental Modular Extraction

> We're not rewriting — we're extracting. Each step preserves existing functionality.

### Current Problems

1. **God Context** — `os-context.tsx` has 45+ API members, 19 useState hooks. Any state change re-renders ALL consumers.
2. **Monolithic desktop.tsx** — 1100 lines: app registry, MCP bridge, keyboard shortcuts, idle timer, lock screen, dock, window management.
3. **Hardcoded app registry** — Adding an app requires editing desktop.tsx import + APPS entry.
4. **Zustand unused** — In package.json but never imported.
5. **Duplicate components** — Two PluginSandbox files; two browser implementations.

### Evolution Plan (Step-by-Step, No Rewrites)

```
Step 1: Extract Zustand stores FROM os-context.tsx
  → os-context.tsx becomes a thin wrapper that reads from stores
  → Components migrate one-by-one to use stores directly
  → Existing functionality preserved at every step

Step 2: Create app manifest
  → apps/manifest.json declares all apps declaratively
  → AppLoader reads manifest and dynamic()-imports on demand
  → desktop.tsx no longer needs 31 manual imports

Step 3: Extract services from components
  → AuthService, StorageService, PresenceService, EventService
  → Plain TypeScript classes with interfaces
  → Components call services; services manage state through stores

Step 4: Slim desktop.tsx
  → Shell becomes pure composition: menubar + dock + window manager + background + lock screen
  → Target: < 300 lines
  → All business logic lives in stores and services

Step 5: Real plugin system
  → PluginService manages lifecycle: register → install → sandbox → permissions → uninstall
  → OSPluginAPI interface becomes the real contract
  → Origin-verified postMessage + permission enforcement

Step 6: Marketplace
  → Install/uninstall flow; pack browsing; sharing between users
  → First-party packs (ANICHISOM Creative, Clothing Brand, Ziklag Forensics)
```

---

## IV. Multi-AI Provider Gateway — Assistant Connects to Any Model

### Design: Unified AI Adapter Pattern

The Assistant becomes a **universal AI hub** — the user picks their model, the Assistant orchestrates.

```
┌─────────────────────────────────────────────────┐
│              Assistant App (UI)                  │
│  Chat UI │ Model Selector │ Provider Settings    │
└────────────────────┬────────────────────────────┘
                     │
          ┌──────────▼──────────────────────────────┐
          │          AI Gateway Service              │
          │                                           │
          │  IAiProvider interface:                   │
          │    chat(messages, options) → response     │
          │    stream(messages, options) → AsyncIter  │
          │    listModels() → ModelInfo[]             │
          │    getCapabilities() → Capabilities       │
          │                                           │
          │  ┌─────────────┐  ┌─────────────┐        │
          │  │ ClaudeAdapter│  │ GeminiAdapter│       │
          │  └─────────────┘  └─────────────┘        │
          │  ┌─────────────┐  ┌─────────────┐        │
          │  │ OpenAIAdapter│  │ QwenAdapter  │       │
          │  └─────────────┘  └─────────────┘        │
          │  ┌─────────────┐  ┌─────────────┐        │
          │  │ CodexAdapter │  │ GLMAdapter   │       │
          │  └─────────────┘  └─────────────┘        │
          │  ┌─────────────┐                           │
          │  │ LocalAdapter │  ← Ollama, LM Studio    │
          │  │ (self-hosted)│                           │
          │  └─────────────┘                           │
          │                                           │
          │  ProviderFactory:                         │
          │    getProvider(name) → IAiProvider        │
          │    registerProvider(name, adapter)         │
          │                                           │
          │  Router:                                  │
          │    routeToBestProvider(task, userPrefs)    │
          │    fallbackChain(primary, ...fallbacks)    │
          └───────────────────────────────────────────┘
```

### Key Features

1. **Model Selector** — Dropdown in Assistant UI: Claude, Gemini, OpenAI, Qwen, Codex, GLM, Local (Ollama/LM Studio), Custom API endpoint
2. **Provider Settings** — Per-provider config (API key, endpoint URL, default model). Stored encrypted via StorageAdapter
3. **Streaming responses** — All providers return `AsyncIterable` for real-time token streaming in chat UI
4. **Fallback chain** — If primary provider fails (rate limit, outage), automatically falls back to next in user's preference order
5. **Local model support** — Ollama and LM Studio adapters connect to `localhost:11434` / `localhost:1234` for fully private, offline AI
6. **Context-aware routing** — Code tasks → Codex/Claude; creative tasks → Gemini; general → user's default
7. **OS integration** — AI can still open apps, change themes, toggle shaders (existing local commands) PLUS now generate content, analyze data, write code, summarize documents

### Implementation Steps

| Step | What | Builds On |
|---|---|---|
| 1 | Define `IAiProvider` interface in `lib/ai-providers/ai-provider.ts` | Existing AI Gateway app pattern |
| 2 | Create `ProviderFactory` in `lib/ai-providers/provider-factory.ts` | Mirrors existing auth provider factory |
| 3 | Implement `ClaudeAdapter` using `@anthropic-ai/sdk` | Anthropic API |
| 4 | Implement `OpenAIAdapter` using existing `@ai-sdk/openai` | Already in package.json |
| 5 | Implement `GeminiAdapter` using existing `@google/genai` | Already in package.json |
| 6 | Implement `QwenAdapter` using Qwen API | New dependency |
| 7 | Implement `LocalAdapter` for Ollama/LM Studio | HTTP to localhost |
| 8 | Add model selector + provider settings UI to Assistant | Existing `assistant.tsx` |
| 9 | Wire streaming responses into chat UI | React state + AsyncIterable |
| 10 | Add fallback chain + context-aware routing | ProviderFactory + Router |

---

## V. Files as Universal Bridge — Connect Everything to the OS

### Design: Storage Connector Pattern

Files app becomes the **universal gateway** — mount Drive, Dropbox, Notion, Milanote, self-hosted storage, and custom sources. Users see all their files in one place.

```
┌─────────────────────────────────────────────────┐
│              Files App (UI)                      │
│  Unified Explorer │ Source Selector │ Upload     │
└────────────────────┬────────────────────────────┘
                     │
          ┌──────────▼──────────────────────────────┐
          │       File Bridge Service                │
          │                                           │
          │  IStorageConnector interface:             │
          │    mount(config) → MountHandle            │
          │    listFiles(path) → FileEntry[]          │
          │    readFile(path) → Blob                  │
          │    writeFile(path, content) → void        │
          │    deleteFile(path) → void                │
          │    getMetadata(path) → FileMeta           │
          │    watch(path, callback) → WatchHandle    │
          │                                           │
          │  ┌──────────────┐  ┌──────────────┐      │
          │  │ DriveConnector│  │DropboxConnector│    │
          │  │  (Google API) │  │  (Dropbox API) │    │
          │  └──────────────┘  └──────────────┘      │
          │  ┌──────────────┐  ┌──────────────┐      │
          │  │ OneDriveConn  │  │ NotionConnector│    │
          │  │  (MS Graph)   │  │  (Notion API)  │    │
          │  └──────────────┘  └──────────────┘      │
          │  ┌──────────────┐                           │
          │  │ LocalConnector│  ← OPFS (existing)      │
          │  │  (always mounted)                          │
          │  └──────────────┘                           │
          │  ┌──────────────┐                           │
          │  │ SelfHosted   │  ← MinIO/S3/WebDAV       │
          │  │ Connector    │                           │
          │  └──────────────┘                           │
          │  ┌──────────────┐                           │
          │  │ CustomConnector│ ← Plugin-defined        │
          │  │ (extensible)  │                           │
          │  └──────────────┘                           │
          │                                           │
          │  ConnectorRegistry:                       │
          │    registerConnector(name, connector)      │
          │    getConnector(name) → IStorageConnector   │
          │                                           │
          │  Smart Router:                            │
          │    routeByType(fileType) → best connector   │
          │    design files → Figma plugin context      │
          │    video files → DaVinci context            │
          │    documents → Campaign Lab context         │
          └───────────────────────────────────────────┘
```

### Key Features

1. **Source selector** — Sidebar tabs: Local (OPFS), Google Drive, Dropbox, OneDrive, Notion, Self-Hosted, Custom
2. **Unified explorer** — Browse any mounted source in the same file tree UI; source indicator on each file/folder
3. **OAuth flows** — One-click "Connect Google Drive" / "Connect Dropbox" buttons that trigger OAuth; tokens stored encrypted
4. **Smart routing** — Design files → Figma browser pin; video → DaVinci context; documents → Campaign Lab
5. **Drag between sources** — Drag a file from Drive to Local OPFS to cache it offline; drag from Local to Drive to upload
6. **Self-hosted** — MinIO, S3, WebDAV connectors for users who want full control
7. **Custom connectors** — Plugin system allows anyone to create a new `IStorageConnector` and share it on marketplace

### Integration with Notion/Milanote

Users who prefer Notion or Milanote can:
- **Mount Notion as a storage source** — Read/write Notion pages as files in the Files explorer
- **Embed Milanote boards** — Via the plugin system, Milanote runs inside a pinned browser window
- **Use Campaign Lab alongside Notion** — Link a Campaign Lab campaign to a Notion database; bidirectional sync
- **Use Moodboard alongside Milanote** — Clip from Milanote into Moodboard; export Moodboard to Milanote format

### Implementation Steps

| Step | What | Builds On |
|---|---|---|
| 1 | Define `IStorageConnector` interface in `lib/file-bridge/storage-connector.ts` | Existing `IStorageAdapter` pattern |
| 2 | Create `ConnectorRegistry` in `lib/file-bridge/connector-registry.ts` | Mirrors auth/AI provider factories |
| 3 | Refactor existing OPFS/IndexedDB into `LocalConnector` | Existing `lib/fs.ts` + `file-manager.tsx` |
| 4 | Implement `DriveConnector` with Google Drive API + OAuth | New dependency (`googleapis`) |
| 5 | Implement `DropboxConnector` with Dropbox API + OAuth | New dependency (`dropbox`) |
| 6 | Add source selector sidebar to Files app | Existing `file-manager.tsx` sidebar |
| 7 | Add OAuth flow UI (Connect buttons, token management) | Existing auth provider factory pattern |
| 8 | Implement `NotionConnector` (read/write pages as files) | Notion API |
| 9 | Implement `SelfHostedConnector` (MinIO/S3/WebDAV) | Existing MinIO adapter (unused) |
| 10 | Smart routing + drag-between-sources | Files app + browser pin integration |

---

## VI. Campaign Lab > Notion & Moodboard > Milanote — Best But Not Restrictive

### Campaign Lab Evolution (Surpass Notion)

| Current | Target (Better Than Notion) | How Users Bring Notion |
|---|---|---|
| Flat block editor | Campaign → Phase → Task → Sub-task hierarchy with breadcrumb nav | Mount Notion as Files source; embed Notion in pinned browser; link Campaign Lab → Notion |
| Single database view | Linked databases (cross-campaign references, team DB, client DB) | Notion database sync via connector |
| No templates | Pre-built templates for ANICHISOM Creative, Clothing, Hardware, Ziklag workflows | Import/export Notion templates |
| No client sharing | Read-only client view per campaign; share links; @mentions with notifications | Share Notion pages alongside |
| No proposals | Auto-generate campaign proposals from context | Notion can't do this — our advantage |
| No AI integration | AI summarizes campaigns, generates briefs, suggests timelines | Bring Notion data into our AI via connector |

### Moodboard Evolution (Surpass Milanote)

| Current | Target (Better Than Milanote) | How Users Bring Milanote |
|---|---|---|
| Canvas with nodes/connections | Browser clipping (one-click from pinned app); AI-powered mood generation | Embed Milanote in pinned browser |
| No campaign attach | Attach board to campaign; client view-only; voting mode | Export Milanote boards to our format |
| No export | PDF export, image pack download, share links | Milanote has limited export — our advantage |
| No AI | AI suggests layouts, color palettes, style matches from campaign brief | Milanote can't do this — our advantage |

---

## VII. Plugin/App/Software Ecosystem — Use Your Own, Share With Others

### Design

```
┌──────────────────────────────────────────────────────────┐
│                    App Store / Marketplace                 │
│                                                            │
│  Browse │ Install │ Manage │ Share │ Create                │
│                                                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ First-party  │  │ Community     │  │ Private       │     │
│  │ Packs        │  │ Plugins       │  │ (your own)    │     │
│  │ (ANICHISOM,  │  │ (shared by    │  │ (not shared)  │     │
│  │  Clothing,   │  │  others)      │  │               │     │
│  │  Ziklag)     │  │               │  │               │     │
│  └─────────────┘  └──────────────┘  └──────────────┘     │
│                                                            │
│  Plugin Types:                                             │
│  • Web App (iframe) — any URL as an OS app                 │
│  • Storage Connector — adds Drive/Dropbox/etc to Files     │
│  • AI Provider — adds a new AI model to Assistant          │
│  • Theme Pack — custom wallpapers, icons, color schemes    │
│  • Tool Extension — adds features to existing apps         │
│                                                            │
│  Install → Sandbox (permissions) → Use → Update → Remove   │
│  Share: publish to marketplace OR keep private             │
└──────────────────────────────────────────────────────────┘
```

### Key Features

1. **Install any web app** — URL → pinned OS app with icon, runs in sandboxed iframe
2. **Bring your own tools** — Notion, Milanote, Figma, Linear, whatever — all work inside the OS
3. **Share with others** — Publish your custom app/plugin to marketplace; others install with one click
4. **Storage connectors as plugins** — Anyone can create a Drive/Dropbox/S3 connector and share it
5. **AI providers as plugins** — Anyone can add a new AI model adapter and share it
6. **Permission system** — Each plugin declares what it needs (files, network, AI, presence); user approves on install
7. **First-party packs** — ANICHISOM Creative Pack, Clothing Brand Pack, Ziklag Forensics Pack

---

## VIII. Privacy-Focused Experience

### Privacy Model

| Principle | Implementation |
|---|---|
| **Default: Private** | Every app starts in Private mode; sharing is an explicit toggle |
| **Per-app privacy** | Each app has a Private/Shared toggle in its title bar; shared apps show presence indicators |
| **Session encryption** | Per-user encryption key derived from passkey; browser sessions encrypted; API keys encrypted in IndexedDB |
| **No tracking** | No analytics; no third-party scripts; no fingerprinting; self-hosted option removes all cloud dependencies |
| **Data ownership** | User data stays in their workspace; export everything anytime; delete everything anytime |
| **Self-hosting** | Docker Compose: Next.js + PostgreSQL + MinIO; zero cloud dependencies; full control |

---

## IX. Performance Fixes — Memory Bloat & Bottlenecks

| ID | Issue | Severity | Fix |
|---|---|---|---|
| P-01 | God Context mass re-render | HIGH | Split into Zustand stores (incremental extraction) |
| P-02 | State serialization on every window drag | HIGH | Diff-based Zustand persistence; debounced 5s |
| P-03 | openWindow depends on 8 state values | HIGH | Move into `windowStore`; no cascade |
| P-04 | LocalAdapter polls IndexedDB every 1s | HIGH | Replace with `BroadcastChannel` API |
| P-05 | Session check polls every 5 min | HIGH | WebSocket auth event; re-check only on reconnect |
| P-06 | JSON.parse/stringify deep clone | MEDIUM | Use `structuredClone()` |
| P-07 | AnimatePresence on terminal entries | MEDIUM | Remove; use simple list + virtualization |
| M-01 | Object URL leaks in fs.ts | HIGH | Auto-revoke on dir change; `useBlobUrl` hook |
| M-02 | 16 createObjectURL calls | HIGH | `useBlobUrl(file)` auto-revoke hook |
| M-03 | Y.Doc no auto-eviction | MEDIUM | LRU eviction: max 20 docs; 5min idle destroy |
| M-04 | useCollaborativeDoc re-runs on name/avatar | MEDIUM | Use stable `userId` only in deps |
| M-05 | Sync queue writes on every event | MEDIUM | Batch: 5 events or 500ms before IndexedDB write |
| M-06 | Presence heartbeat every 5s | MEDIUM | Increase to 15s; `onDisconnect` cleanup |

---

## X. The Rust Question — Backend Services Only

**Keep frontend in React/Next.js/TypeScript.** The OS runs in browsers — Rust can't render DOM.

**Use Rust for backend services (incremental migration):**

| Service | Current | Rust Replacement | Benefit |
|---|---|---|---|
| Auth | Next.js routes (backdoors!) | Rust WebAuthn + JWT service | Fixes S-02/S-03/S-06; constant-time comparison |
| WebSocket | Express + Socket.IO | `axum` + `tokio` | 10x throughput; auth handshake built-in |
| Event engine | In-memory sync-queue.ts | Rust + SQLite event store | Immutable log; crash-safe; fast replay |
| File proxy | Next.js `/api/proxy` | Rust reverse proxy (`hyper`) | Fixes S-01/S-04; streaming; safe URL parsing |
| CRDT sync | Next.js + Firestore | Rust binary CRDT encoding | 10x smaller payload; fast merge |
| Encryption | None (plaintext) | Rust `ring` crate | AES-256-GCM; hardware acceleration |

**Phase strategy:** Rust services are independent microservices. Frontend talks to them via HTTP/WebSocket. No rewrite risk — each service is independently deployable and testable.

---

## XI. Phased Execution Roadmap — Desktop/Laptop Focus

### Phase 4 — Security + Auth + Architecture Foundation (Weeks 1-4)

**Goal:** Fix all CRITICAL security; implement real auth; begin Zustand extraction; start AI Gateway.

| Week | Task | Deliverable |
|---|---|---|
| W1 | Fix S-01/S-02/S-03/S-04 (CRITICAL security) | Auth-gated proxy; remove master key; remove hardcoded token; restrict CSP |
| W1 | Fix S-05/S-06 (HIGH security) | Socket.IO auth handshake; crypto-random session tokens |
| W2 | Define `IAiProvider` interface + ProviderFactory | Claude/Gemini/OpenAI/Qwen/Local adapter pattern |
| W2 | Implement ClaudeAdapter + OpenAIAdapter + GeminiAdapter | First 3 AI providers wired |
| W3 | Split os-context into Zustand stores (Step 1 of architecture evolution) | windowStore, themeStore, authStore extracted |
| W3 | Add model selector + provider settings to Assistant UI | User can pick their AI model |
| W4 | Define `IStorageConnector` interface + ConnectorRegistry | Drive/Dropbox/local adapter pattern |

### Phase 5 — AI Gateway Completion + Files Bridge + Power Browser (Weeks 5-8)

**Goal:** Complete AI multi-provider; Files as universal bridge; browser improvements.

| Week | Task | Deliverable |
|---|---|---|
| W5 | Implement QwenAdapter + LocalAdapter (Ollama) + GLMAdapter | All 6+ AI providers connected |
| W5 | Implement DriveConnector + DropboxConnector with OAuth | Files mounts Drive and Dropbox |
| W6 | Source selector sidebar in Files app + unified explorer | Browse Drive/Dropbox/Local in one UI |
| W6 | Browser pinned workspace apps + persistent sessions | Pin any URL as named OS app icon |
| W7 | Smart routing in Files (design→Figma, video→DaVinci context) | Files routes files to best tool |
| W7 | Performance fixes (P-01 through P-07 + M-01 through M-06) | Zustand stores eliminate cascade; BroadcastChannel; useBlobUrl |
| W8 | App manifest system + AppLoader | Declarative app definitions; no manual imports in desktop.tsx |

### Phase 6 — Campaign Lab > Notion & Moodboard > Milanote (Weeks 9-12)

**Goal:** Make built-in apps surpass alternatives; allow users to bring alternatives via plugins.

| Week | Task | Deliverable |
|---|---|---|
| W9 | Campaign Lab hierarchy + linked databases | Campaign→Phase→Task tree; cross-campaign references |
| W9 | Campaign Lab templates + client sharing | Pre-built templates; read-only client view; share links |
| W10 | Campaign Lab AI integration | AI summarizes, generates briefs, suggests timelines |
| W10 | Moodboard browser clipping + campaign attach | Clip from pinned app; attach to campaign; voting mode |
| W11 | Moodboard AI + export | AI suggests layouts/colors; PDF export; image pack download |
| W11 | NotionConnector + Milanote embed via plugin | Users can bring Notion/Milanote alongside our apps |
| W12 | Service extraction (AuthService, StorageService, PresenceService) | Business logic in services, not components |

### Phase 7 — Plugin Ecosystem + Privacy + Desktop Polish (Weeks 13-16)

**Goal:** Real plugin system with marketplace; privacy model; desktop experience polish.

| Week | Task | Deliverable |
|---|---|---|
| W13 | Plugin SDK implementation (real OSPluginAPI methods) | Workspace, files, events, presence, UI, auth, AI namespaces |
| W13 | Per-app privacy model | Private/Shared toggle per app; shared apps show presence |
| W14 | Plugin sandbox security + permission system | Origin verification; permission enforcement; CSP per plugin |
| W14 | Marketplace UI (browse, install, share, publish) | First-party packs; community plugins; private apps |
| W15 | Session encryption + passkey/WebAuthn auth | Per-user encryption; passkey login; encrypted API keys |
| W15 | Browser split view + focus/privacy mode | Side-by-side browser + app; full-screen pinned mode |
| W16 | Slim desktop.tsx to < 300 lines (composition only) | All logic in stores/services; shell is pure layout |

### Phase 8 — Rust Backend + Self-Hosting (Weeks 17-20)

**Goal:** Rust backend services for performance ceiling; self-hosting Docker Compose.

| Week | Task | Deliverable |
|---|---|---|
| W17 | Rust auth service (WebAuthn + JWT + encryption) | Replaces Next.js auth routes |
| W17 | Rust WebSocket server (axum + tokio) | Replaces Express+Socket.IO |
| W18 | Rust event engine + Rust file proxy | Immutable log; auth-gated streaming proxy |
| W18 | Docker Compose self-hosting | Next.js + Rust services + PostgreSQL + MinIO |
| W19 | CustomConnector SDK (plugin-defined storage connectors) | Anyone can create a storage connector |
| W19 | CustomAiProvider SDK (plugin-defined AI providers) | Anyone can add an AI model |
| W20 | Ziklag Forensics Pack (first marketplace pack) | Case Manager + Chain of Custody + Evidence Log + Hash Verifier |

---

## XII. Vital Gaps Priority Table

| Vital Gap | Why It Matters | Priority |
|---|---|---|
| **Fix 4 CRITICAL security issues** | Exploitable with no auth; blocks any external use | IMMEDIATE |
| **Real authentication** | Current has backdoors; no passkey; no Google SSO | CRITICAL |
| **Multi-AI provider gateway** | Assistant must connect to any AI model and work for user | CRITICAL |
| **Files as universal bridge** | Drive/Dropbox/Notion/self-hosted must connect to OS | HIGH |
| **Campaign Lab > Notion** | Must surpass Notion but allow users to bring Notion | HIGH |
| **Moodboard > Milanote** | Must surpass Milanote but allow users to bring Milanote | HIGH |
| **Session encryption** | API keys plaintext; VISION requires per-user encryption | HIGH |
| **Cross-machine state restore < 3s** | This IS the product — switch machines, same state | HIGH |
| **Privacy model per app** | Default: Private; sharing is explicit action | HIGH |
| **Plugin ecosystem** | Use your own apps, share with others; marketplace revenue | MEDIUM |
| **Power Browser pinned apps** | Don't leave the OS for browsing | MEDIUM |
| **Modular architecture (Zustand)** | Enables all future scaling | MEDIUM |
| **Rust backend services** | Performance ceiling lift | LONG-TERM |
| **Mobile (deferred)** | Desktop/laptop focus first | DEFERRED |

---

## XIII. Immediate Priority Order

1. **Fix 4 CRITICAL security issues** (S-01 through S-04) — IMMEDIATE
2. **Fix HIGH security** (S-05, S-06, S-09) — right after CRITICALs
3. **Define IAiProvider interface + implement first adapters** — Claude, OpenAI, Gemini
4. **Define IStorageConnector interface** — pattern ready for Drive/Dropbox
5. **Split os-context into Zustand stores** — incremental, one store at a time
6. **Add model selector to Assistant UI** — user picks their AI
7. **Implement DriveConnector + DropboxConnector** — Files as bridge
8. **Campaign Lab hierarchy + templates** — surpass Notion
9. **Moodboard clipping + campaign attach** — surpass Milanote
10. **Plugin SDK + marketplace** — use your own, share with others
11. **Session encryption + passkey auth** — privacy focus
12. **Rust backend migration** — performance ceiling lift

---

*This plan builds on what we've built (Phases 1–3) and evolves it toward what VISION.md v2.0 demands. Every step preserves existing functionality. We're making our apps the best in class — but never forcing users to abandon their preferred tools. The OS AI connects to any model. Files connects to any storage. The plugin ecosystem lets anyone extend, use, and share.*

---

## Current Handoff

If a new agent picks this up on another machine, start with [NEXT_AGENT_HANDOFF.md](./NEXT_AGENT_HANDOFF.md).
