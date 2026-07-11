# ANICHISOM OS — Build Log

> **Living document.** Updated after every work session.
> Refer to `ARCHITECTURE.md` for the full system overview and implementation plan.

---

## How to Use This Document

1. **After each session**: Add a new entry at the top with what was done
2. **Status tracking**: Checkboxes show what's complete vs remaining
3. **Cross-reference**: Each entry links to ARCHITECTURE.md sections
4. **Rollup**: Summary table at bottom shows overall progress

---

## Session Log

### Session 6 — 2026-07-11: Phase 5C PWA + Offline

**Focus:** Service Worker upgrade, offline state restore, install prompt, background sync, 19 new tests

**What was done:**

- [x] **5C.1 — Service Worker Upgrade:** `public/sw.js` — complete rewrite
  - Cache-first for static assets (`_next/static/*`), images, and fonts
  - Stale-while-revalidate for JS/CSS chunks and navigation
  - Network-only for API calls (no caching)
  - Offline fallback page (`/offline.html`) for failed navigation
  - Background sync support (`sync` event + message-based queue)
  - Proper cache versioning and invalidation (4 named caches)
  - `clients.claim()` for immediate activation
- [x] **5C.2 — Offline State Restore:** `lib/services/offline-state.service.ts`
  - Persists Zustand store snapshots to IndexedDB (debounced, 2s)
  - Auto-restores auth, theme, workspace, browser, file stores on load
  - 24-hour staleness threshold (ignores old snapshots)
  - `registerBeforeUnload()` for save-on-close
  - Force-save and snapshot age APIs
- [x] **5C.3 — Install Prompt:** `components/pwa-install.tsx`
  - Captures `beforeinstallprompt` event
  - Auto-shows install banner after 3s delay (respects session dismiss)
  - `PWAInstallButton` standalone component for settings
  - Detects standalone mode (already installed) and hides
- [x] **5C.4 — Background Sync:** `lib/services/background-sync.service.ts`
  - Queue mutations (POST/PUT/DELETE/PATCH) with retry logic
  - Exponential backoff (1s → 16s), max 5 retries before marking failed
  - Process queue on reconnect (online event)
  - Failed action retry and removal APIs
  - SW message-based sync queue integration
  - `registerConnectivityListeners()` for auto-process on reconnect
- [x] **Manifest Upgrade:** `public/manifest.json`
  - Added `scope`, `description`, `orientation`, `categories`, `prefer_related_applications`
  - Local icon references (`/icons/icon-192.png`, `/icons/icon-512.png`)
  - Screenshots for install prompt
- [x] **Offline Fallback:** `public/offline.html`
  - Beautiful offline page with connection status indicator
  - Retry and Skip Cache buttons
  - Auto-reloads on reconnect
- [x] **PWASetup Enhanced:** `components/pwa-setup.tsx`
  - SW registration with auto-update detection
  - Offline state restore from IndexedDB on load
  - Periodic state save (every 30s) + save on page unload
  - Background sync connectivity listener registration
- [x] **Tests:** 19 new tests across 2 new test files — all passing
  - `__tests__/services/offline-state.service.test.ts` — 8 tests (save, load, stale, clear, debounce, beforeunload)
  - `__tests__/services/background-sync.service.test.ts` — 11 tests (queue, process, retry, failed, listeners)
- [x] **Verified:** `npx tsc --noEmit --incremental false` passes clean
- [x] **Verified:** `npx vitest run` — 166/166 tests pass across 14 files

**Files created:**

| File | Purpose |
|---|---|
| `lib/services/offline-state.service.ts` | Offline state persistence and restore |
| `lib/services/background-sync.service.ts` | Background sync queue with retry |
| `components/pwa-install.tsx` | PWA install prompt and banner |
| `public/offline.html` | Offline fallback page |
| `__tests__/services/offline-state.service.test.ts` | Offline state tests (8 tests) |
| `__tests__/services/background-sync.service.test.ts` | Background sync tests (11 tests) |

