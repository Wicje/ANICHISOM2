# ANICHISOM OS — Implementation Plan & Progress Tracker

> Generated from comprehensive audit on July 8, 2026. Updated as fixes are completed.

---

## Status Key
- ⬜ Not started
- 🔄 In progress
- ✅ Completed
- ⏸ Blocked / deferred

---

## Phase 1: Immediate Fixes (High Impact, Low Effort)

### 1.1 Wire up Office Suite toolbar
**File:** `components/apps/productivity-suite.tsx`
**Problem:** All toolbar buttons (Bold, Italic, Underline, font selector, heading selector) have no onChange/onClick handlers. User must rely on keyboard shortcuts only.
**Fix:** Added TipTap Underline, TextStyle, FontFamily extensions. Lifted editor ref to parent via `onEditorReady` callback. Wired all toolbar controls with onChange/onClick handlers using `editor.chain().focus()` commands. Active state highlighting (blue bg) for B/I/U when toggled on. Heading and font select reflect current editor state via `isActive()` and `getAttributes()`. `onSelectionUpdate` triggers toolbar re-render on cursor changes.
**Status:** ✅

### 1.2 Fix Moodboard comment persistence
**File:** `components/apps/moodboard.tsx`
**Problem:** New comments write to React state (`setComments`) but never to the Yjs Array. Comments are lost on page reload.
**Fix:** Changed `yComments` from `getArray` to `getMap` (keyed by comment ID, same pattern as nodes). Stored yComments on window object. Added `_updateYComment` and `_deleteYComment` helpers. All comment mutations (add, edit text, delete) now write directly to Yjs Map, which syncs to IndexedDB persistence.
**Status:** ✅

### 1.3 Fix Code Editor StatusBar cursor position
**File:** `components/apps/code-editor/components/StatusBar.tsx`, `components/apps/code-editor/index.tsx`
**Problem:** Always shows end-of-file line/col, not actual cursor position.
**Fix:** Added `onDidChangeCursorPosition` listener in `handleEditorDidMount` that updates `cursorPosition` state. Changed StatusBar props from `{ code, fileName }` to `{ cursorPosition, fileName }`. Now displays real cursor line/column.
**Status:** ✅

### 1.4 Fix Campaign Lab Yjs cleanup
**File:** `components/apps/campaign-lab/hooks/useCampaignState.ts`
**Problem:** The Yjs provider cleanup function is nested inside `.then()` chains, not returned from `useEffect`, causing memory leaks and duplicate providers on re-renders.
**Fix:** Refactored to use `useRef` for provider, wsProvider, ydoc, and yPages refs. Added `activeRef` guard to prevent async setup after unmount. Cleanup now properly returns from `useEffect` top-level, destroying all refs and cleaning window globals. Added `ydoc.destroy()` for full cleanup.
**Status:** ✅

### 1.5 Fix Object URL leak in Files app
**File:** `components/apps/file-manager.tsx`, `lib/fs.ts`
**Problem:** `URL.createObjectURL()` is called for every file but never revoked (`URL.revokeObjectURL()`), leaking memory until page unload.
**Fix:** Added `objectUrlsRef` Set in FileManager to track all blob: URLs from `readDir`. Added `revokeObjectUrls()` that revokes all tracked URLs before refetch and on component unmount. Added `FS.revokeUrl()` utility for single-file cleanup. URLs are now properly cleaned up on path change and unmount.
**Status:** ✅

---

## Phase 2: Medium-Term (Core Functionality)

### 2.1 Implement WebRTC in Calls app
**File:** `components/apps/calls.tsx`, `components/apps/calls/hooks/useWebRTC.ts`, `firestore.rules`
**Problem:** No WebRTC — camera preview works but "remote user" is a static placeholder. Cannot actually connect two people.
**Fix:** Created `useWebRTC` hook using `simple-peer` for WebRTC peer connections and Firestore for signaling. Firestore document at `calls/{roomId}` stores offer/answer SDPs; ICE candidates in subcollections `caller_candidates` and `callee_candidates`. Caller creates doc and writes offer; callee reads offer, signals peer, writes answer. Both listen for ICE candidates via `onSnapshot`. Updated CallsApp to show real remote video when connected, with connection status indicators (Waiting/Connecting/P2P/Failed). Updated Firestore rules to allow `calls` collection for signed-in users. Installed `@types/simple-peer`.
**Status:** ✅

