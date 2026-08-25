# Continua Continuity Engine — Implementation Plan

## Product Thesis

> The machine can be temporary. Your workspace isn't.

Continua is a computing continuity layer that lets your identity, workspace, and work context move between physical machines. The OS shell is one interface. The continuity engine is the product.

## Current State (from audit)

| Area | Maturity | Key Gap |
|---|---|---|
| Auth | 85% | No RBAC enforcement on API routes |
| Device Trust | 40% | No device registry, trust levels, or revocation |
| Workspace Model | 70% | No cross-device workspace sync |
| Daemon | 60% | Window sensing is a stub |
| Context Processing | 80% | No real-time sync, no semantic search |
| App Restoration | 65% | No selective restore, no progress UI |
| Capability Detection | 30% | No feature matrix, no runtime detection |
| Schema | 55% | 9 incremental files, no single source of truth |

## Core Loop (what we're building toward)

```
1. USER WORKS on Machine A
2. DAEMON observes permitted context (apps, files, URLs, focus)
3. CONTEXT ENGINE processes raw events into workspace understanding
4. WORKSPACE STATE is synced to cloud
5. USER CHANGES to Machine B
6. USER AUTHENTICATES to Continua
7. DEVICE TRUST is established (trusted / temporary / phone-approved)
8. ENGINE checks Machine B capabilities
9. ENGINE restores available workspace context
10. USER CONTINUES where they left off
```

---

## Phase 1: Device Trust & Schema Consolidation
**Goal:** Every machine has an identity. The schema has a single source of truth.
**Duration:** ~1 week

### 1.1 Consolidate Schema
- Merge `supabase-step1.sql` through `supabase-step9.sql` into a single `supabase/schema.sql`
- Keep incremental files as historical reference but mark them deprecated
- Ensure `supabase-schema.sql` (the full reset) includes all step additions

### 1.2 Device Registry Table
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('trusted', 'temporary', 'revoked')),
  platform TEXT,          -- 'macos', 'linux', 'windows', 'ios', 'android'
  browser TEXT,           -- 'chrome', 'firefox', 'safari', 'edge'
  public_key TEXT,        -- for future device attestation
  fingerprint TEXT,       -- hashed device identity
  capabilities JSONB,     -- what this device can do
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, fingerprint)
);

-- RLS: users can only see their own devices
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own devices" ON devices
  FOR ALL USING (auth.uid() = user_id);
```

### 1.3 Device Registration API
- `POST /api/devices/register` — register a new device, set initial trust level
- `GET /api/devices` — list user's devices
- `PATCH /api/devices/[id]` — update trust level (trusted ↔ temporary)
- `DELETE /api/devices/[id]` — revoke device
- `POST /api/devices/[id]/heartbeat` — update last_seen_at

### 1.4 Client-Side Device Identity
- Generate device fingerprint from: user agent, screen resolution, timezone, language, platform
- Store in localStorage as `continua_device_id`
- Auto-register on first auth
- Auto-heartbeat every 5 minutes when app is active

### 1.5 Device Capability Detection
```typescript
// lib/capabilities.ts
export interface DeviceCapabilities {
  platform: 'macos' | 'linux' | 'windows' | 'ios' | 'android';
  browser: string;
  hasWebUSB: boolean;
  hasWebBluetooth: boolean;
  hasFileSystemAccess: boolean;
  hasNotifications: boolean;
  hasWebWorkers: boolean;
  hasTauri: boolean;
  hasClipboard: boolean;
  hasGeolocation: boolean;
  hasMediaDevices: boolean;
  hardwareConcurrency: number;
  deviceMemory: number; // GB, approximate
  maxTouchPoints: number;
  colorGamut: 'srgb' | 'p3' | 'rec2020';
  prefersReducedMotion: boolean;
  darkMode: boolean;
}