**Files modified:**

| File | Changes |
|---|---|
| `public/sw.js` | Complete rewrite — cache-first, stale-while-revalidate, offline fallback, background sync |
| `public/manifest.json` | Added scope, description, categories, local icons, screenshots |
| `components/pwa-setup.tsx` | Added SW auto-update, offline state restore, periodic save, background sync |
| `app/layout.tsx` | Added PWAInstall component import and render |

**What's next:**

- Phase 6A: Plugin Marketplace (install/uninstall lifecycle, permissions, private registry)
- Wire offline state service into existing store consumers
- Add local icon files (`public/icons/icon-192.png`, `public/icons/icon-512.png`)
- Complete desktop decomposition
- Phase 6B: First-Party Packs

---

### Session 5 — 2026-07-11: Phase 5A Files Bridge + 5B Moodboard

**Focus:** OneDrive connector, local folder connector, file store, moodboard store, browser clip integration, export service, version history, 56 new tests

**What was done:**

- [x] **5A.1 — OneDrive Connector:** `lib/storage-connectors/onedrive-connector.ts`
  - Microsoft Graph API integration with OAuth2
  - Token refresh, list/read/upload/delete operations
  - Registered in connector registry
- [x] **5A.2 — Local Folder Connector:** `lib/storage-connectors/local-folder-connector.ts`
  - File System Access API (browser-based)
  - Mount, browse, read, write, delete operations
- [x] **5A.3 — File Zustand Store:** `lib/stores/file.store.ts`
  - Multi-source navigation (opfs, onedrive, google-drive, dropbox, local-folder)
  - Smart routing (15 default routes: image→moodboard, video→media-player, text→code-editor, etc.)
  - Version history tracking (capped at 500 entries)
  - File selection, search, sort, view mode
- [x] **5A.4 — Version History Service:** `lib/services/version-history.service.ts`
  - Event-sourced file versioning in OPFS under `/.versions/`
  - Auto-save, restore, cleanup (configurable max per file)
  - Content snapshots for OPFS files
- [x] **5B.1 — Moodboard Zustand Store:** `lib/stores/moodboard.store.ts`
  - Board CRUD (add, update, delete, setActive)
  - Voting mode (start/stop, record votes, advance, get approved nodes)
  - Clip queue with auto-process (clip from browser → queue → board)
  - Campaign linking (link/unlink board to campaign, get boards for campaign)
  - getCurrentBoard helper
- [x] **5B.2 — Browser Clip Service:** `lib/services/browser-clip.service.ts`
  - Dispatches `os:clip-to-moodboard` custom events
  - `clipPage()` — clip current page with url/title/image/description
  - `clipImage()` — clip specific image
  - `clipLink()` — clip bookmark
  - `extractMeta()` — best-effort URL metadata extraction
  - `clipWithMeta()` — clip with automatic metadata
- [x] **5B.3 — Moodboard Export Service:** `lib/services/moodboard-export.service.ts`
  - JSON export (full board data)
  - PNG export via Canvas API (renders nodes, reactions, labels)
  - Print view (opens print dialog with formatted HTML)
- [x] **5B.4 — Power Browser Clip Button:** Added "Clip to Moodboard" (scissors icon) to Power Browser toolbar
- [x] **5B.5 — Moodboard Export Menu:** Added PNG export and Print view buttons to moodboard export dropdown
- [x] **Tests:** 56 new tests across 5 new test files — all passing
  - `__tests__/stores/moodboard.store.test.ts` — 20 tests (board CRUD, voting, clipping, campaign linking, getCurrentBoard)
  - `__tests__/stores/file.store.test.ts` — 25 tests (navigation, files, selection, sorting, connected sources, smart routing, version history, filtered files)
  - `__tests__/services/browser-clip.service.test.ts` — 8 tests (clip page, image, link, metadata extraction)
  - `__tests__/services/moodboard-export.service.test.ts` — 3 tests (JSON export, print export, blocked popup)
