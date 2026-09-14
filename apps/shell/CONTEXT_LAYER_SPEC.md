# ContinuaOS — Context Layer Specification

**Version:** 1.0  
**Date:** July 2026  
**Status:** Authoritative — all renderers, sync, and restore implementations must conform to this spec.

---

## 1. Purpose

The Context Layer is the headless API that captures, serializes, restores, and syncs a user's entire workspace state. It is the foundation for:

- **Session restore** — "Welcome back. Restoring your workspace..."
- **Cross-device sync** — Open your laptop, everything is where you left it
- **Context export/import** — Package your workspace as a portable JSON file
- **Time machine** — Roll back to any previous workspace snapshot
- **Performance measurement** — Know exactly how long restore takes

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│                  RENDERERS                       │
│  Desktop │ Mobile │ CLI │ API │ Plugin Sandbox   │
└────────────────────┬────────────────────────────┘
                     │ read/write
┌────────────────────▼────────────────────────────┐
│              CONTEXT LAYER API                   │
│  getContext() │ setContext() │ subscribe()       │
│  exportContext() │ importContext()               │
│  createSnapshot() │ restoreSnapshot()           │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│           STATE PERSISTENCE ENGINE              │
│  IndexedDB (local) │ Supabase (cloud) │ Both    │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              SYNC PROTOCOL                       │
│  Last-write-wins │ Version vectors │ Conflict   │
└─────────────────────────────────────────────────┘
```

---

## 3. Session Context Schema

A **Session Context** is the complete serializable snapshot of a user's workspace. It is a single JSON object.

```typescript
interface SessionContext {
  /** Schema version for forward-compatible migrations */
  version: 1;
  
  /** ISO 8601 timestamp of when this context was created */
  createdAt: string;
  
  /** ISO 8601 timestamp of last modification */
  updatedAt: string;
  
  /** User identity */
  identity: ContextIdentity;
  
  /** Window manager state */
  windows: ContextWindows;
  
  /** Workspace configuration */
  workspace: ContextWorkspace;
  
  /** Theme and visual preferences */
  theme: ContextTheme;
  
  /** File system state */
  filesystem: ContextFilesystem;
  
  /** Application-specific state */
  apps: ContextApps;
  
  /** Browser/app launcher state */
  browser: ContextBrowser;
  
  /** Notification history */
  notifications: ContextNotifications;
  
  /** System-level preferences */
  system: ContextSystem;
  
  /** Clipboard history */
  clipboard: ContextClipboard;
  
  /** Activity log */
  activity: ContextActivity;
}
```

### 3.1 Identity

```typescript
interface ContextIdentity {
  /** Supabase user ID (if authenticated) */
  userId: string | null;
  
  /** Display name */
  displayName: string;
  
  /** User role (filmmaker, developer, etc.) */
  role: string;
  
  /** Installed app IDs */
  installedApps: string[];
  
  /** Onboarding completed */
  onboardingComplete: boolean;
}
```

### 3.2 Windows

```typescript
interface ContextWindows {
  /** All open windows */
  instances: WindowInstance[];
  
  /** Active/focused window ID */
  activeId: string | null;
  
  /** Next z-index counter */
  nextZIndex: number;
}

interface WindowInstance {
  /** Unique window ID */
  id: string;
  
  /** App ID that this window is running */
  appId: string;
  
  /** Window title (user-editable) */
  title: string;
  
  /** Position */
  x: number;
  y: number;
  
  /** Dimensions */
  width: number;
  height: number;
  
  /** State flags */
  minimized: boolean;
  maximized: boolean;
  
  /** Z-index ordering */
  zIndex: number;
  
  /** Which workspace number (1-5) this window is on */
  workspaceNumber: number;
  
  /** App-specific data passed to the window */
  data: Record<string, unknown>;
  
  /** Scroll position within the window (if applicable) */
  scrollPosition?: { x: number; y: number };
}
```

### 3.3 Workspace

```typescript
interface ContextWorkspace {
  /** Current workspace number (1-5) */
  activeWorkspace: number;
  
  /** Named workspace configurations */
  named: NamedWorkspace[];
  
  /** Window snapshots (saved layouts) */
  snapshots: WorkspaceSnapshot[];
}