export function detectCapabilities(): DeviceCapabilities { ... }
```

---

## Phase 2: Workspace Context Capture
**Goal:** The daemon + context engine can capture "what the user is working on" in real-time.
**Duration:** ~1.5 weeks

### 2.1 Workspace Context Model
```typescript
// lib/continuity/types.ts
export interface WorkspaceSnapshot {
  id: string;
  userId: string;
  name: string;                    // "Starknet Website"
  activeTask: string;              // "Building navigation"
  resources: WorkspaceResource[];
  deviceCapabilities: DeviceCapabilities;
  capturedAt: number;              // timestamp
  syncedAt: number;                // last cloud sync
}

export interface WorkspaceResource {
  id: string;
  type: 'url' | 'file' | 'application' | 'note';
  identifier: string;              // URL, file path, app id
  name: string;                    // "Navbar.tsx"
  metadata: Record<string, any>;  // app-specific data
  relevance: 'high' | 'medium' | 'low';
  lastAccessed: number;
  source: string;                  // which device captured this
}
```

### 2.2 Workspace Store (Client-Side)
```typescript
// lib/stores/continuity.store.ts
interface ContinuityState {
  activeWorkspace: WorkspaceSnapshot | null;
  recentWorkspaces: WorkspaceSnapshot[];
  isCapturing: boolean;

  // Actions
  startCapture: () => void;
  stopCapture: () => void;
  addResource: (resource: WorkspaceResource) => void;
  removeResource: (resourceId: string) => void;
  saveWorkspace: () => Promise<void>;      // sync to cloud
  loadWorkspace: (id: string) => Promise<void>;
  listWorkspaces: () => Promise<WorkspaceSnapshot[]>;
}
```

### 2.3 Context Capture Hooks
- **Browser tab tracking:** Listen to tab open/close/focus events, capture URLs + titles
- **File manager tracking:** When user opens a file in the FM, add to workspace resources
- **App focus tracking:** Track which app window is active (via window store events)
- **Manual workspace naming:** User can name their current workspace
- **Auto-save:** Periodically snapshot the active workspace to cloud (every 30s when active)

### 2.4 Workspace Persistence
- `POST /api/workspaces/save` — save workspace snapshot to `context_records` domain
- `GET /api/workspaces/list` — list user's recent workspaces
- `GET /api/workspaces/[id]` — get specific workspace
- `DELETE /api/workspaces/[id]` — delete workspace
- Use existing `context_records` table with domain = `workspace_snapshot_{id}`

---

## Phase 3: The Continuity Loop (MVP Demo)
**Goal:** Close the loop. Machine A captures → cloud syncs → Machine B restores.
**Duration:** ~1.5 weeks

### 3.1 Workspace Restore Flow
```
User authenticates on Machine B
        │
        ▼
Fetch latest workspace from cloud
        │
        ▼
Detect Machine B capabilities
        │
        ▼
For each resource in workspace:
        │
        ├── URL resource → Can open in browser? → Open tab
        ├── App resource → Is app available? → Open in OS shell
        └── File resource → Is file accessible? → Open in FM
        │
        ▼
Show restore summary:
  "Restored: Figma, GitHub, VS Code"
  "Unavailable: Photoshop (not installed on this device)"
