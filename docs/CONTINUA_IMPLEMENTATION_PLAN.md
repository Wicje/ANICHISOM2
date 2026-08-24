# Continua — Architectural Audit & Implementation Plan

> **Product Redefinition:** Continua is not an imitation OS in a browser; it is a **universal continuity layer for your digital work**. Your phone is your identity and control key; your local daemon captures metadata-first context; the web client restores your working situation anywhere.

---

## 1. Codebase Audit: What We Have vs. What's Missing

| Layer / Component | Current Status | Readiness for Pivot |
|---|---|---|
| **Web Desktop Shell** (`components/desktop/`) | 33 apps, OPFS, Yjs, Window manager, stores | Excellent base for the web restore client |
| **Context Kernel** (`lib/context-kernel/`) | Vector clocks, Delta sync, Supabase/IDB drivers | Protocol ready; needs context graph schema |
| **Chrome Context Bridge** (`chrome-extension/`) | Figma, Claude, ChatGPT, Notion, Linear detectors | Ready to feed into unified Context Model |
| **Native Runtime** (`src-tauri/`) | Tauri v2 + Rust file IO & telemetry | Ready to evolve into background context daemon |
| **Mobile Experience** (`components/mobile-*`) | Desktop squished into 6-inch phone viewport | Needs dedicated Mobile Control Center |
| **Auth & Security** (`lib/services/webauthn.*`) | Passkeys, SSO, DB auth | Needs Ephemeral QR connect & Scoped AI proxy |

---

## 2. Step-by-Step Implementation Roadmap

### Phase 1: The Mobile Command Center (Fixing the Phone Experience)
1. **Adaptive Mobile Routing for `/os`:**
   - Detect mobile viewports with `useIsMobile()` and route phones to `<MobileControlCenter />` instead of the multi-window desktop shell.
2. **Mobile Workspace Hub:**
   - View all active projects (*Continua OS*, *Agency OS*, *Metamorphoo*).
   - Display last active files, recent Git branches, open documentation tabs, and timestamps.
3. **Mobile AI Assistant:**
   - Direct chat interface with Claude / Gemini / OpenAI connected to your selected workspace.
   - Send prompts from your phone to run coding tasks on your active environment.

### Phase 2: Ephemeral Guest Login (The "Borrowed Laptop" Flow)
1. **QR Code Sign-In (`/connect`):**
   - Guest machine displays a temporary QR challenge.
   - User scans QR code with their phone to approve access.
2. **Scoped Capability Tokens:**
   - Guest machine receives an expiring session token (e.g., 60 minutes) with auto-wipe on tab close.
   - Zero storage of Google/GitHub credentials or raw API keys on the foreign machine.
3. **AI Vault & Proxy:**
   - AI requests from the guest machine route through Continua's server proxy using encrypted credentials held in the user's vault.

### Phase 3: Background Context Engine & Privacy Guardrails
1. **Context Graph Schema Extension:**
   - Map `Project ➔ [Git Branch, Active Files, Open Tabs, Task List, Recent Notes]`.
2. **Tauri / CLI Context Daemon:**
   - Detect active VS Code / terminal folders, git status, and integrate with the Chrome Extension bridge.
3. **Privacy Mode Switcher:**
   - **Standard (Default):** Collects only metadata (file paths, app names, tab URLs).
   - **Local Only:** Keeps all vector clocks and logs strictly inside IndexedDB/local storage; zero cloud sync.
   - **Private Session:** Pauses all context recording.

### Phase 4: Repositioning & Community Launch Strategy
1. **Landing Page Pivot (`app/page.tsx`):**
   - Update messaging from "A browser imitation of your OS" to **"Your digital work follows you anywhere"**.
   - Highlight developer & shared-computer use cases (cybercafés, university labs, multi-computer setups).
2. **Community & Alpha Waitlist:**
   - Create an early developer circle on Discord / WhatsApp for creators & devs moving between machines.