interface NamedWorkspace {
  id: string;
  name: string;
  workspaceNumber: number;
  windowIds: string[];
}

interface WorkspaceSnapshot {
  id: string;
  name: string;
  createdAt: string;
  windows: WindowInstance[];
}
```

### 3.4 Theme

```typescript
interface ContextTheme {
  /** Color mode */
  colorMode: 'light' | 'dark' | 'system';
  
  /** Wallpaper */
  wallpaper: {
    type: 'gradient' | 'image' | 'video' | 'solid';
    value: string;
    /** Parallax depth factor (0-1) */
    parallaxDepth: number;
  };
  
  /** Accent color (hex) */
  accentColor: string;
  
  /** Font family */
  fontFamily: string;
  
  /** Shader effect */
  shader: string | null;
  
  /** Visual effects toggles */
  glassmorphism: boolean;
  animationsEnabled: boolean;
  aeroSnap: boolean;
  
  /** Performance mode */
  performanceMode: 'light' | 'heavy';
  
  /** Audio */
  volume: number;
  muted: boolean;
  ambientSound: string | null;
}
```

### 3.5 Filesystem

```typescript
interface ContextFilesystem {
  /** Root directory path (OPFS) */
  root: string;
  
  /** Current open directory path */
  currentPath: string;
  
  /** Currently selected file (if any) */
  selectedFile: string | null;
  
  /** Connected cloud storage sources */
  connectedSources: CloudSource[];
  
  /** Recent files (most recent first, max 20) */
  recentFiles: RecentFile[];
}

interface CloudSource {
  provider: 'google-drive' | 'dropbox' | 'onedrive';
  connected: boolean;
  lastSync: string | null;
}

interface RecentFile {
  path: string;
  name: string;
  mimeType: string;
  lastOpened: string;
}
```

### 3.6 Apps

```typescript
interface ContextApps {
  /** App-specific persisted state */
  [appId: string]: Record<string, unknown>;
}

// Known app state shapes:
interface TerminalState {
  history: string[];
  currentPath: string;
}

interface BrowserState {
  pinnedApps: string[];
  tabs: BrowserTab[];
  bookmarks: BrowserBookmark[];
  searchEngine: string;
}

interface EditorState {
  openFiles: OpenFile[];
  activeFile: string | null;
  recentProjects: string[];
}

interface CampaignLabState {
  pages: CampaignPage[];
  activePageId: string | null;
}

interface DigitalJournalState {
  entries: JournalEntry[];
  lastMood: string | null;
}

interface MoodboardState {
  boards: Moodboard[];
  activeBoardId: string | null;
}
```

### 3.7 Browser (App Launcher)

```typescript
interface ContextBrowser {
  /** Pinned apps in dock */
  pinnedApps: string[];
  
  /** Browser tabs (for the built-in browser) */
  tabs: BrowserTab[];
  
  /** Bookmarks */
  bookmarks: BrowserBookmark[];
  
  /** Default search engine */
  searchEngine: 'google' | 'duckduckgo' | 'bing';
}

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  active: boolean;
}

interface BrowserBookmark {
  id: string;
  name: string;
  url: string;
  favicon: string | null;
}
```

### 3.8 Notifications

```typescript
interface ContextNotifications {
  /** All notifications (most recent first, max 100) */
  items: NotificationItem[];
  
  /** Unread count */
  unreadCount: number;
  
  /** Notification preferences */
  preferences: {
    sounds: boolean;
    desktop: boolean;
    badge: boolean;
  };
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  /** Which app generated this notification */
  sourceAppId: string | null;
}
```

### 3.9 System

```typescript
interface ContextSystem {
  /** Focus mode enabled */
  focusMode: boolean;
  
  /** Screenshot history (max 10) */
  screenshots: ScreenshotEntry[];
  
  /** Activity monitor events (max 200) */
  activityEvents: ActivityEvent[];
  
  /** Privacy settings per app */
  appPrivacy: Record<string, 'private' | 'shared' | 'restricted'>;
  
  /** Plugin states */
  pluginStates: Record<string, PluginState>;
}

interface ScreenshotEntry {
  id: string;
  path: string;
  takenAt: string;
  /** Region captured (if not full screen) */
  region?: { x: number; y: number; width: number; height: number };
}