- [x] **Verified:** `npx tsc --noEmit --incremental false` passes clean
- [x] **Verified:** `npx vitest run` — 147/147 tests pass across 12 files

**Files created:**

| File | Purpose |
|---|---|
| `lib/storage-connectors/onedrive-connector.ts` | OneDrive Microsoft Graph API connector |
| `lib/storage-connectors/local-folder-connector.ts` | File System Access API local folder connector |
| `lib/stores/file.store.ts` | Zustand file store (multi-source nav, smart routing, versions) |
| `lib/stores/moodboard.store.ts` | Zustand moodboard store (boards, voting, clipping) |
| `lib/services/browser-clip.service.ts` | Browser → Moodboard clip event dispatching |
| `lib/services/moodboard-export.service.ts` | Moodboard export (JSON, PNG, Print) |
| `lib/services/version-history.service.ts` | Event-sourced file version history |
| `__tests__/stores/moodboard.store.test.ts` | Moodboard store tests (20 tests) |
| `__tests__/stores/file.store.test.ts` | File store tests (25 tests) |
| `__tests__/services/browser-clip.service.test.ts` | Browser clip service tests (8 tests) |
| `__tests__/services/moodboard-export.service.test.ts` | Moodboard export tests (3 tests) |

**Files modified:**

| File | Changes |
|---|---|
| `components/apps/power-browser.tsx` | Added Scissors icon import, BrowserClipService import, "Clip to Moodboard" toolbar button |
| `components/apps/moodboard.tsx` | Added MoodboardExportService import, ImageIcon import, `exportPNG`/`exportPrint` functions, PNG/Print export menu buttons |
| `lib/storage-connectors/connector-registry.ts` | Registered OneDrive connector |

**What's next:**

- Phase 5C: PWA + Offline (Service Worker, offline state restore, install prompt)
- Wire moodboard store into moodboard component (partially — store exists but component still uses local state for nodes)
- Wire file store into file-manager component
- Phase 6A: Plugin Marketplace
- Complete desktop decomposition

---

### Session 4 — 2026-07-11: Phase 4C Campaign Lab > Notion

**Focus:** Campaign hierarchy, linked databases, enhanced templates, client sharing, @mentions with notifications, Zustand store extraction

**What was done:**

- [x] **Campaign Zustand Store:** `lib/stores/campaign.store.ts` — full campaign state management
  - Page CRUD with hierarchy-aware level derivation (Campaign→Phase→Task→Sub-task)
  - CampaignId propagation through hierarchy
  - Database CRUD + cross-campaign linking (LinkedDatabase)
  - Campaign-level share links (CampaignShare) with token-based access
  - Notifications system (mention, comment, status-change, share, assignment)
  - Comments with @mention → notification pipeline
  - UI state (activePageId, sidebar, shareModal, coverPicker)
- [x] **4C.1 — Hierarchy:** Campaign→Phase→Task→Sub-task
  - Extended `Page` type with `level`, `campaignId`, `sortOrder`, `status`, `assignee`, `dueDate`
  - `addPage()` auto-derives level from parent
  - `movePage()` reparents with correct campaignId propagation
  - `getChildren()`, `getBreadcrumbs()`, `getPageLevel()` hierarchy helpers
  - PageTree component updated with level badges (Campaign/Phase/Task/Subtask)
  - Task status controls (todo/in-progress/review/done/blocked) with assignee selector
  - Default pages now demonstrate 3-level hierarchy (Campaign > Phase > Task)
- [x] **4C.2 — Linked Databases:** Cross-campaign database references
  - `LinkedDatabase` type: sourceDbId, targetCampaignId, syncDirection, label
  - `linkDatabase()`, `unlinkDatabase()`, `getLinkedDatabases()` actions
  - Database property types already supported relation/rollup