### 2.2 Add `/api/proxy` endpoint for Browser
**File:** `app/api/proxy/route.ts`, `components/apps/mini-browser.tsx`, `components/apps/browser.tsx`
**Problem:** X-Frame-Options blocks most real websites from loading in iframes. Existing proxy only proxied HTML and redirected all other content. Browser pre-blocked many domains.
**Fix:** Rewrote proxy to: (1) rewrite all absolute and relative URLs in HTML to route through `/api/proxy?url=...`; (2) proxy CSS files with `url()` rewriting; (3) proxy JS, images, fonts, and binary content directly instead of redirecting; (4) add POST support for form submissions; (5) break frame-busting JS (`window.top`, `self !== top` checks). Removed the blocked-domain overlay from MiniBrowser — all HTTP URLs now go through the proxy. Updated standalone Browser app to use proxy too.
**Status:** ✅

### 2.3 Add export to Office Suite
**File:** `components/apps/productivity-suite.tsx`
**Problem:** No export in any format — no PDF, DOCX, CSV, XLSX, PPTX, PNG, HTML.
**Fix:** Added `Download` icon button in toolbar. `handleExport()` dispatches per-tab: Word→styled HTML (.html), Sheets→CSV (.csv with 15 cols × 30 rows), Slides→PNG (canvas.toDataURL at 2x multiplier via Fabric.js). Added `downloadFile` and `downloadDataURL` utility functions. Passed `sheetsDataRef` and `fabricCanvasRef` from parent to child editors for export access. Each export triggers an OS notification confirming the action.
**Status:** ✅

### 2.4 Wire up Campaign Lab block types
**File:** `components/apps/campaign-lab/components/BlockEditor.tsx`, `components/apps/campaign-lab/components/DatabaseView.tsx`, `components/apps/campaign-lab/types.ts`, `components/apps/campaign-lab/data.ts`
**Problem:** 35 block types declared but most are hidden textareas with no real rendering. DatabaseView only had 5 view modes (no gallery).
**Fix:** Extended Block type with `children`, `rows`, `columns`, `language`, `icon` fields. Added `TableBlock` sub-component — editable grid with configurable rows/columns, add/delete rows and columns, cell editing. Added `CodeBlock` sub-component — code textarea with language selector dropdown (10 languages) and copy-to-clipboard button. Updated toggle prefix with ChevronRight icon, expand/collapse state, and editable children with proper type inheritance. Updated callout prefix with configurable icon cycling (10 emoji icons). Added gallery view to DatabaseView — 3-column card grid with gradient covers, status badges, dates, assignee tags. Updated slash command execution to initialize default data: table→3 columns + 2 rows, toggle→1 child block, code→plaintext language, callout→💡 icon.
**Status:** ✅