interface ActivityEvent {
  id: string;
  type: 'file-save' | 'folder-create' | 'app-open' | 'app-close' | 'notification' | 'custom';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface PluginState {
  installed: boolean;
  enabled: boolean;
  version: string;
  permissions: Record<string, boolean>;
}
```

### 3.10 Clipboard

```typescript
interface ContextClipboard {
  /** Clipboard history (most recent first, max 50) */
  entries: ClipboardEntry[];
}

interface ClipboardEntry {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file';
  copiedAt: string;
}
```

### 3.11 Activity

```typescript
interface ContextActivity {
  /** All activity events (ring buffer, max 200) */
  events: ActivityEvent[];
}
```

---

## 4. Context Layer API

```typescript
interface ContextLayer {
  /** Get the current session context (full snapshot) */
  getContext(): Promise<SessionContext>;
  
  /** Get a specific domain of the context */
  getDomain<K extends keyof SessionContext>(domain: K): Promise<SessionContext[K]>;
  
  /** Update specific fields in the context (partial merge) */
  setContext(update: DeepPartial<SessionContext>): Promise<void>;
  
  /** Update a specific domain */
  setDomain<K extends keyof SessionContext>(
    domain: K, 
    update: DeepPartial<SessionContext[K]>
  ): Promise<void>;
  
  /** Subscribe to context changes */
  subscribe(
    listener: (context: SessionContext) => void,
    domains?: (keyof SessionContext)[]
  ): () => void;
  
  /** Export the full context as JSON */
  exportContext(): Promise<string>;
  
  /** Import a context from JSON (merges or replaces) */
  importContext(json: string, mode: 'merge' | 'replace'): Promise<void>;
  
  /** Create a named snapshot */
  createSnapshot(name: string): Promise<string>;
  
  /** Restore from a snapshot */
  restoreSnapshot(snapshotId: string): Promise<void>;
  
  /** Get all snapshots */
  getSnapshots(): Promise<WorkspaceSnapshot[]>;
  
