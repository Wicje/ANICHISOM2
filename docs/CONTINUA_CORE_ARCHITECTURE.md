# Continua Core Architecture

> Governing document. `CONTINUA_TEAM_CONTINUITY_PLAN.md` defines WHAT we build next;
> this defines HOW it must integrate and what we refuse to build.
> Status: adopted — decisions resolved (§9).

---

## 1. Honest map of today

Four separate persistence/sync paths exist. They overlap in responsibility,
differ in semantics, and only one was designed for conflict safety:

| Path | Where | Semantics | Verdict |
|---|---|---|---|
| **Context Kernel** (`lib/context-kernel/`) | `context_records` via admin driver | vector clocks, tombstones, delta pull, LWW per record | **canonical** going forward |
| Context Layer cloud mirror (`lib/context-layer.ts`) | `/api/context/save`, `/api/context/pull` | debounced IDB→cloud mirror, version counter | freeze; migrate to kernel |
| Storage adapters (`lib/storage.ts`) | direct `.from(table)` in agency mode | naive get/set per collection | freeze; apps keep local-only mode |
| Event queue (`lib/sync-queue.ts`) | `eventAdapter.add` → legacy `events` table | fire-and-forget retry queue | superseded by journal envelope (S4) |

Other load-bearing facts:

- **RLS is no longer the security boundary.** The kernel writes with the
  admin key server-side; every authorization decision lives in route code.
- **`context_records` is one row per `(user_id, domain)`, merged LWW over
  the whole domain blob.** Two writers on one domain silently clobber.
- Capability tokens carry `{ sub, ws }` — `ws` is a display name, not an ID.
- The legacy filmmaker schema (`workspaces.members jsonb`,
  `projects.team jsonb`, `presence`, `invites`) is dormant but referenced.

## 2. Target architecture

```
┌─ Clients ──────────────────────────────────────────────────────┐
│ OS shell · mobile control center · daemon (Rust)               │
│  local-first: IndexedDB / ~/.continua journal                  │
└──────┬─────────────────────────────────────────────────────────┘
       │ one API surface, one authz gate
┌──────▼─────────────────────────────────────────────────────────┐
│ Continua Core (Next.js routes + services)                      │
│  authorize(principal, action, resource)   ← SINGLE gate        │
│  ├─ Identity: pairing, sessions, capability tokens             │
│  ├─ Context:  kernel service (records, checkpoints, deltas)    │
│  └─ Continuity: hydration manifests, role assembly             │
└──────┬─────────────────────────────────────────────────────────┘
       │
┌──────▼──────────────┐   ┌───────────────────────────────────┐
│ Supabase            │   │ CRDT relay (Yjs/Realtime)         │
│ Postgres: records,  │   │ shared DOCUMENT state ONLY        │
│ memberships, tokens │   │                                   │
└─────────────────────┘   └───────────────────────────────────┘
```

## 3. Invariants (break none, ever)

1. **The server is the security boundary.** Every cross-boundary request
   passes through one `authorize()` call. RLS stays as defense-in-depth,
   never as the mechanism.
2. **The context graph is personal.** Records are append-mostly and
   user-scoped. Sharing = permission-filtered READS (checkpoints,
   project-tagged slices). Nobody writes into another person's graph.
3. **Multi-writer state lives only in CRDTs.** Anything two humans edit
   simultaneously goes through Yjs — never through context_records.
4. **Capture never blocks.** Sensors/journal write locally first; sync is
   batched and best-effort. Interpretation/checkpointing happens in core,
   not in capture paths.
5. **Identity chains downward:** phone approval → device token → session →
   scoped capability. Each link can only narrow, never widen.
6. **Tier A budget:** nothing ships that breaks the 4 GB reference machine
   (≤50 MB daemon, ≈0% idle CPU, batched network).
7. **Migrations are additive.** New SQL steps only; shipped steps are
   immutable history; removals happen as later steps.

## 4. Integration seams (how phases G–K attach)

### S1 — One authz module (`lib/authz.ts`)
```ts
type Principal = { userId: string; orgId?: string; scopes: Scope[] };
authorize(p, action, resource): { ok: true } | { ok: false; reason };
// resources: {type:'context', owner, domain, projectTag?}
//            {type:'proxy', provider}   {type:'org', orgId}
```
Routes become thin: verify token → build principal → authorize → serve.
Replaces hand-rolled `resolveUserId` duplication. Token v2 adds
`org?` and `scopes[]`; v1 tokens get implicit personal defaults, so
existing guests/daemons keep working unchanged.

