# Continua — Master Implementation Plan
## The Work Continuity Layer Blueprint

> **Mission Statement:** Continua makes your work independent of your hardware. Your phone is your identity and control key; your local daemon captures metadata-first context; the web client restores your working environment on any machine in seconds.

---

## 1. Summary of Changes at a Glance

| Category | Key Initiatives | Impact |
|---|---|---|
| ❌ **REMOVE** | • Desktop OS UI on Mobile<br>• Raw API keys on Guest PCs<br>• "Replace your OS" framing<br>• Legacy root fix scripts | Eliminates tiny unusable UI, prevents credential leaks, defines a sharp product wedge, and cleans the codebase. |
| 🔄 **CHANGE** | • Web Shell ➔ Restoration Client<br>• Landing Page Copy & Value<br>• Chrome Ext ➔ Context Sensor<br>• Tauri ➔ Background Daemon | Repositions the browser interface as a recovery surface rather than an OS replacement. |
| ⚡ **IMPROVE** | • Context Kernel ➔ Graph Model<br>• AI Layer ➔ Capability Proxy<br>• Vector Clocks & Delta Sync<br>• Mobile Control UX & Haptics | Enables rich project associations, secure remote AI, sub-second sync, and 1-thumb mobile navigation. |
| ➕ **ADD** | • Ephemeral QR Connect Flow<br>• 3-Tier Privacy Guardrails<br>• Context Checkpoint Engine<br>• Community & Alpha Waitlist | Enables passwordless guest login, metadata-first privacy, lightweight 30s checkpoints, and structured user onboarding. |

---

## 2. ❌ What We Will REMOVE

### 2.1 Remove Desktop OS Metaphor from Mobile Screens
- **Why:** Trying to render windows, taskbars, and desktop docks on a 6-inch smartphone is frustrating and unusable.
- **Action:** Routed phones away from `<DesktopView />` directly to `<MobileControlCenter />`.

### 2.2 Remove Raw API Key / Password Transmission to Guest Machines
- **Why:** Typing personal OpenAI/Claude API keys or passwords on a shared, borrowed, or cybercafé computer leaves credentials vulnerable.
- **Action:** All guest sessions now use short-lived capability tokens via server proxy; raw keys never touch foreign browsers.

### 2.3 Remove "Replace Every Desktop App" Premise
- **Why:** Continua shouldn't attempt to clone Photoshop, Figma, or VS Code from scratch.
- **Action:** Position built-in apps as **Continuity Handoff Viewers** and lightweight fallback editors.

### 2.4 Clean Up Repository Cruft
- **Action:** Archive or remove one-off fix scripts and log artifacts from the root directory.

---

## 3. 🔄 What We Will CHANGE

### 3.1 Web Desktop Shell ➔ The "Restoration Client"
- Rebuilt from an OS imitation into a **Restoration Surface** that rebuilds your exact working situation (active project, Git branch, research tabs, AI agent session, and notes) on any borrowed machine.

### 3.2 Landing Page & Marketing Copy (`app/page.tsx`)
- Pivoted from *"The Next-Gen Web OS"* to *"Your Work Follows You. Independent of Hardware."*

### 3.3 Chrome Extension (`chrome-extension/`) ➔ Context Sensor #1
- Integrated into the Context Kernel to feed tab URLs, Figma document keys, Notion page titles, and research breadcrumbs.

### 3.4 Tauri Shell (`src-tauri/`) ➔ Background Context Daemon
- Shifted from a full desktop browser window to a minimal system tray daemon monitoring Git branches, active editor files, and terminal tasks.

---

## 4. ⚡ What We Will IMPROVE

### 4.1 Upgrade Context Kernel to Context Graph (`lib/context-kernel/`)
- Expand simple domain storage into a relational **Context Graph**: `Project ➔ [Git Branch, Active Files, Open Tabs, Task List, Recent Notes]`.

### 4.2 AI Agent Capability Proxy (`lib/ai-providers/`)
- Encrypt keys in user vault (AES-256 GCM) and issue time-limited capability tokens to client sessions.

### 4.3 Mobile Control Center Polish (`components/mobile/`)
- 1-thumb ergonomics, live agent task logs, and responsive workspace switching.

---

## 5. ➕ What We Will ADD

### 5.1 Ephemeral Guest Session Pairing (`/connect` & QR Auth)
- Guest computer displays a 120-second dynamic QR code + PIN.
- Phone scans QR code, grants scoped access, and guest session automatically wipes all cached state on logout.

### 5.2 Three-Tier Privacy Guardrail System
- **1. Standard (Default):** Metadata only (file paths, branches, URLs). Zero keystroke or raw code scraping.
- **2. Local Only:** Disables cloud sync; keeps records in local IndexedDB.
- **3. Private Session (Pause):** Temporarily pauses all context monitoring.

### 5.3 Non-Intrusive Context Checkpoint Engine
- Captures lightweight delta patches every 30–60 seconds (payloads < 2 KB).

### 5.4 Community Alpha Program & Feedback System
- In-app alpha badge and early-access builder circle for developers in Nigeria and globally.
