# 💻 ANICHISOM OS
**Version 1.0.0** — A Fully Persistent, Multi-User Web OS Built with Next.js, Yjs, and Firebase.

ANICHISOM OS is a cutting-edge, browser-based operating system built for extreme productivity, agentic coding, and cross-team creative collaboration. It completely un-mocks standard web applications by routing heavy operations directly to standard web APIs, true local storage (OPFS/IndexedDB), and real-time WebRTC synchronization engines.

---

## 🚀 Core Features

### 1. Global Infrastructure
- **Spotlight Search (`Cmd+K`):** Global command palette indexer allowing you to instantly boot apps, search clipboard history, and execute system commands entirely from the keyboard.
- **Smart Dock:** A self-filtering application dock that automatically manages state by hiding inactive apps and only surfacing pinned or currently running applications.
- **Unified File System (OPFS):** Complete native File Manager that seamlessly connects to Google Drive, Dropbox, Ziklag NAS, Nextcloud (WebDAV), and Custom Linux VPSs via SFTP. Allows 100% self-hosted configurations. Includes **AI File Analysis** for instant directory summarization via local/cloud LLMs.
- **Persistent State:** Uses `idb-keyval` under the hood. You can refresh, close tabs, or crash the browser, and all application states and file directories will instantly re-hydrate.

### 2. Built-In Pro Applications
- **Workspace (formerly Campaign Lab & Notes):** A world-class Notion-style workspace engine. Supports custom blocks (headings, lists, code), `/` slash commands, real-time Yjs multiplayer cursors, robust database configurations (Kanban/Tables), Web Clippers, and Form Builders.
- **Agentic Code Editor:** A multi-root IDE built on Monaco. Features context-aware IntelliSense, an automated **Secret Redactor** (which instantly masks API keys before saves/syncs), a built-in AI Copilot Panel for autonomous module refactoring, and an inline WebTerminal.
- **Terminal:** Atomic-block architecture terminal. Outputs are rendered natively as React components rather than string-blobs. Natively query AI (`ai [prompt]`) and manage OS directories.
- **Calls App:** Native integration with `navigator.mediaDevices.getUserMedia`. Real webcam streaming logic with memory track cleanup and mirrored CSS transforms.
- **Ziklag Tools / Forensics:** Specialized security and diagnostics dashboard measuring hardware metrics, tracking evidence logs, and hash verifications.
- **Proposal Generator & Side-Gigs:** Comprehensive business tools capable of tracking billable time via persistent local timers and automatically generating client proposals on demand.

### 3. Real-Time Multiplayer
All major collaborative applications (Workspace, Code Editor, Terminal) are bound by the `OSContext` provider. By switching into **Team Workspace** mode, data is synchronized in real-time between clients using `Yjs`, `y-webrtc`, and `y-indexeddb`, backed by Firebase for signaling. 

---

## 🛠️ Run Locally

**Prerequisites:**  Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure Environment:
   Ensure you have a `.env.local` configured with the necessary API keys (Gemini, Firebase, etc.).
3. Start the OS:
   ```bash
   npm run dev
   ```

*Crafted by the ANICHISOM Development Engine.*