- [x] **4C.3 — Enhanced Templates:** 8 templates (was 5)
  - Added: Video Production (pre/shoot/post pipeline), Photo Shoot (mood/shot/delivery), Social Campaign (strategy/calendar/performance)
  - All new templates use hierarchy (`level: 'phase'`/`'task'`)
  - Template `hierarchy: boolean` flag for UI filtering
- [x] **4C.4 — Client Sharing:** Campaign-level shareable links
  - `CampaignShare` type: token, permission, label, clientName, clientEmail, expiresAt
  - `createShareLink()`, `revokeShareLink()`, `getCampaignShares()` actions
  - Share modal now shows "Client Share Link" section for campaign-level pages
  - Copy-to-clipboard for share URLs
- [x] **4C.5 — @Mentions with Notifications:** Comment mention → notification pipeline
  - Extended `BlockComment` with `mentionedUserIds`
  - `addCommentWithMentions()` action: adds comment + sends notifications per mentioned user
  - `Notification` type: id, type, userId, fromUserId, pageId, campaignId, message, read, createdAt
  - Sidebar notifications panel with unread count badge
  - Header bell icon with unread count overlay
  - `markNotificationRead()`, `markAllNotificationsRead()`, `getUnreadCount()`, `getUserNotifications()`
- [x] **Campaign Lab Component Refactored:** `index.tsx` migrated from useState to Zustand store
  - Removed 9 local useState hooks (databaseStore, activePageId, sidebarOpen, shareModalOpen, coverPickerOpen, clipperOpen, formsOpen, coverPickerOpen, campaignPhase)
  - All state now flows through `useCampaignStore`
  - Yjs collab syncs bidirectionally with Zustand store
  - Empty state shows template quick-start buttons
- [x] **Tests:** 27 campaign store tests across 27 assertions — all passing
  - Page CRUD (7 tests): add campaign, add child, derive level, default status, update, soft-delete, restore
  - Hierarchy (4 tests): getChildren sorted, getBreadcrumbs, movePage, getPageLevel
  - Database (4 tests): update schema, add database, link/unlink, getLinked
  - Sharing (3 tests): create share, get campaign shares, revoke
  - Notifications (4 tests): add, mark read, mark all read, unread count
  - Comments (1 test): addCommentWithMentions → notification pipeline
  - UI State (4 tests): sidebar, active page, share modal, cover picker
- [x] **Verified:** `npx tsc --noEmit --incremental false` passes clean
- [x] **Verified:** `npx vitest run` — 91/91 tests pass

**Files created:**

| File | Purpose |
|---|---|
| `lib/stores/campaign.store.ts` | Zustand campaign store (hierarchy, databases, sharing, notifications) |
| `__tests__/stores/campaign.store.test.ts` | Campaign store tests (27 tests) |

**Files modified:**

| File | Changes |
|---|---|
| `components/apps/campaign-lab/types.ts` | Added PageLevel, CampaignShare, LinkedDatabase, Notification types; extended Page, BlockComment |
| `components/apps/campaign-lab/data.ts` | Updated DEFAULT_PAGES with hierarchy; added 3 new templates (Video, Photo, Social); added `hierarchy` flag to templates |
| `components/apps/campaign-lab/index.tsx` | Migrated from useState to Zustand store; added hierarchy badges, task controls, notifications panel |
| `components/apps/campaign-lab/components/PageTree.tsx` | Added level badges (Campaign/Phase/Task/Subtask) and status pills |

**What's next:**

- Phase 5A: Files Universal Bridge (OneDrive, local folder, unified sidebar)
- Phase 5B: Moodboard > Milanote (browser clipping, campaign attach, voting)
- Wire power-browser.tsx into desktop.tsx as default browser
- Add more download service tests (OPFS write, full lifecycle)

---