### S2 — Kernel becomes THE context path
New features touch only the kernel. Cloud-mirror in context-layer and the
storage.ts agency adapter are frozen (still functional) and deleted once
kernel covers their domains. Apps that want cloud sync read/write domains
through kernel's registry, which already falls back to memory/IDB cleanly.

### S3 — Shared docs = Yjs, period
Team collaboration state (co-edited files, whiteboards, playback rooms)
uses the existing `useCollaborativeDoc` path against a relay. Org membership
gates the ROOM, not the graph.

### S4 — Event journal envelope (shared contract, Rust + TS)
```jsonc
{ "id": "uuid", "ts": 1756000000000, "device": "dev_x",
  "kind": "git.commit",            // namespaced, closed set
  "importance": 3,                 // L0 noise … L4 checkpoint
  "projectTag": "starknet-navbar", // optional org/project slice key
  "payload": { }                   // kind-specific, privacy-tiered upstream
}
```
Daemon journal, web sensor, and future mobile sensors all emit this shape.
Core derives checkpoints from L3/L4 + session-end flushes. This replaces
syncQueue and the daemon's fixed 60 s poll-and-send.

### S5 — Membership model (replaces jsonb)
Relational: `organizations`, `org_members(org_id, user_id, role)`,
project tags as plain strings on checkpoints. Visibility rule:
*"you may read user U's project-T context iff you share an org whose
projects include T"* — enforced in `authorize()`, not RLS gymnastics.

### Layered enforcement (decision D1: hybrid)
Two independent gates, one source of truth:

- **App gate (always):** every route runs `authorize()` before touching
  storage. Handles all principals incl. capability tokens that have no
  Supabase session. This is the authoritative layer.
- **DB gate (where a session exists):** browser-authenticated requests
  use the user's own JWT against RLS-enabled tables; RLS policies call a
  single SQL function (`app.is_org_member(uid, org_id)` etc.) that mirrors
  the TS rules verbatim. Admin-key paths skip this gate by design.
- Rule duplication is deliberate and bounded: TS module is normative,
  the SQL function is the safety net that still contains blast radius if
  a future route forgets `authorize()` — and the pattern ports cleanly to
  edge functions / other services later without dragging app logic along.

## 5. Corrections to the Team Continuity plan (don't do these)

1. ~~`org_id`/`project_id` columns on `context_records`~~ → redundant and
   invites shared rows. Keep records user-scoped; slice by `projectTag`.
2. ~~Phase G acceptance "two users see each other's checkpoint data"~~ →
   scoped reads of tagged checkpoints only; raw graphs stay private.
3. ~~Ship a y-websocket relay early~~ → defer until a real co-editing
   surface exists; Supabase Realtime presence suffices for Phase J v1.
4. ~~Treat "Agency Mode" toggle as the team foundation~~ → it's UI state;
   teams hang off identity/membership, not a client-side switch.

## 6. Refuse-to-build list

- No third sync system. Ever. (Kernel absorbs, others freeze.)
- No multi-writer context_records, no shared-domain rows.
- No building on `members jsonb` / legacy `workspaces`/`projects` tables.
- No permissions logic in the client (zustand is UX state, not truth).
- No org features without the authz gate — no exceptions for demos.
- No continuous recording / surveillance-flavored retention.

## 7. Migration discipline

- Additive SQL (`step6+`); env-flag token v2 acceptance (`CAPABILITY_TOKEN_V2=1`).
- Frozen paths log deprecation warnings in dev before removal.
- Every phase ends green: vitest + e2e + Tier A smoke, same as F.

### Legacy retirement (decision D3: archive → revoke → defer drop)
Step 6, in order: (1) copy legacy filmmaker tables into an `_archive`
schema (nothing lost, main schema clean), (2) `REVOKE` DML grants from
`anon`/`authenticated` on the originals so no client path can write them
again (admin keeps access for any future backfill), (3) physical
`DROP TABLE` deferred to a later step gated on a written kernel-parity
checklist — never dropped blind.

## 8. Sequencing impact

G(authz+tokens+membership SQL) → I(journal envelope, daemon first) →
H(assembly manifests) → J(presence v1) → K(agent tools).
Journal moves ahead of assembly because S4's contract unblocks both and
serves the performance thesis immediately.

## 9. Decisions (resolved)

- **D1 authz:** hybrid layered enforcement — `authorize()` is normative
  and always runs; mirrored RLS (SQL membership functions) guards
  session-bearing paths as defense-in-depth. See §S1 addendum.
- **D2 consolidation:** freeze now, delete later (after Phase H parity).
- **D3 legacy tables:** archive → revoke → defer drop, per §7.

Status: architecture adopted. Phase G may proceed against S1 + S5.
