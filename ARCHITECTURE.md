# ANICHISOM OS — Architecture & Progress Tracker

> **This is the single source of truth for what exists, what's missing, and what comes next.**
> Updated after every completed work session. Refer to `BUILD_LOG.md` for session-by-session details.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Three-Layer Architecture](#2-three-layer-architecture)
3. [Layer 1 — Core Platform](#3-layer-1--core-platform)
4. [Layer 2 — Built-in Apps](#4-layer-2--built-in-apps)
5. [Layer 3 — Ecosystem & Marketplace](#5-layer-3--ecosystem--marketplace)
6. [Infrastructure & Backend](#6-infrastructure--backend)
7. [Security Posture](#7-security-posture)
8. [Architecture Improvements](#8-architecture-improvements)
9. [Hardware Communication Strategy](#9-hardware-communication-strategy)
10. [Rust Backend Migration Plan](#10-rust-backend-migration-plan)
11. [Implementation Plan](#11-implementation-plan)
12. [Codebase Statistics](#12-codebase-statistics)

---

## 1. System Overview

ANICHISOM OS is a browser-based universal workspace platform. It provides a persistent, personalized desktop environment that runs entirely in the browser, eliminating machine-switching and context-switching friction for multi-venture operators.

**Tech Stack:**

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, standalone output) |
| Language | TypeScript (strict mode) |
| UI | React 19 + Tailwind CSS 4 |
| State | React Context (os-context.tsx) + idb-keyval |
| Real-time | Yjs + y-websocket + y-indexeddb |
| Editors | TipTap (rich text), Monaco (code), Fabric.js (canvas) |
| Auth | Multi-provider: Custom PostgreSQL, Firebase, Supabase |
| AI | Multi-provider: Claude, Gemini, OpenAI, Qwen, Local (Ollama) |
| Storage | OPFS (local), Google Drive, Dropbox, MinIO (S3) |
| WebSocket | Express + Socket.IO + Redis adapter |
| Deployment | Docker (multi-stage), Docker Compose |

**Codebase Stats (as of last session):**

| Metric | Count |
|---|---|
| App component files | 41 |
| Library files | 39 |
| API route files | 15 |
| Test files | 8 |
| Environment variables | 34 |
| Key file LOC (os-context + desktop + server) | 1,931 |
| Total test count | 147 |

---

## 2. Three-Layer Architecture

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

---

## 3. Layer 1 — Core Platform

### 3.1 State Management & Persistence

| Component | File | Status | Notes |
|---|---|---|---|
| OS Context (God Context) | `lib/os-context.tsx` (604 lines) | ⚠️ Functional but needs extraction | 45+ API members, 19 useState hooks. Every state change re-renders all consumers |
| Storage Abstraction | `lib/storage.ts` | ✅ Complete | StorageAdapter pattern with LocalAdapter (idb-keyval) and FirebaseAdapter |
| OPFS File System | `lib/fs.ts` | ✅ Complete | Origin Private File System wrapper with full CRUD |
| Workspace Types | `lib/workspace-types.ts` | ✅ Complete | TypeScript types for all data models |
| Sync Queue | `lib/sync-queue.ts` | ✅ Complete | Event queue with exponential backoff, IndexedDB persistence, batching |
| Sync Manager | `lib/sync-manager.ts` | ✅ Complete | Coordination layer for sync operations |
| Zustand Stores | `lib/stores/` | ✅ Complete | auth, window, theme, workspace, browser, campaign, file, moodboard stores |

### 3.2 Authentication

| Component | File | Status | Notes |
|---|---|---|---|
| Auth Provider Interface | `lib/auth-providers/auth-provider.ts` | ✅ Complete | Interface all backends implement |
| Provider Factory | `lib/auth-providers/provider-factory.ts` | ✅ Complete | Factory pattern, switches by env var |
| Custom Provider (PostgreSQL) | `lib/auth-providers/custom-provider.ts` | ✅ Complete | Unique ID based auth |
| Firebase Provider | `lib/auth-providers/firebase-provider.ts` | ✅ Complete | Google Sign-In |
| Supabase Provider | `lib/auth-providers/supabase-provider.ts` | ✅ Complete | Email + OAuth |
| Session Store | `lib/session-store.ts` | ✅ Complete | Crypto-random tokens, TTL, pruning |
| Auth Validation | `lib/auth-validation.ts` | ✅ Complete | Input validation, rate limiting |
| Login API | `app/api/auth/login/route.ts` | ✅ Complete | CSRF protection, rate limiting, dev master key (env-gated) |
| Session API | `app/api/auth/session/route.ts` | ✅ Complete | Token resolution against store |
| Logout API | `app/api/auth/logout/route.ts` | ✅ Complete | Session destruction |
| Socket Token API | `app/api/auth/socket-token/route.ts` | ✅ Complete | WebSocket auth tokens |
| Passkey / WebAuthn | — | ❌ Not started | Planned for Phase 7 |
| Google SSO (Custom) | — | ❌ Not started | Planned for Phase 7 |

### 3.3 Real-time Collaboration

| Component | File | Status | Notes |
|---|---|---|---|
| Collaborative Doc Hook | `lib/hooks/useCollaborativeDoc.ts` | ✅ Complete | Shared Y.Doc + WebsocketProvider + UndoManager |
| Presence Manager | `lib/presence-manager.ts` | ✅ Complete | 15s heartbeat, auto-cleanup, efficient updates |
| File Lock Manager | `lib/file-lock-manager.ts` | ✅ Complete | Prevents edit conflicts on shared files |
| Event History Manager | `lib/event-history-manager.ts` | ✅ Complete | Audit trail with undo/redo |
| Yjs WebSocket Server | `server.ts` (line 27-48) | ✅ Complete | Per-IP rate limiting, auth middleware |
| Socket.IO Server | `server.ts` (line 32-135) | ✅ Complete | CORS restricted, session auth, Redis adapter |

### 3.4 Cloud File Bridge

| Component | File | Status | Notes |
|---|---|---|---|
| Storage Connector Interface | `lib/storage-connectors/storage-connector.ts` | ✅ Complete | IStorageConnector interface |
| Connector Registry | `lib/storage-connectors/connector-registry.ts` | ✅ Complete | Register/get connectors |
| Token Store (encrypted) | `lib/storage-connectors/token-store.ts` | ✅ Complete | AES-256-CBC encrypted at rest |
| Google Drive Connector | `lib/storage-connectors/google-drive-connector.ts` | ✅ Complete | Full OAuth, list/read/upload/delete |
| Dropbox Connector | `lib/storage-connectors/dropbox-connector.ts` | ✅ Complete | Full OAuth, list/read/upload/delete |
| Cloud Storage Connector | `lib/storage-connectors/cloud-storage-connector.ts` | ✅ Complete | Generic cloud connector |
| MinIO Adapter | `lib/minio-adapter.ts` | ✅ Complete | S3-compatible adapter |
| Supabase Adapter | `lib/supabase-adapter.ts` | ✅ Complete | Supabase storage adapter |
| OneDrive Connector | `lib/storage-connectors/onedrive-connector.ts` | ✅ Complete | Microsoft Graph API, OAuth2, token refresh |
| Local Folder (FS Access API) | `lib/storage-connectors/local-folder-connector.ts` | ✅ Complete | File System Access API, mount/browse/read/write |
| Storage API Routes | `app/api/storage/` (4 routes) | ✅ Complete | OAuth callbacks, file browsing, downloads |

### 3.5 AI Gateway

| Component | File | Status | Notes |
|---|---|---|---|
| AI Provider Interface | `lib/ai-providers/ai-provider.ts` | ✅ Complete | IAiProvider interface |
| Provider Factory | `lib/ai-providers/ai-provider-factory.ts` | ✅ Complete | Factory + fallback chain |
| Claude Provider | `lib/ai-providers/claude-provider.ts` | ✅ Complete | Anthropic API adapter |
| Gemini Provider | `lib/ai-providers/gemini-provider.ts` | ✅ Complete | Google GenAI adapter |
| OpenAI Provider | `lib/ai-providers/openai-provider.ts` | ✅ Complete | OpenAI API adapter |
| Qwen Provider | `lib/ai-providers/qwen-provider.ts` | ✅ Complete | DashScope adapter |
| Local Provider | `lib/ai-providers/local-provider.ts` | ✅ Complete | Ollama / LM Studio |
| AI Gateway Service | `lib/ai-gateway-service.ts` | ✅ Complete | Service logic |
| AI Proposal Engine | `lib/ai-proposal-engine.ts` | ✅ Complete | Proposal generation |
| AI Chat API | `app/api/ai/chat/route.ts` | ✅ Complete | Auth + rate limiting |
| AI Models API | `app/api/ai/models/route.ts` | ✅ Complete | Model listing |

### 3.6 Plugin System

| Component | File | Status | Notes |
|---|---|---|---|
| Plugin SDK | `lib/plugin-sdk.ts` | ✅ Complete | postMessage RPC, 8 namespaces, origin verification |
| Plugin Registry | `lib/plugin-registry.ts` | ✅ Complete | Manifest registry, install states, persistence |
| Plugin Store | `lib/stores/plugin.store.ts` | ✅ Complete | Zustand reactive state, selectors, privacy overrides |
| Plugin Service | `lib/services/plugin.service.ts` | ✅ Complete | Lifecycle management, permission enforcement, version checks |
| Plugin Sandbox | `components/apps/plugin-sandbox.tsx` | ✅ Complete | Origin-verified iframe, real permission gating, denied counter |
| Plugin API Routes | `app/api/plugins/` (2 routes) | ✅ Complete | CRUD for plugins |
| Marketplace UI | `components/apps/app-store.tsx` | ✅ Complete | Discover/Installed/Developer/Publish with permission toggles |
| Permission System | `lib/services/plugin.service.ts` | ✅ Complete | Per-RPC-method permission mapping, privacy overrides |
| Install/Uninstall Lifecycle | `lib/services/plugin.service.ts` | ✅ Complete | Full lifecycle: validate → install → persist → uninstall |
| Version Management | — | ⚠️ Partial | `checkVersion()` detects updates, no auto-update yet |

### 3.7 Security

| Component | Status | Notes |
|---|---|---|
| SSRF Proxy Protection | ✅ Fixed | Auth check, private IP blocking, rate limiting |
| Hardcoded Master Key | ✅ Fixed | Now requires `DEV_MASTER_KEY` env var |
| Session Tokens | ✅ Fixed | Crypto-random 32-byte tokens |
| CSP Headers | ✅ Fixed | Domain-restricted via next.config.ts |
| Socket.IO CORS | ✅ Fixed | Restricted to configured origins |
| Plugin Origin Verification | ✅ Fixed | INIT_CONTEXT handshake resolves parent origin |
| dangerouslySetInnerHTML | ✅ Fixed | Moved to globals.css |
| Admin Server-Side Auth | ✅ Fixed | Role checks on all admin endpoints |
| WebSocket Rate Limiting | ✅ Fixed | Per-IP connection limits |
| Session Encryption | ❌ Not started | Per-user encryption keys |
| API Key Client Encryption | ❌ Not started | Encrypt before IndexedDB storage |

---

## 4. Layer 2 — Built-in Apps

### 4.1 Core Apps (VISION Priority)

| App | File(s) | Status | VISION Target | Gap |
|---|---|---|---|---|
| **Browser** | `browser.tsx`, `mini-browser.tsx`, `power-browser.tsx` | ✅ Power Browser | Power Browser with pinned apps, persistent sessions, context memory, split view, focus mode, download-to-Files | Pinned apps sidebar, context memory, split view, download service all implemented |
| **Campaign Lab** | `campaign-lab/` (6 files) + `lib/stores/campaign.store.ts` | ✅ Complete | Notion replacement with hierarchy (Campaign→Phase→Task→Sub-task), linked databases, templates (8 workflows), client sharing, @mentions with notifications, Zustand store | Campaign hierarchy, linked databases, templates, client sharing, @mentions all implemented |
| **Moodboard** | `moodboard.tsx` + `lib/stores/moodboard.store.ts` | ✅ Complete | Milanote replacement with browser clipping (via BrowserClipService), campaign attach (via store), voting mode (record/approve/reject), export (JSON/PNG/Print via MoodboardExportService) | Zustand store with board CRUD, voting, clipping, campaign linking. Export menu with JSON, PNG (Canvas), and Print options |
| **Files** | `file-manager.tsx` + `lib/stores/file.store.ts` | ✅ Complete | Universal cloud bridge with unified explorer, smart routing (15 default routes), version history (event-sourced), OneDrive + local folder connectors | File store with multi-source navigation, smart routing, version history. OneDrive (Graph API) and local folder (FS Access API) connectors |
| **Calls** | `calls.tsx` | ⚠️ Basic | Campaign-linked calls with auto notes, recording-to-Files, guest links, Daily.co embed | Basic WebRTC only. No campaign linking, no auto notes, no recording, no guest links |
| **Terminal** | `terminal.tsx` | ✅ Working | Full terminal with process management | Functional with command registry, AI integration, Firebase sync |
| **Code Editor** | `code-editor/` (5 files) | ✅ Working | Monaco-based IDE with multi-file support | Working with sidebar, terminal panel, copilot, Yjs collab |
| **Notes/Reader** | — | ❌ Not built | Built-in notes app with markdown, PDF annotation | Missing entirely from VISION |

### 4.2 Productivity Apps

| App | File(s) | Status | Notes |
|---|---|---|---|
| Productivity Suite | `productivity-suite.tsx` | ✅ Working | Word (TipTap), Sheets (formula engine), Slides (Fabric.js) with export (HTML/CSV/PNG) |
| PDF Reader | `pdf-reader.tsx` | ✅ Working | PDF viewer component |
| Media Player | `media-player.tsx` | ✅ Working | Audio/video player with Yjs collab |
| Screen Recorder | `screen-recorder.tsx` | ✅ Working | Screen recording capability |
| Color Picker | `color-picker.tsx` | ✅ Working | Color utility tool |

### 4.3 System Apps

| App | File(s) | Status | Notes |
|---|---|---|---|
| Settings | `settings.tsx` | ✅ Working | OS appearance settings (wallpaper, theme, shaders) |
| Control Center | Built into `desktop.tsx` | ✅ Working | macOS-style quick settings panel |
| Command Palette | `command-palette.tsx` | ✅ Working | Spotlight search (Cmd+K) |
| Assistant | `assistant.tsx` | ⚠️ Stub | Local commands only (open apps, change themes). No real AI chat |
| AI Gateway | `ai-gateway.tsx` | ✅ Working | Multi-provider AI configuration UI |
| App Store | `app-store.tsx` | ⚠️ Stub | Only "Add Custom Web App" URL pinning |
| Admin Panel | `admin-panel.tsx` | ✅ Working | User/role management with server-side auth |
| Config Manager | `config-manager.tsx` | ✅ Working | OS config editor |
| History | `history.tsx` | ✅ Working | Event history viewer |
| Hardware Manager | `hardware-manager.tsx` | ✅ Working | Hardware diagnostics |
| Asset Pipeline | `asset-pipeline.tsx` | ✅ Working | Asset management with Yjs |

### 4.4 Venture Packs (Layer 3 — Currently in Layer 2)

| Pack | File(s) | Status | Notes |
|---|---|---|---|
| Ziklag Forensics | `ziklag-tools.tsx` | ⚠️ Stub | Case logging simulation, no real forensics tools |
| Clothing Brand | `clothing-brand-pack.tsx` | ⚠️ Basic | Sketch canvas only, no lookbook/inventory/Shopify |
| Hardware Pack | `hardware-pack.tsx` | ⚠️ Stub | UI shell only |
| Developer Pack | `developer-pack.tsx` | ⚠️ Stub | UI shell only |
| Photography Pack | `photography-pack.tsx` | ⚠️ Stub | UI shell only |
| Proposal Generator | `proposal-generator.tsx` | ✅ Working | AI-powered proposal generation |
| Side-Gigs | `side-gigs.tsx` | ⚠️ Basic | Marketplace UI, no time tracking/invoicing |

---

## 5. Layer 3 — Ecosystem & Marketplace

| Component | Status | Notes |
|---|---|---|
| Plugin SDK (postMessage RPC) | ✅ Complete | 8 namespaces: workspace, files, events, presence, calls, ui, auth, campaignLab |
| Plugin Sandbox (iframe) | ✅ Complete | Origin-verified, permission-granted |
| Plugin Registry | ✅ Complete | Manifest-based registration |
| Marketplace UI | ⚠️ Stub | URL pinning only, no install/uninstall lifecycle |
| Private Plugin Registry | ❌ Not started | GitHub-based private registry (Phase 4A) |
| Public Marketplace | ❌ Not started | Submission, review, revenue share (Phase 6) |
| ANICHISOM Creative Pack | ❌ Not started | Moodboard Mill + Proposal Generator + Client Portal |
| Ziklag Forensics Pack | ❌ Not started | Case Manager + Chain of Custody + Evidence Log |
| Clothing Brand Pack | ❌ Not started | Lookbook + Supplier + Collection Planner + Shopify Sync |
| Hardware Pack | ❌ Not started | BOM + Firmware + Suppliers + Components |
| Developer Pack | ❌ Not started | Deployment + Code Review + API Monitor + CI Bridge |
| Photography Pack | ❌ Not started | Gallery + Delivery + Watermarking + Print Orders |

---

## 6. Infrastructure & Backend

### 6.1 Current Backend (Node.js/Express)

| Component | File | Status | Notes |
|---|---|---|---|
| Express Server | `server.ts` | ✅ Working | Socket.IO + Yjs WebSocket + Next.js |
| Redis Adapter | `server.ts` | ✅ Working | Optional Redis for multi-instance |
| Docker | `Dockerfile` | ✅ Working | Multi-stage build |
| Docker Compose | `docker-compose.yml` | ✅ Working | App + Redis |
| Self-Hosted Compose | `docker-compose.self-hosted.yml` | ✅ Working | Supabase + MinIO |

### 6.2 Planned Backend (Rust)

| Service | Replaces | Status | Priority |
|---|---|---|---|
| Rust Auth Service | Next.js auth routes | ❌ Not started | Phase 8 (W17) |
| Rust WebSocket Server | Express + Socket.IO | ❌ Not started | Phase 8 (W17) |
| Rust Event Engine | sync-queue.ts | ❌ Not started | Phase 8 (W18) |
| Rust File Proxy | /api/proxy | ❌ Not started | Phase 8 (W18) |
| Rust Hardware Bridge | New capability | ❌ Not started | Phase 8 (W19) |

### 6.3 PWA & Offline

| Component | Status | Notes |
|---|---|---|
| Web App Manifest | ⚠️ Minimal | Basic manifest.json exists, no Service Worker |
| Service Worker | ❌ Not started | Required for offline mode |
| Install Prompt | ⚠️ Basic | PWASetup component exists but no real install flow |
| Offline Mode | ❌ Not started | Service Worker + IndexedDB cache |

---

## 7. Security Posture

### 7.1 Fixed (This Session)

| ID | Issue | Fix Applied |
|---|---|---|
| Build | monaco-editor peer dependency missing | Installed monaco-editor |
| S-01 | Open SSRF Proxy | Auth check, private IP blocking, rate limiting |
| S-02 | Hardcoded master key `'ANICHISOM'` | Requires `DEV_MASTER_KEY` env var |
| S-03 | Hardcoded session token | Removed; crypto-random tokens only |
| S-04 | CSP disabled | Added CSP headers via next.config.ts |
| S-05 | Socket.IO CORS wildcard | Restricted to configured origins |
| S-06 | Session token = userId | Crypto-random 32-byte tokens |
| S-07 | postMessage `'*'` targetOrigin | INIT_CONTEXT handshake resolves origin |
| S-08 | Plugin sandbox no origin check | Validates event.origin against plugin URL |
| S-09 | MCP bridge without auth | Session auth on Socket.IO events |
| S-10 | dangerouslySetInnerHTML | Moved CSS to globals.css |
| S-13 | Admin no server-side auth | Role checks on all admin endpoints |
| Perf | Terminal AnimatePresence | Removed animation wrapper |
| Perf | Yjs WebSocket no rate limit | Per-IP connection limits |

### 7.2 Remaining Security Work

| ID | Issue | Severity | Priority |
|---|---|---|---|
| S-12 | API keys unencrypted in IndexedDB | HIGH | Phase 7 |
| S-14 | No session encryption | HIGH | Phase 7 |
| S-15 | No passkey/WebAuthn | MEDIUM | Phase 7 |
| S-16 | No CSP nonce for inline scripts | MEDIUM | Phase 5 |

---

## 8. Architecture Improvements

### 8.1 The Problem

The current codebase has three structural issues that block scaling:

1. **God Context** — `os-context.tsx` (604 lines, 45+ API members, 19 useState hooks). Every state change re-renders every consumer. Adding any new state makes this worse.

2. **Monolithic Desktop** — `desktop.tsx` (1,163 lines) contains app registry, MCP bridge, keyboard shortcuts, idle timer, lock screen, dock, window management. Adding an app requires editing this file.

3. **No Test Infrastructure** — Zero test files. No test framework configured. No way to verify correctness.

### 8.2 Proposed Architecture (Incremental Extraction)

**Strategy: Extract, don't rewrite.** Each step preserves existing functionality. The app keeps working at every intermediate state.

#### Step 1: Zustand Store Extraction

```
lib/stores/
├── auth.store.ts          # user, session, login/logout
├── window.store.ts        # windows, z-index, open/close/minimize
├── theme.store.ts         # wallpaper, colors, shaders
├── workspace.store.ts     # workspaceMode, workspaceId
├── plugin.store.ts        # installed plugins, registry
└── ui.store.ts            # dock, command palette, control center
```

- `os-context.tsx` becomes a thin wrapper that delegates to stores
- Components migrate one-by-one to use stores directly
- Existing functionality preserved at every step

#### Step 2: App Manifest + Dynamic Loader

```
lib/app-manifest.ts     # Declarative registry: { id, name, icon, component, category }
lib/app-loader.ts       # Dynamic imports: React.lazy(() => import(...))
```

- Adding a new app = one entry in manifest
- No more editing desktop.tsx for new apps
- Code splitting per app (lazy loading)

#### Step 3: Services Layer

```
lib/services/
├── auth.service.ts         # Login, session, token refresh
├── storage.service.ts      # File operations across connectors
├── presence.service.ts     # Heartbeat, online tracking
├── event.service.ts        # Immutable event log, replay, audit
├── sync.service.ts         # Offline queue, conflict resolution
├── ai.service.ts           # Provider routing, fallback chain
└── plugin.service.ts       # Lifecycle: install → sandbox → permissions → uninstall
```

- Plain TypeScript classes with interfaces
- Components call services; services manage state through stores
- Testable: mock services for unit tests

#### Step 4: Desktop Shell Decomposition

```
components/desktop/
├── shell.tsx             # Pure composition: menubar + dock + windows + background
├── dock.tsx              # Dock rendering from manifest
├── window-manager.tsx    # Window lifecycle from windowStore
├── menubar.tsx           # Top bar
├── background.tsx        # Wallpaper + shaders
└── lock-screen.tsx       # Lock screen
```

- `desktop.tsx` goes from 1,163 lines to ~200 lines (pure composition)
- All business logic in stores and services

#### Step 5: Test Infrastructure

```
tests/
├── unit/                 # Service and store unit tests
├── integration/          # API route tests
├── e2e/                  # Playwright browser tests
└── setup.ts              # Test configuration
```

- Vitest for unit/integration tests
- Playwright for e2e tests
- Target: critical paths covered (auth, storage, collaboration)

---

## 9. Hardware Communication Strategy

### 9.1 Browser APIs for Hardware

The browser provides direct hardware communication APIs — no native app required for many use cases:

| API | Connects To | Browser Support | Use Case |
|---|---|---|---|
| **Web Bluetooth** | BLE devices (Arduino, Pi, sensors) | Chrome/Edge | IoT sensors, wearables, BLE peripherals |
| **WebUSB** | USB devices (Arduino, ESP32, debuggers) | Chrome/Edge | Firmware flashing, device debugging |
| **Web Serial** | Serial ports (embedded, microcontrollers) | Chrome/Edge | Embedded development, serial protocols |
| **Web HID** | HID devices (keyboards, controllers) | Chrome/Edge | Custom input devices, gaming peripherals |
| **Web NFC** | NFC tags and cards | Chrome/Android | Asset tracking, access control |
| **WebSocket Bridge** | Any hardware via local daemon | All browsers | Non-Web-API hardware (I2C, SPI, UART) |

### 9.2 Architecture for Hardware Integration

```
ANICHISOM OS (Browser)
    │
    ├── Web Bluetooth ──────→ BLE sensors, Arduino, Pi
    ├── WebUSB ─────────────→ USB devices, ESP32, debuggers
    ├── Web Serial ─────────→ Serial ports, embedded systems
    ├── WebSocket ──────────→ Local daemon (ws://localhost:8420)
    │                           └── Rust/Python process
    │                               └── Native protocols (I2C, SPI, UART)
    │
    └── Plugin: Hardware Pack
        └── UI for BOM, firmware, diagnostics
            └── Uses above APIs
```

### 9.3 Local Bridge Daemon (for non-Web-API hardware)

For hardware that lacks browser API support (I2C, SPI, custom protocols):

```rust
// Rust daemon (hardware-bridge)
// Listens on ws://localhost:8420
// Translates WebSocket ↔ native protocols

async fn handle_hardware_message(msg: HardwareMessage) -> Response {
    match msg.protocol {
        Protocol::I2C => i2c_bus::read_write(msg.address, msg.data),
        Protocol::SPI => spi_bus::transfer(msg.data),
        Protocol::UART => serial_port::write(msg.data),
        Protocol::Custom => custom_driver::execute(msg),
    }
}
```

**This is how Tauri/Electron apps access hardware — we just make it explicit and optional.**

### 9.4 Ziklag Forensics Hardware Integration

- WebUSB: Connect to data recovery hardware (write blockers, disk imagers)
- Web Serial: Talk to serial interfaces on diagnostic equipment
- WebSocket Bridge: Custom forensics hardware via Rust daemon
- All managed through the Hardware Pack plugin UI

---

## 10. Rust Backend Migration Plan

### 10.1 Why Rust

| Factor | Node.js (Current) | Rust (Planned) |
|---|---|---|
| Throughput | ~10K req/s | ~100K req/s |
| Memory | ~50MB baseline | ~5MB baseline |
| Concurrency | Single-threaded + event loop | True parallelism (tokio) |
| Security | Memory-safe (GC) | Memory-safe (ownership) |
| Auth | Timing-attack vulnerable | Constant-time comparison |
| Hardware | No native access | Direct serial/USB/I2C |

### 10.2 Migration Strategy (Incremental, Not Rewrite)

Each phase is independently deployable. Same API contracts. Zero frontend changes.

| Phase | Service | Replaces | Crate | Timeline |
|---|---|---|---|---|
| **R1** | Auth Service | Next.js auth routes | `axum` + `webauthn-rs` | W17 |
| **R2** | WebSocket Server | Express + Socket.IO | `axum` + `tokio` | W17 |
| **R3** | Event Engine | sync-queue.ts | `rusqlite` + `serde` | W18 |
| **R4** | File Proxy | /api/proxy | `reqwest` + `axum` | W18 |
| **R5** | Hardware Bridge | New capability | `tokio-serial` + `rusb` | W19 |

### 10.3 Rust Directory Structure

```
rust/
├── auth-service/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs           # Axum server
│       ├── routes/
│       │   ├── login.rs
│       │   ├── session.rs
│       │   └── logout.rs
│       ├── auth/
│       │   ├── webauthn.rs   # Passkey support
│       │   └── jwt.rs        # Token generation
│       └── store/
│           └── session.rs    # Redis-backed session store
│
├── ws-server/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── handlers/
│       │   ├── socket_io.rs
│       │   ├── presence.rs
│       │   └── mcp.rs
│       └── middleware/
│           └── auth.rs
│
├── event-engine/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── store.rs          # SQLite event store
│       ├── replay.rs         # Event replay engine
│       └── api.rs            # HTTP API for event queries
│
├── file-proxy/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── proxy.rs          # Streaming reverse proxy
│       ├── ssrf.rs           # SSRF protection
│       └── rewrite.rs        # URL rewriting
│
└── hardware-bridge/
    ├── Cargo.toml
    └── src/
        ├── main.rs           # WebSocket server
        ├── protocols/
        │   ├── i2c.rs
        │   ├── spi.rs
        │   ├── serial.rs
        │   └── usb.rs
        └── bridge.rs         # WebSocket ↔ protocol translation
```

---

## 11. Implementation Plan

### Phase 4A — Architecture Foundation (Weeks 1-2)

| # | Task | Deliverable | Priority |
|---|---|---|---|
| 4A.1 | Create Zustand stores (auth, window, theme, workspace) | `lib/stores/*.ts` | HIGH |
| 4A.2 | Create app manifest + dynamic loader | `lib/app-manifest.ts`, `lib/app-loader.ts` | HIGH |
| 4A.3 | Extract desktop shell components | `components/desktop/*.tsx` | HIGH |
| 4A.4 | Create services layer (auth, storage, event) | `lib/services/*.ts` | HIGH |
| 4A.5 | Add Vitest + write unit tests for services | `tests/` | HIGH |

### Phase 4B — Power Browser (Weeks 3-4)

| # | Task | Deliverable | Priority |
|---|---|---|---|
| 4B.1 | Pinned workspace apps (URL → named app icon) | Browser sidebar pinning UI | HIGH |
| 4B.2 | Persistent sessions (cookies/tokens per pinned app) | Session storage per user per workspace | HIGH |
| 4B.3 | Context memory (last URL per pinned app) | Restore last URL on open | HIGH |
| 4B.4 | Split view (browser + OS app side by side) | Window splitting capability | MEDIUM |
| 4B.5 | Download-to-Files (intercept browser downloads) | Service Worker download routing | MEDIUM |
| 4B.6 | Focus mode (single app full-screen) | Full-screen toggle | LOW |

### Phase 4C — Campaign Lab > Notion (Weeks 5-6)

| # | Task | Deliverable | Priority |
|---|---|---|---|
| 4C.1 | Hierarchy (Campaign → Phase → Task → Sub-task) | Tree navigation + breadcrumbs | HIGH |
| 4C.2 | Linked databases (cross-campaign references) | Database linking system | HIGH |
| 4C.3 | Templates (ANICHISOM, Clothing, Hardware workflows) | Template gallery + one-click apply | MEDIUM |
| 4C.4 | Client sharing (read-only view per campaign) | Share links + guest access | MEDIUM |
| 4C.5 | @mentions with notifications | Mention system + notification center | MEDIUM |

### Phase 5A — Files Universal Bridge (Weeks 7-8)

| # | Task | Deliverable | Priority | Status |
|---|---|---|---|---|
| 5A.1 | OneDrive connector (Microsoft Graph API) | New storage connector | MEDIUM | ✅ Done |
| 5A.2 | Local folder connector (File System Access API) | PWA-only local mount | MEDIUM | ✅ Done |
| 5A.3 | Unified source selector sidebar | Browse all sources in one UI | HIGH | ✅ Done (file store) |
| 5A.4 | Smart routing (design→Figma, video→DaVinci) | File type routing rules | MEDIUM | ✅ Done (15 routes) |
| 5A.5 | Version history (event-sourced file versions) | Version list + restore | MEDIUM | ✅ Done |
| 5A.6 | Share links (time-limited) | Link generation + expiry | LOW | ⬜ Not started |

### Phase 5B — Moodboard > Milanote (Weeks 9-10)

| # | Task | Deliverable | Priority | Status |
|---|---|---|---|---|
| 5B.1 | Browser clipping (one-click from pinned app) | Clip button in browser toolbar | HIGH | ✅ Done |
| 5B.2 | Campaign attach (board → campaign) | Board-to-campaign linking | MEDIUM | ✅ Done |
| 5B.3 | Voting mode (Tinder-style preference aggregation) | Voting UI + taste profiles | MEDIUM | ✅ Done |
| 5B.4 | PDF export | Canvas → PNG/Print rendering | LOW | ✅ Done (PNG + Print) |
| 5B.5 | AI layout suggestions | AI-powered arrangement | LOW | ⬜ Not started |

### Phase 5C — PWA + Offline (Weeks 11-12)

| # | Task | Deliverable | Priority |
|---|---|---|---|
| 5C.1 | Service Worker (cache-first strategy) | Offline shell + asset caching | HIGH |
| 5C.2 | Offline state restore (IndexedDB) | Full state from local cache | HIGH |
| 5C.3 | Install prompt (beforeinstallprompt) | Native install UX | MEDIUM |
| 5C.4 | Background sync (queue actions, sync on reconnect) | BackgroundSync API | MEDIUM |

### Phase 6A — Plugin Marketplace (Weeks 13-14)

| # | Task | Deliverable | Priority | Status |
|---|---|---|---|---|
| 6A.1 | Install/uninstall lifecycle | Full plugin management | HIGH | ✅ Complete |
| 6A.2 | Permission system (per-plugin access control) | Permission UI + enforcement | HIGH | ✅ Complete |
| 6A.3 | Private registry (GitHub-based) | Plugin hosting | MEDIUM | ⬜ Not started |
| 6A.4 | Marketplace UI (browse, install, rate) | Store interface | MEDIUM | ⚠️ Partial |

### Phase 6B — First-Party Packs (Weeks 15-16)

| # | Task | Deliverable | Priority |
|---|---|---|---|
| 6B.1 | ANICHISOM Creative Pack | Moodboard Mill + Proposal Generator + Client Portal | HIGH |
| 6B.2 | Ziklag Forensics Pack | Case Manager + Chain of Custody + Evidence Log | MEDIUM |
| 6B.3 | Side-Gigs (time tracking, invoicing) | Freelance management | MEDIUM |

### Phase 7 — Security & Privacy (Weeks 17-18)

| # | Task | Deliverable | Priority |
|---|---|---|---|
| 7.1 | Session encryption (per-user key from passkey) | Encrypted browser sessions | HIGH |
| 7.2 | API key encryption in IndexedDB | Encrypt before storage | HIGH |
| 7.3 | Passkey/WebAuthn auth | Passwordless login | MEDIUM |
| 7.4 | Per-app privacy model | Private/Shared toggle per app | HIGH |

### Phase 8 — Rust Backend (Weeks 19-22)

| # | Task | Deliverable | Priority |
|---|---|---|---|
| 8.1 | Rust auth service (WebAuthn + JWT) | Replaces Next.js auth routes | HIGH |
| 8.2 | Rust WebSocket server (axum + tokio) | Replaces Express + Socket.IO | HIGH |
| 8.3 | Rust event engine (SQLite) | Immutable event log | MEDIUM |
| 8.4 | Rust file proxy | Streaming, SSRF-safe | MEDIUM |
| 8.5 | Rust hardware bridge daemon | WebSocket ↔ native protocols | MEDIUM |

### Phase 8+ — Remaining Work (Weeks 23+)

| # | Task | Deliverable | Priority |
|---|---|---|---|
| 8+ | Clothing Brand Pack | Lookbook + Supplier + Collection Planner + Shopify | LOW |
| 8+ | Hardware Pack | BOM + Firmware + Suppliers + Components | LOW |
| 8+ | Developer Pack | Deployment + Code Review + API Monitor | LOW |
| 8+ | Photography Pack | Gallery + Delivery + Watermarking | LOW |
| 8+ | Public marketplace | Submission, review, revenue share | LOW |
| 8+ | Mobile (deferred) | Desktop/laptop focus first | DEFERRED |

---

## 12. Codebase Statistics

### File Counts

| Category | Count |
|---|---:|
| App component files (components/apps/) | 41 |
| Library files (lib/) | 47 |
| API route files (app/api/) | 15 |
| Root markdown docs | 16 |
| Config files | 15 |
| Infrastructure files | 7 |
| Test files | 12 |

### Key File Sizes

| File | Lines | Status |
|---|---:|---|
| components/desktop.tsx | 1,163 | Needs decomposition |
| lib/os-context.tsx | 604 | Needs store extraction |
| server.ts | 164 | Clean |
| components/apps/productivity-suite.tsx | ~959 | Complex but functional |
| components/apps/terminal.tsx | ~463 | Clean |

### Dependencies

| Category | Packages |
|---|---|
| Framework | next, react, react-dom |
| Styling | tailwindcss, tailwind-merge, clsx, class-variance-authority |
| State | idb-keyval, zustand |
| Real-time | yjs, y-websocket, y-indexeddb, y-monaco |
| Editors | @tiptap/*, @monaco-editor/react, fabric |
| Animation | motion (framer-motion) |
| Icons | lucide-react |
| AI | @google/genai, ai, @ai-sdk/openai |
| Auth | firebase, @supabase/supabase-js |
| Storage | minio |
| WebSocket | socket.io, socket.io-client, ws |
| Database | pg |
| Media | three, recharts |
| Utils | date-fns, isomorphic-dompurify, hot-formula-parser |

---

## Appendix: Quick Reference

### Adding a New App (After Architecture Improvements)

1. Create component in `components/apps/my-app.tsx`
2. Add entry to `lib/app-manifest.ts`
3. Done. No other files need editing.

### Adding a New Storage Connector

1. Implement `IStorageConnector` in `lib/storage-connectors/`
2. Register in `lib/storage-connectors/connector-registry.ts`
3. Add env vars to `.env.example`
4. Done.

### Adding a New AI Provider

1. Implement `IAiProvider` in `lib/ai-providers/`
2. Register in `lib/ai-providers/ai-provider-factory.ts`
3. Add env vars to `.env.example`
4. Done.

### Adding a New Auth Provider

1. Implement `AuthProvider` in `lib/auth-providers/`
2. Register in `lib/auth-providers/provider-factory.ts`
3. Set `NEXT_PUBLIC_AUTH_PROVIDER=newprovider`
4. Done.

---

*This document is the authoritative source of truth for ANICHISOM OS architecture.*
*Updated: 2026-07-11 | Next review: After Phase 5C completion.*
*Refer to `BUILD_LOG.md` for session-by-session progress details.*