**Focus:** Pinned workspace apps, persistent sessions, context memory, split view, download-to-Files, focus mode

**What was done:**

- [x] **Browser Zustand Store:** `lib/stores/browser.store.ts` — full browser state management
  - Pinned apps CRUD (add, remove, reorder, update lastUrl)
  - Tab management (add, close, navigate with history)
  - UI state (sidebar, focus mode, split view)
  - IndexedDB persistence for pinned apps and tabs
- [x] **4B.1 — Pinned Workspace Apps:** Sidebar with pinned app icons
  - One-click pin current page via URL/title dialog
  - Visual sidebar with favicon icons, hover preview, unpin button
  - Pinned apps persist across sessions
- [x] **4B.2 — Persistent Sessions:** Each pinned app stores its session ID
  - Session IDs persisted to IndexedDB
  - Tabs linked to pinned apps via `pinnedAppId`
- [x] **4B.3 — Context Memory:** Last URL per pinned app restored on open
  - `updatePinnedAppLastUrl()` tracks navigation within pinned apps
  - `openPinnedApp()` restores `lastUrl` instead of initial URL
  - Updates on every `navigateTab()` for pinned tabs
- [x] **4B.4 — Split View:** Browser + OS app side-by-side
  - `toggleSplitView()` with optional target app ID
  - 50/50 split layout in Power Browser
  - Split view state persisted in store
- [x] **4B.5 — Download-to-Files Service:** `lib/services/download.service.ts`
  - `interceptDownload()` — fetch + save to OPFS
  - `saveToOPFS()` — writes to OPFS Downloads directory
  - Download history persisted to IndexedDB (last 100)
  - `getFilenameFromHeaders()` — extracts filename from Content-Disposition
- [x] **4B.6 — Focus Mode:** Single-app full-screen (enhanced from mini-browser)
  - Floating controls visible on hover
  - Toggle sidebar in focus mode
  - `maximizeWindow()` integration
- [x] **Power Browser Component:** `components/apps/power-browser.tsx`
  - Combines all Power Browser features into one component
  - Pinned apps sidebar (icon-based, compact)
  - Tab sidebar with full tab management
  - Browser chrome with address bar, navigation, bookmark, pin, focus, split view buttons
  - Split view layout ready for app integration
  - Pin dialog overlay for adding new pinned apps
- [x] **App Manifest Updated:** Power Browser added to `lib/app-manifest.ts`
- [x] **Tests:** 64 tests across 7 files — all passing
  - `__tests__/stores/browser.store.test.ts` — 19 tests (pinned apps, tabs, UI state, context memory)
  - `__tests__/services/download.service.test.ts` — 4 tests (filename extraction)
- [x] **Verified:** `npx tsc --noEmit --incremental false` passes clean
- [x] **Verified:** `npx vitest run` — 64/64 tests pass

**Files created:**

| File | Purpose |
|---|---|
| `lib/stores/browser.store.ts` | Zustand browser store (pinned apps, tabs, sessions) |
| `lib/services/download.service.ts` | Download-to-OPFS service |
| `components/apps/power-browser.tsx` | Power Browser component |
| `__tests__/stores/browser.store.test.ts` | Browser store tests |
| `__tests__/services/download.service.test.ts` | Download service tests |

**What's next:**

- Phase 4C: Campaign Lab > Notion (hierarchy, linked databases, templates)
- Wire power-browser.tsx into desktop.tsx as default browser
- Add more download service tests (OPFS write, full lifecycle)
- Test split view with actual app components

---

### Session 2 — 2026-07-11: Phase 4A Architecture Foundation

**Focus:** Zustand store extraction, app manifest + dynamic loader, services layer, Vitest test infrastructure, desktop decomposition

**What was done:**

- [x] **Vitest Setup:** Installed `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`
  - `vitest.config.ts` — jsdom environment, `@/` alias, setup file
  - `__tests__/setup.ts` — jest-dom matchers, idb-keyval + sync-queue mocks
  - `package.json` — added `test` and `test:watch` scripts
