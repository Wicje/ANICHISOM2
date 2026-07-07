# Ziklag OS: Project Status & Architectural Overview

## 1. The Vision
Ziklag OS is a universal workspace platform designed to eliminate machine-switching and context-switching friction for anyone running multiple ventures. It provides a persistent, personalized environment that connects to every tool you use and scales with every new venture you start. 

The core philosophy revolves around a **Three-Layer Architecture** (which the codebase is actively migrating towards):
1. **Layer 1 (The Core):** The base OS, Auth, Persistence (Firebase + IndexedDB), Real-time sync, and the File Bridge (OPFS).
2. **Layer 2 (Built-in Apps):** The universal apps that ship with every workspace (Browser, Campaign Lab, Moodboard, Files, Code Editor, System AI).
3. **Layer 3 (Ecosystem / Marketplace):** Installable, venture-specific packs (Ziklag Forensics Pack, Clothing Brand Pack, Hardware Pack) that extend the OS dynamically.

## 2. Core Technologies & Dependencies
The platform is built on a modern, highly scalable web stack:
- **Framework:** Next.js 15 (App Router, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (with `lucide-react` for icons)
- **State & Persistence:** 
  - `idb-keyval` (IndexedDB for offline-first local storage)
  - Firebase (Firestore for real-time cloud syncing and authentication)
- **Window Management:** Custom OS Context (`lib/os-context.tsx`) handling z-indexes, window spawning, maximizing, and focus arrays.
- **File System:** Origin Private File System (OPFS) via native browser APIs, with IndexedDB fallbacks (`lib/fs.ts`).
- **Rich Text / Editors:** Tiptap (Campaign Lab, Word Editor)
- **Canvas / Drawing:** Fabric.js (Slides Editor, Moodboard, Clothing Sketch)
- **Animations:** Motion (Framer Motion) for smooth window rendering and transitions.

## 3. The Apps & How They Work

### System AI (AIGateway)
- **Status:** **FULLY WORKING**
- **How it works:** Merges system-level OS control with generative AI. It intercepts inputs like "open browser" and triggers `window.os.openWindow`, while routing standard questions to the Google Gemini API (gemini-3.5-flash).
- **Features:** System theme changing, screen shader toggles, live AI chat.

### Campaign Lab
- **Status:** **FULLY WORKING**
- **How it works:** A Notion-style rich block editor built on Tiptap. It manages project phases (Discovery, Design, Delivery) and supports collaborative editing.
- **Features:** `/` slash commands (now correctly rendering via React Portals to prevent clipping), `@` mentions, shareable pages via links, phase tagging, and direct integration with Moodboards.

### Moodboard
- **Status:** **FULLY WORKING**
- **How it works:** An infinite canvas built with Fabric.js allowing users to drag and drop images, sticky notes, and text.
- **Features:** Supports *multiple independent instances* at the same time (using the top navigation `+` button), real-time cursors (`perfect-cursors`), image uploads (Blob to OPFS), and object manipulation.

### File Manager
- **Status:** **FULLY WORKING**
- **How it works:** A visual explorer connecting to the browser's OPFS. It simulates a real hard drive securely sandboxed within the browser.
- **Features:** Create folders, upload files, copy, paste, delete, and rename. Files are rendered dynamically with fallback states if directories are empty.

### Code Editor
- **Status:** **WORKING (Foundational)**
- **How it works:** A lightweight Monaco-style interface for editing raw text/code files stored in the OPFS.
- **Features:** Sidebar navigation, new file/folder creation, syntax highlighting structural basis.

### Productivity Suite (Word, Sheets, Slides, PDF)
- **Status:** **FULLY WORKING**
- **How it works:** A tabbed interface running complex local-first applications. It syncs state to IndexedDB first (latency-free) and Firebase second.
- **Features:** 
  - **Word:** Tiptap-based document editor with smart synchronization that pauses remote-overwrites while you are actively typing.
  - **Sheets:** Basic grid engine capable of formula evaluation.
  - **Slides:** Fabric.js powered presentation canvas with precise JSON-diffing to prevent focus-stealing during sync loops.

### Ziklag Diagnostics (Forensic Desk)
- **Status:** **WORKING (Interactive)**
- **How it works:** A venture-specific pack for data recovery and forensics.
- **Features:** Simulates case logging. "New Case" and "Log Evidence" buttons trigger system prompts and dynamically update the local case state table.

### Clothing Brand Pack
- **Status:** **WORKING**
- **How it works:** A venture-specific pack for fashion design.
- **Features:** Features a sketch canvas for designing garments. Canvas dimensions are strictly bounded to prevent 0x0 collapse bugs.

### Control Center & OS Chrome
- **Status:** **FULLY WORKING**
- **How it works:** The top-right macOS-style control center provides quick toggles.
- **Features:** Toggle screen shaders (CRT/Night mode), Wi-Fi mock toggles, brightness simulation. *Note: CSS backdrop-blur filters have been replaced with solid `#1a1a1a` backgrounds to ensure visibility on systems lacking hardware-accelerated compositing.*

## 4. Current Architecture Flow
1. **Boot:** The user hits `/`. `LoginScreen` verifies Firebase Auth.
2. **Desktop Initialization:** The `Desktop` component mounts, loading the user's `OSContext`.
3. **Window Spawning:** When an icon is clicked, the app is added to the `windows` array in context.
4. **Sandboxing:** Each app is wrapped in `<WindowFrame>`, which handles dragging, resizing, and closing independently of the app's internal logic.
5. **Persistence:** As the user interacts with the app, `Storage.setDoc` saves state to `idb-keyval` (instant) and Firebase (delayed/debounced) to ensure the workspace state is identical upon the next login.