```

### 3.2 Restore UI Component
```tsx
// components/continuity/restore-panel.tsx
// Shows after authentication on a new device:
// - Workspace name + last active time
// - List of resources with status (restored / unavailable / skipped)
// - "Resume" button
// - "Start Fresh" option
```

### 3.3 Integration Points
- Add "Workspace" section to the dock/taskbar showing active workspace
- Add workspace switcher to the desktop (right-click → Workspaces)
- Add restore notification after login on new device
- Wire the existing `hydration.ts` to use the new workspace model

### 3.4 Selective Restore
- User can choose which resources to restore
- "Restore all" / "Restore high-relevance only" / "Pick individually"
- Remember restore preferences per device type

---

## Phase 4: Intelligence & Relevance
**Goal:** The engine understands what matters, not just what's open.
**Duration:** ~2 weeks

### 4.1 Relevance Scoring
```typescript
// lib/continuity/relevance.ts
export function scoreRelevance(resource: WorkspaceResource, context: {
  timeSinceLastAccess: number;    // minutes
  accessFrequency: number;        // times per day
  dwellTime: number;              // minutes spent
  relatedResources: number;       // how many other resources are related
}): number {
  // Weighted score: recency (40%) + frequency (30%) + dwell (20%) + relatedness (10%)
}
```

### 4.2 Workspace Auto-Discovery
- Analyze journal events to detect emerging workspaces
- Group related resources by: time proximity, application co-occurrence, URL domain similarity
- Suggest workspace names based on: file names, repo names, page titles
- Auto-create workspaces when enough related resources accumulate

### 4.3 Smart Restoration
- On new device, prioritize high-relevance resources
- Skip low-relevance resources unless user explicitly requests them
- If a resource is unavailable, suggest alternatives (e.g., "Photoshop unavailable → open in Image Viewer")

### 4.4 Context Summarization
- Use the existing `EpisodicMemoryEngine` to generate workspace summaries
- "You were working on the Starknet website navigation. Last session: Figma navbar design, GitHub PR #47, VS Code Navbar.tsx"
- Display summary on restore panel

---

## Phase 5: Team Continuity (The Business)
**Goal:** Shared workspaces, onboarding/offboarding, organizational continuity.
**Duration:** ~3 weeks

### 5.1 Shared Workspaces
```sql
CREATE TABLE workspace_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 Team Onboarding
```
Admin creates employee identity
        │
        ▼
Assigns to organization
        │
        ▼
Employee opens Continua
        │
        ▼
Sees team workspaces:
  - "Starknet Website" (shared by Josephan)
  - "Brand Assets" (shared by Design Lead)
  - "Sprint Board" (shared by PM)
        │
        ▼
Employee immediately has context
```

### 5.3 Team Offboarding
```
Admin revokes employee identity
        │
        ▼
All workspace access revoked
        │
        ▼
Employee's personal device registrations revoked
        │
        ▼
Company work remains in team workspaces
```

### 5.4 Permission Model
- Workspace owner can share with individuals or entire orgs
- Permissions: view (read-only), edit (can modify workspace), admin (can share + delete)
- Org-level permissions: all org members get access to org-owned workspaces
- Audit log: who shared what, when, with whom

---

## Technical Decisions

### What We're NOT Building
- ❌ Proxying third-party apps (Figma, Notion, Claude remain external)
- ❌ A "continuity dashboard" (the UI stays spatial and work-oriented)
- ❌ A password vault (use OAuth/passkeys/SSO)
- ❌ A giant Electron app (daemon is lightweight, event-driven)
- ❌ Spyware (privacy classification from day one)

### What We ARE Building
- ✅ Device registry with trust levels
- ✅ Workspace context capture and sync
- ✅ The continuity loop (capture → sync → restore)
- ✅ Relevance scoring and smart restoration
- ✅ Team workspaces and onboarding/offboarding
- ✅ Privacy-aware context classification

### Key Architectural Choices
1. **Reuse existing infrastructure:** context_records, context_layer, capability tokens, auth system
2. **Event-driven daemon:** don't poll, react to user actions
3. **Privacy from day one:** L0-L4 classification on every resource
4. **Graceful degradation:** if a resource is unavailable, skip it — don't block the whole restore
5. **Single source of truth for schema:** consolidate the 9 step files

---

## Validation Checkpoints

After each phase, validate:

**Phase 1:** Can I register a device, see it in the database, update its trust level?
**Phase 2:** Can I capture my active workspace (tabs, files, apps) and see it stored?
**Phase 3:** Can I capture on Machine A, authenticate on Machine B, and see my workspace restored?
**Phase 4:** Does the engine correctly rank resources by relevance?
**Phase 5:** Can I share a workspace with a teammate and see it appear on their device?

If Phase 3 works end-to-end, we have a valid product demo. Everything after that is enhancement.