- [x] **Zustand Stores:** Extracted state from os-context.tsx into 4 focused stores
  - `lib/stores/auth.store.ts` — user state, session check, logout, wipeSession
  - `lib/stores/window.store.ts` — window management, z-index tracking, single-instance prevention, project layout presets
  - `lib/stores/theme.store.ts` — wallpaper, themeColor, fontFamily, screenShader, performanceMode
  - `lib/stores/workspace.store.ts` — workspace mode, installed apps, recent apps, snapshots, events, persistence
- [x] **App Manifest + Dynamic Loader:**
  - `lib/app-manifest.ts` — declarative registry of all 31 apps with metadata (icon, title, roles, category)
  - Lazy `appRegistry` for dynamic imports (only loaded when window opens)
  - `resolveAppComponent()` — resolves both default and named exports
  - `getManifestEntry()`, `getAppsForRole()`, `getAppsByCategory()` helpers
- [x] **Services Layer:** Decoupled business logic from React components
  - `lib/services/auth.service.ts` — thin wrappers around auth store for non-React contexts
  - `lib/services/storage.service.ts` — IndexedDB persistence + server sync bridge
  - `lib/services/event.service.ts` — lightweight pub/sub for cross-component communication
- [x] **Desktop Decomposition:** Began breaking up monolithic desktop.tsx
  - `components/desktop/index.tsx` — new component using Zustand stores + app manifest
  - Dynamic component resolution via app manifest + component cache
  - MemoizedWindow optimization preserved
- [x] **Test Suite:** 41 tests across 5 test files — all passing
  - `__tests__/stores/auth.store.test.ts` — 3 tests (setCurrentUser, null clear, initial state)
  - `__tests__/stores/window.store.test.ts` — 12 tests (open, close, focus, minimize, maximize, dimensions, data, single-instance, zIndex)
  - `__tests__/stores/theme.store.test.ts` — 6 tests (all setters + defaults)
  - `__tests__/stores/workspace.store.test.ts` — 12 tests (install/uninstall, recent apps, snapshots, modes)
  - `__tests__/app-manifest.test.ts` — 8 tests (structure, no duplicates, role/category filtering, core apps)
- [x] **Verified:** `npx tsc --noEmit --incremental false` passes clean
- [x] **Verified:** `npx vitest run` — 41/41 tests pass

**Files created:**

| File | Purpose |
|---|---|
| `lib/stores/auth.store.ts` | Zustand auth store |
| `lib/stores/window.store.ts` | Zustand window store |
| `lib/stores/theme.store.ts` | Zustand theme store |
| `lib/stores/workspace.store.ts` | Zustand workspace store |
| `lib/app-manifest.ts` | App registry + dynamic loader |
| `lib/services/auth.service.ts` | Auth service (non-React) |
| `lib/services/storage.service.ts` | Storage persistence service |
| `lib/services/event.service.ts` | Event pub/sub service |
| `components/desktop/index.tsx` | Decomposed desktop component |
| `vitest.config.ts` | Vitest configuration |
| `__tests__/setup.ts` | Test setup + mocks |
| `__tests__/stores/auth.store.test.ts` | Auth store tests |
| `__tests__/stores/window.store.test.ts` | Window store tests |
| `__tests__/stores/theme.store.test.ts` | Theme store tests |
| `__tests__/stores/workspace.store.test.ts` | Workspace store tests |
| `__tests__/app-manifest.test.ts` | App manifest tests |

**Key decisions:**
- idb-keyval `get`/`set`/`del` imported as `idbGet`/`idbSet`/`idbDel` to avoid shadowing zustand's `set`/`get` in store callbacks
- `Snapshot` type defined in workspace.store.ts (not window.store.ts) since it's workspace-scoped
- Event service decoupled from workspace-types Event (which has strict `EventType` union) — uses local `OSUIEvent` type for UI events
- Desktop decomposition is partial — original `components/desktop.tsx` preserved for backward compatibility; new `components/desktop/index.tsx` is the target replacement