### 2.5 Add document CRUD to Office Suite
**File:** `components/apps/productivity-suite.tsx`, `lib/storage.ts`
**Problem:** Documents keyed by `projectId` only; no create, open, save-as, or delete dialogs.
**Fix:** Added collapsible document sidebar with full CRUD. `DocMeta` type tracks id, title, type, updatedAt. Document index stored in Storage at `meta/doc_index_${workspaceMode}`. Sidebar shows all documents with rename (inline input, Enter/Escape), duplicate (copies all 3 doc types' storage data), delete (removes from index and Storage, switches to remaining doc). "New Document" button creates fresh doc with timestamped ID. Made `projectId` a state variable so switching documents re-mounts editors. Added editable document title bar above tabs. Toggle sidebar with PanelLeft icon.
**Status:** ✅

---

## Phase 3: Long-Term (Feature Depth)

### 3.1 Real-time collaboration for all content-creation apps
**Problem:** Only Campaign Lab and Moodboard have Yjs; most apps have no real-time sync.
**Fix:** Shared `useCollaborativeDoc` hook ✅ — centralizes Y.Doc + WebsocketProvider + UndoManager setup for all collaborative apps. Every content-creation app now wired:
- **Office Suite (Word/Sheets/Slides) Yjs wiring** ✅
- **Clothing Brand Pack SketchingTab Yjs wiring** ✅
- **Media Player Yjs wiring** ✅
- **Code Editor Yjs wiring** ✅ (Y.Doc leak fixed — provider cleanup now calls `ydoc.destroy()`)
- **Campaign Lab migration** ✅ — replaced bespoke `useCampaignState` hook with `useCollaborativeDoc`; dead `useCampaignState.ts` hook deleted as cleanup
- **Moodboard migration** ✅ — WebrtcProvider→WebsocketProvider, broken cleanup fixed (provider + awareness destroy on unmount), Y.Doc leak fixed (`ydoc.destroy()` in cleanup), yundo global leak fixed (UndoManager scoped to hook, no `window.yundoManager`)
**Status:** ✅ COMPLETE

### 3.2 Cloud persistence for core apps
**Problem:** Core apps used scattered persistence (idb-keyval dynamic imports, localStorage) with no cloud sync path. Apps had no unified storage pattern.
**Fix:** Migrated all 11 core apps to `StorageAdapter` (instance-based) or `Storage` (static facade) — both route by `workspaceMode` ('private'→LocalAdapter/idb-keyval, 'agency'→FirebaseAdapter/Firestore). This gives every app a cloud sync path when users switch workspace mode.
- **3.2.1 AI Gateway** ✅ — Replaced `import('idb-keyval')` dynamic imports with `StorageAdapter('ai-gateway', workspaceMode)`. Config load via `storage.get('config')`, save via `storage.set('config', ...)`. Removed all idb-keyval references.
- **3.2.2 Asset Pipeline** ✅ — Replaced `import { get, set, entries, keys } from 'idb-keyval'` with `StorageAdapter('asset-pipeline', workspaceMode)`. Index pattern for `entries()` scan: store `index_{tab}` doc with `{ ids: string[] }`, load individual items by ID. Upload saves asset + updates index.
- **3.2.3 Browser bookmarks** ✅ — Replaced localStorage with `StorageAdapter('browser', workspaceMode)`. `DEFAULT_BOOKMARKS` constant for initial state; async load from `storage.get('bookmarks')`; all bookmark mutations use `storage.set('bookmarks', ...)`.
- **3.2.4 Settings** ✅ — Already persisted via os-context.tsx (wallpaper, themeColor, fontFamily, screenShader → idb-keyval `anichisom_os_desktop` + `/api/workspaces/sync`). No additional wiring needed.
- **3.2.5 Assistant chat** ✅ — New persistence added with `StorageAdapter('assistant', workspaceMode)`. `isLoaded` state guards UI render until storage loads. Auto-save effect persists `chat_history` on every message change. Loading guard shows "Loading Assistant..." until ready.
- **3.2.6 Code Editor metadata** ✅ — Already using `Storage` static facade (`Storage.getDoc/setDoc('codes', roomId, workspaceMode)`). Functionally equivalent to StorageAdapter, no change needed.
- **3.2.7 Productivity Suite doc metadata** ✅ — Already using `Storage` static facade (`Storage.getDoc/setDoc/deleteDoc('meta', ...)` + `Storage.getDoc/setDoc/deleteDoc('docs', ...)`). Legacy `docs` collection keys are stale (live content in Yjs). No change needed.
- **Other 4 core apps (Terminal, Files, Hardware Monitor, App Store)** — Read-only or ephemeral state; no persistence needed.
**Status:** ✅ COMPLETE

### 3.3 Browser back/forward history & bookmarks
**File:** `components/apps/browser.tsx`, `components/apps/mini-browser.tsx`
**Problem:** Standalone BrowserApp had no navigation history stack or back/forward buttons. MiniBrowser had history but hardcoded bookmarks. No bookmark add/remove UI in either.
**Fix:** Added per-tab history stack (`history[]` + `historyIndex`) to BrowserApp Tab type with back/forward/reload buttons in sidebar and top bar. Added `navigateToUrl` helper that pushes to history (replaces simple URL mutation). Added persistent bookmarks with localStorage (shared `BOOKMARKS_KEY`). Bookmark state loaded from localStorage with default seeds (DuckDuckGo, GitHub, Figma, Vercel). Star icon in address bar toggles bookmark — filled amber star when active URL is bookmarked, outline when not. Bookmark bar in MiniBrowser now shows dynamic user bookmarks with delete (Trash2 icon) on hover. BrowserApp sidebar shows bookmarks section with clickable items and delete buttons. Removed hardcoded bookmark buttons and pinToDesktop function from MiniBrowser.
**Status:** ✅

### 3.4 Undo/redo across all apps
**Problem:** No undo/redo in Moodboard, Campaign Lab, Office Suite (Slides, Sheets), Clothing Brand Pack.
**Fix:** Implement Yjs UndoManager for collaborative apps; custom undo stacks for solo apps.
- **Moodboard:** Y.UndoManager on yNodes + yComments, toolbar buttons, Ctrl+Z/Ctrl+Shift+Z
- **Campaign Lab:** Y.UndoManager on yPages in useCampaignState hook, header buttons, Ctrl+Z/Ctrl+Shift+Z
- **Slides:** Fabric.js JSON snapshot stack (undoStackRef/redoStackRef/previousStateRef), undo/redo buttons in toolbar, Ctrl+Z/Ctrl+Shift+Z
- **Sheets:** Data snapshot stack (undoStackRef/redoStackRef/previousDataRef), undo/redo buttons in sticky toolbar, Ctrl+Z/Ctrl+Shift+Z
- **Clothing Brand Pack Sketching:** Fabric.js JSON snapshot stack (undoStackRef/redoStackRef/previousStateRef), undo/redo buttons in sidebar, Ctrl+Z/Ctrl+Shift+Z
**Status:** ✅

### 3.5 Accessibility
**Problem:** No keyboard navigation, no screen reader support, no real reduced motion.
**Fix:** Add keyboard shortcuts for all dock/menu actions; ARIA labels; disable animations when prefers-reduced-motion is active.
- **ARIA labels:** Dock buttons, window controls (close/minimize/maximize), context menu, menu bar — all have aria-label and role attributes (toolbar, dialog, menu, menuitem, menubar, tooltip). Icons have aria-hidden="true".
- **Keyboard shortcuts:** Ctrl+W closes the active (highest-zIndex, non-minimized) window on the current workspace. Ctrl+M minimizes the active window. Escape closes the context menu.
- **Reduced-motion:** CSS `@media (prefers-reduced-motion: reduce)` in globals.css suppresses all animations (animate-in, fade-in, zoom-in, slide-in), transitions, and hover:scale transforms. Framer Motion window spring animation switches to `{ duration: 0 }` via `useReducedMotion()`, and initial animation skipped.
**Status:** ✅

---

## Progress Log

| Date | Fix | Status | Notes |
|------|-----|--------|-------|
| 2026-07-08 | 1.1 Office Suite toolbar | ✅ | Wired B/I/U, heading, font to TipTap commands; added Underline/TextStyle/FontFamily extensions |
| 2026-07-08 | 1.2 Moodboard comments | ✅ | Changed yComments from getArray to getMap; all mutations now write to Yjs for IndexedDB persistence |
| 2026-07-08 | 1.3 Code Editor StatusBar | ✅ | Added onDidChangeCursorPosition listener; StatusBar now shows real cursor position |
| 2026-07-08 | 1.4 Campaign Lab Yjs cleanup | ✅ | Refactored to useRef pattern; cleanup properly returned from useEffect; added activeRef guard |
| 2026-07-08 | 1.5 Object URL leak in Files | ✅ | Added objectUrlsRef Set + revokeObjectUrls() in file-manager; FS.revokeUrl() utility in lib/fs.ts |
| 2026-07-08 | 2.1 WebRTC in Calls app | ✅ | Created useWebRTC hook with simple-peer + Firestore signaling; real remote video; P2P status indicators |
| 2026-07-08 | 2.2 Proxy endpoint for Browser | ✅ | Rewrote proxy: URL rewriting in HTML/CSS, proxy all content types, POST support, frame-busting break; removed blocked-domain overlay |
| 2026-07-08 | 2.3 Export to Office Suite | ✅ | Added Download button in toolbar; Word→HTML, Sheets→CSV, Slides→PNG (2x); parent refs passed to child editors for export access |
| 2026-07-08 | 2.4 Campaign Lab block types | ✅ | Added TableBlock (editable grid, add/delete rows/cols), CodeBlock (language selector + copy), toggle children, callout icon cycling, gallery view in DatabaseView; slash commands initialize default data |
| 2026-07-08 | 2.5 Office Suite document CRUD | ✅ | Collapsible sidebar with create/rename/duplicate/delete; DocMeta index in Storage; projectId as state for doc switching; editable title bar |
| 2026-07-08 | 3.3 Browser history & bookmarks | ✅ | BrowserApp: history stack + back/forward/reload buttons; MiniBrowser & BrowserApp: persistent bookmarks (localStorage), star toggle, dynamic bookmark bar with delete; removed hardcoded bookmarks and pinToDesktop |
| 2026-07-08 | 3.4.1 Moodboard UndoManager | ✅ | Y.UndoManager on yNodes + yComments; stack event listeners for canUndo/canRedo; toolbar buttons with disabled state; Ctrl+Z/Ctrl+Shift+Z shortcuts |
| 2026-07-08 | 3.4.2 Campaign Lab UndoManager | ✅ | Y.UndoManager on yPages in useCampaignState hook; undoManagerRef + window global; stack event listeners; header toolbar buttons; Ctrl+Z/Ctrl+Shift+Z on main div |
| 2026-07-08 | 3.4.3 Slides undo/redo | ✅ | Fabric.js JSON snapshot stack (undoStackRef/redoStackRef/previousStateRef); handleSlidesUndo/handleSlidesRedo with isSyncingRef guard; toolbar buttons + Ctrl+Z/Ctrl+Shift+Z |
| 2026-07-08 | 3.4.4 Sheets undo/redo | ✅ | Data snapshot stack (undoStackRef/redoStackRef/previousDataRef); push on handleChange, pop on undo/redo; sticky toolbar buttons + Ctrl+Z/Ctrl+Shift+Z |
| 2026-07-08 | 3.4.5 Clothing Brand Pack undo/redo | ✅ | Fabric.js JSON snapshot stack in SketchingTab; path:created + object:modified listeners push to undo; sidebar buttons + Ctrl+Z/Ctrl+Shift+Z |
| 2026-07-09 | 3.5.1 ARIA labels & roles | ✅ | Dock nav (role=toolbar), window frame (role=dialog), context menu (role=menu+menuitem), menu bar (role=menubar+menuitem), tooltips (role=tooltip); aria-label on all buttons; aria-hidden on icons |
| 2026-07-09 | 3.5.2 Keyboard shortcuts | ✅ | Ctrl+W closes active window, Ctrl+M minimizes active window, Escape closes context menu; action handlers in handleKeyDown with windows/activeWorkspace/closeWindow/minimizeWindow deps |
| 2026-07-09 | 3.5.3 Reduced-motion | ✅ | CSS @media (prefers-reduced-motion: reduce) suppresses animations/transitions/hover:scale; Framer Motion useReducedMotion() skips spring and initial animation in window-frame.tsx |
| 2026-07-09 | 3.1 Real-time collaboration | ✅ COMPLETE | Shared useCollaborativeDoc hook; Office Suite/Code Editor/Clothing Brand Pack/Media Player Yjs wiring; Campaign Lab migrated (useCampaignState.ts deleted); Moodboard migrated (WebrtcProvider→WebsocketProvider, cleanup/Y.Doc/yundo leaks fixed) |
| 2026-07-09 | 3.2 Cloud persistence | ✅ COMPLETE | AI Gateway/Asset Pipeline/Browser/Assistant → StorageAdapter (replaced idb-keyval imports + localStorage); Settings/Code Editor/Productivity Suite already persisted via os-context or Storage facade; 4 read-only apps need no persistence |