  /** Delete a snapshot */
  deleteSnapshot(snapshotId: string): Promise<void>;
}
```

---

## 5. Persistence Strategy

### 5.1 Local-First (Private Mode)

| Domain | Storage | Key Pattern |
|--------|---------|-------------|
| identity | IDB | `continuaos_identity` |
| windows | IDB | `continuaos_windows` |
| workspace | IDB | `continuaos_workspace` |
| theme | IDB | `continuaos_theme` |
| filesystem | OPFS | `/continuaos/` root |
| apps.* | IDB | `continuaos_app_{appId}` |
| browser | IDB | `continuaos_browser` |
| notifications | IDB | `continuaos_notifications` |
| system | IDB | `continuaos_system` |
| clipboard | IDB | `continuaos_clipboard` |
| activity | IDB | `continuaos_activity` |

### 5.2 Cloud-Synced (Agency Mode)

In Agency mode, all IDB writes are mirrored to Supabase:

```typescript
interface ContextRecord {
  id: string;            // `${userId}:${domain}`
  user_id: string;
  domain: string;        // 'windows', 'theme', 'apps.terminal', etc.
  data: unknown;         // JSON-serialized domain data
  version: number;       // Monotonic version for conflict detection
  updated_at: string;    // ISO timestamp
  device_id: string;     // Unique per browser/device
}
```

### 5.3 Sync Protocol

1. **Local write** → IDB updated immediately
2. **Mirror to cloud** → Supabase UPSERT with version check
3. **Cloud change received** → Supabase Realtime subscription fires
4. **Conflict detection** → If `incoming.version > local.version`, apply incoming
5. **Last-write-wins** → Timestamp breaks ties; device_id for audit trail

---

## 6. Restore Flow

```
User opens ContinuaOS
        │
        ▼
┌──────────────────┐
│ 1. IDB hydrate   │  ← Fastest path (<50ms)
│    All stores     │
│    load from IDB  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. UI unblock     │  ← BootSplash visible
│    React render   │     Progress bar starts
│    begins         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. Window restore │  ← Windows created from
│    Create windows │     context.windows.instances
│    Set positions  │     Progress: 30%
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. App hydration  │  ← Each app reads its
│    Load app state │     context.apps[appId]
│    Render content │     Progress: 60%
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. FS restore     │  ← OPFS/IDB filesystem
│    Mount drives   │     ready
│    Cloud connect  │     Progress: 80%
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 6. Final sync     │  ← Cloud state check
│    Background     │     (non-blocking)
│    Ready!         │     Progress: 100%
└──────────────────┘
```

### 6.1 Performance Targets

| Phase | Target | Measurement |
|-------|--------|-------------|
| IDB hydrate | <50ms | `performance.mark('context:hydrate-start/end')` |
| Window restore | <200ms | `performance.mark('context:windows-start/end')` |
| App hydration | <300ms | `performance.mark('context:apps-start/end')` |
| Full restore | <500ms | `performance.mark('context:restore-start/end')` |
| Boot splash | <2s total | User-perceived (animation + restore) |

---

## 7. Export/Import Format

### 7.1 Export JSON

```json
{
  "continuaos_context": true,
  "version": 1,
  "exportedAt": "2026-07-18T12:00:00.000Z",
  "deviceName": "MacBook Pro",
  "context": { ...SessionContext }
}
```

### 7.2 Import Modes

- **Merge** — Deep merge imported context with current context. Arrays are appended, objects are merged, primitives are overwritten.
- **Replace** — Entire context replaced. Current state lost.

---

## 8. Migration Strategy

When the schema version changes:

```typescript
function migrateContext(
  raw: unknown, 
  fromVersion: number, 
  toVersion: number
): SessionContext {
  let ctx = raw;
  for (let v = fromVersion; v < toVersion; v++) {
    ctx = MIGRATIONS[v](ctx);
  }
  return ctx;
}

const MIGRATIONS: Record<number, (ctx: any) => any> = {
  0: (ctx) => ({
    ...ctx,
    version: 1,
    createdAt: ctx.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  // Future migrations go here
};
```

---

## 9. Implementation Checklist

### Phase 1: Schema + API Layer
- [ ] Define `SessionContext` TypeScript interface (this spec)
- [ ] Implement `ContextLayer` class with IDB backend
- [ ] Implement `getContext()`, `setContext()`, `setDomain()`
- [ ] Implement `subscribe()` with domain filtering
- [ ] Add `performance.mark()` instrumentation to all operations

### Phase 2: Store Migration
- [ ] Migrate all 55 persistence points to use Context Layer
- [ ] Each store writes through to Context Layer instead of direct IDB
- [ ] Backward compatibility: read old keys on first load, migrate, delete old keys

### Phase 3: Restore Flow
- [ ] Wire BootSplash to actual restore progress (not timer)
- [ ] Implement 6-phase restore sequence
- [ ] Add performance measurements at each phase
- [ ] Target: <500ms full restore

### Phase 4: Export/Import
- [ ] Implement `exportContext()` — full JSON export
- [ ] Implement `importContext()` — merge and replace modes
- [ ] Add UI in Settings for export/import

### Phase 5: Cross-Device Sync
- [ ] Implement `ContextRecord` Supabase table
- [ ] Mirror local writes to cloud
- [ ] Subscribe to cloud changes via Realtime
- [ ] Conflict resolution: version vectors + last-write-wins
- [ ] Device identification

### Phase 6: Time Machine
- [ ] Implement `createSnapshot()` — save named snapshots
- [ ] Implement `restoreSnapshot()` — rollback to any snapshot
- [ ] Automatic snapshots: hourly, on major changes
- [ ] Snapshot history UI

---

## 10. Naming Convention

All IDB keys, storage keys, and sync record IDs use the `continuaos_` prefix:

```
continuaos_context_{domain}    — Domain-level context records
continuaos_snapshot_{id}       — Named snapshots
continuaos_sync_{domain}       — Cloud sync state
continuaos_migration           — Migration tracking
```

---

## 11. Constraints

1. **Every context field must be JSON-serializable** — No functions, no circular references, no class instances
2. **No field exceeds 1MB** — Large data (files, images) reference paths, not content
3. **All timestamps are ISO 8601** — No Unix timestamps
4. **All IDs are UUIDs** — Generated via `crypto.randomUUID()`
5. **Version is monotonically increasing** — Never decremented
6. **Context is immutable in transit** — `getContext()` returns a deep clone