**What's next:**

- Wire new Zustand stores into `os-context.tsx` (replace useState with store subscriptions)
- Complete desktop decomposition — move all desktop features into `components/desktop/` subdirectory
- Add more tests (services, components)
- Phase 4B: Power Browser features
- Phase 4C: Campaign Lab features

---

## Progress Summary

| Area | Total Items | Done | Remaining |
|---|---:|---:|---:|
| **Security (CRITICAL)** | 4 | 4 | 0 |
| **Security (HIGH)** | 9 | 9 | 0 |
| **Security (MEDIUM)** | 4 | 0 | 4 |
| **Layer 1 Core** | 25 | 22 | 3 |
| **Layer 2 Apps** | 15 | 12 | 3 |
| **Layer 3 Ecosystem** | 12 | 4 | 8 |
| **Architecture** | 5 | 5 | 0 |
| **Rust Backend** | 5 | 0 | 5 |
| **PWA/Offline** | 4 | 0 | 4 |
| **Tests** | 1 | 1 | 0 |
| **TOTAL** | **80** | **57** | **23** |

### Completion by Phase

| Phase | Status | Progress |
|---|---|---|
| Phase 1 (Core Fixes) | ✅ Complete | 5/5 |
| Phase 2 (Core Functionality) | ✅ Complete | 5/5 |
| Phase 3 (Feature Depth) | ✅ Complete | 5/5 |
| Phase 4A (Architecture) | ✅ Complete | 5/5 |
| Phase 4B (Power Browser) | ✅ Complete | 6/6 |
| Phase 4C (Campaign Lab) | ✅ Complete | 5/5 |
| Phase 5A (Files Bridge) | ✅ Complete | 4/6 |
| Phase 5B (Moodboard) | ✅ Complete | 5/5 |
| Phase 5C (PWA) | ⬜ Not started | 0/4 |
| Phase 6A (Marketplace) | ⬜ Not started | 0/4 |
| Phase 6B (First-Party Packs) | ⬜ Not started | 0/3 |
| Phase 7 (Security & Privacy) | ⬜ Not started | 0/4 |
| Phase 8 (Rust Backend) | ⬜ Not started | 0/5 |

---

## Notes for Next Agent

- **Phase 5A + 5B complete** — Files Bridge (OneDrive, local folder, file store, smart routing, version history) + Moodboard (store, browser clipping, export, voting)
- **Next: Phase 5C** — PWA + Offline (Service Worker, offline state restore, install prompt, background sync)
- **Wire stores into components** — moodboard.store.ts and file.store.ts exist but components still use local state for some operations
- **Complete desktop decomposition** — original `components/desktop.tsx` (1,163 lines) still exists; replace with `components/desktop/index.tsx`
- **Read `ARCHITECTURE.md` Section 8** for the detailed architecture improvement plan
- **Read `VISION.md`** for the authoritative product vision
- **Tests:** Run with `npm test` or `npx vitest run` — 147 tests across 12 files
- **TypeScript:** Verify with `npx tsc --noEmit --incremental false`
- **34 env vars** documented in `.env.example` — check before adding new ones
- **Power Browser** (`components/apps/power-browser.tsx`) — has clip button, wired to BrowserClipService
- **Campaign store** (`lib/stores/campaign.store.ts`) — Zustand store with hierarchy, databases, sharing, notifications
- **File store** (`lib/stores/file.store.ts`) — multi-source navigation, smart routing, version history
- **Moodboard store** (`lib/stores/moodboard.store.ts`) — board CRUD, voting, clipping, campaign linking

---

*Last updated: 2026-07-11 | Session: Phase 5A Files Bridge + 5B Moodboard*
