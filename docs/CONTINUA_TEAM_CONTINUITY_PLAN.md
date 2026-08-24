# Continua — Team Continuity & Layered Architecture Plan

> Companion to `CONTINUA_PRODUCTION_PLAN.md` (Phases A–F: production hardening, shipped).
> This document defines the product thesis going forward and phases G–K.

---

## The Thesis

**Continua makes computing independent of where your hardware is.**

Hardware still provides compute, display, storage. But your work, identity,
context, and environment are no longer bound to one physical machine.

Positioning: *"a continuity layer for personal and team computing"* — not
"a browser-based operating system." The OS UI is our first client, not the
product itself.

## Five Layers (one system)

| Layer | Question | Codebase reality today | Maturity |
|---|---|---|---|
| 1 Identity | Who are you? | QR pairing, capability JWTs, device tokens, phone as approval anchor | ~40% |
| 2 Context | What are you doing? | Context kernel (vector clocks, delta sync), web sensor, Rust daemon, privacy tiers | ~65% |
| 3 Continuity | Where do you continue? | Hydration, restore modal, daemon checkpoints, ephemeral guests | ~55% |
| 4 Collaboration | Who are you working with? | Binary private/agency toggle, Yjs plumbing — no orgs/roles/permissions | ~15% |
| 5 Intelligence | How can AI help? | Token-verifying proxy; context-awareness not wired into agents | ~20% |

One system: Personal and Team are two faces of the same core
(Identity + Context + Continuity), with AI as a consumer of context —
not a separate product.

---

## Agency Mode Audit (what exists in the codebase today)

### Exists (scaffolding)
- **Binary mode switch**: `WorkspaceMode = 'private' | 'agency'`
  (`lib/stores/workspace.store.ts`), toggled from the menu bar. It is a
  *sync-scope* switch, not an organizational concept.
- **Context layer dual-mode** (`lib/context-layer.ts`): private = IndexedDB
  only; agency = IDB + mirror to Supabase `context_records`. Strictly
  single-user — no org/project scoping.
- **Real-time collab plumbing** (`lib/hooks/useCollaborativeDoc.ts`):
  Yjs docs per app (code editor, Word/Sheets/Slides, media playback),
  awareness, remote cursors, peer counts. Dev uses `y-websocket` on
  `ws://localhost:1234` — **no relay server exists in the repo or prod**;
  prod falls back to Supabase Realtime cursors.
- **Legacy team schema** (`supabase-step1.sql`): `workspaces.members jsonb`,
  `projects.team jsonb`, `presence`, `events`, `invites`, RLS referencing
  membership via `jsonb_array_elements_text`.
- **Cosmetic agency references**: client-portal feedback UI, proposal
  generator copy, hardcoded "Agency OS" string in mobile control center.

### Missing (the actual product)
1. Organizations/agencies as first-class entities (relational members).
2. Roles & permissions (JSONB arrays cannot scale or express RLS properly).
3. **Permission-aware context graph** — `context_records` has only
   `user_id`; nothing answers *"what is this user's authorized workspace?"*
4. Scoped capability tokens — claims are `{sub, ws}` only; no
   org/project/action scopes.
5. Role-based workspace assembly (onboarding-as-consequence) and
   offboarding (revoke access → shared context remains).
6. A deployed collaboration relay.

**Verdict: ~30% built, and it's the easy 30%.** The plumbing proves the
architecture; none of the organizational semantics exist yet.

---

## Phases

### Phase G — Team Foundation (~schema + tokens, minimal UI)
*Layer 4 skeleton on top of the shipped identity work.*

- [ ] `supabase-step6.sql`: relational team core —
  `organizations`, `org_members(org_id, user_id, role)`,
  `org_projects(org_id, …)` replacing JSONB membership; RLS from
  membership joins. Keep legacy tables untouched.
- [ ] Extend capability token claims: `{ sub, ws, org?, scopes[] }`
  (`lib/capability-token.ts`) — backward compatible (scopes optional).
- [ ] `/api/connect/token` + pair routes accept org context; proxy route
  enforces scopes before provider calls.
- [ ] Add `org_id`, `project_id` columns to `context_records` (+ step6 SQL);
  context pull/save filter by membership when org-scoped.

**Done when:** two test users in one org see only their authorized
checkpoint data through the API, with scoped tokens.

### Phase H — Workspace Assembly (onboarding-as-consequence)
*No "employee onboarding" feature. Joining a project IS the onboarding.*

- [ ] Role manifests: declarative JSON per role (designer → Figma links,
      Notion spaces, Drive folders, Slack channels, AI context scope).
- [ ] `GET /api/org/onboard?org=&role=` returns the assembled manifest.
- [ ] Hydration (`lib/hydration.ts`) consumes manifests: installs the app
      set, opens browser tabs, seeds AI context — reusing the existing
      checkpoint hydration path.
- [ ] Offboarding = delete membership row; org context remains; member's
      personal journal never leaked into org space.

**Done when:** adding a user to a project auto-assembles their workspace
on first boot; removing them revokes everything with one row deletion.

### Phase I — Daemon v2: Event Journal (capture ≠ interpretation)
*Architecture principle: capture continuously, interpret asynchronously,
persist selectively, synchronize intentionally.*

- [ ] Rust append-only local journal (`~/.continua/journal/YYYY-MM-DD.events`),
      cheap writes, importance levels L0 noise → L4 checkpoint.
- [ ] Deterministic classifiers first (app switch = L1, git commit = L3);
      AI interpretation only where genuinely useful (later).
- [ ] Checkpoint triggers: meaningful state change + session termination
      flush; retention policy raw 7d / aggregated 90d (local purge).
- [ ] Batched sync every 30–60 s (or on checkpoint), not per-event;
      replaces the current fixed 60 s poll-and-send loop.

**Done when:** hard-killing the laptop loses nothing; cloud receives only
milestones/checkpoints; idle CPU ≈ 0 between events.

### Phase J — Collaboration Relay
- [ ] Ship a tiny y-websocket relay (or Supabase Realtime channel) behind
      auth; wire `useCollaborativeDoc.ts` prod branch to it.
- [ ] Presence for org projects (who is in what workspace now).

**Done when:** two browsers co-edit a Continua doc remotely.

### Phase K — Intelligence as a Context Consumer
- [ ] Agent tools query the context graph ("what was I doing yesterday?",
      "continue Starknet navbar") instead of being a separate product.
- [ ] Handoff prompts assembled from checkpoints.

---

## Explicitly NOT building now

| Idea | Why later |
|---|---|
| Digital Time Machine (continuous recording) | Checkpoints + event journal give fidelity without surveillance/storage cost |
| Low-end hardware → remote workstation | Enters infrastructure economics; Continua accesses existing hardware first |
| Standalone "Knowledge Graph" product | Falls out of context relationships automatically |
| "Continua AI" as a product | AI sits ON TOP of the context graph |
| Replacing passwords/OAuth | Orchestration layer over existing identities |

---

## Performance Budget (4 GB Arch reference machine)

**Rule: Continua must not require more resources than the work it helps continue.**

| Budget | Target |
|---|---|
| Daemon RAM (idle) | ≤ 50 MB |
| Client RAM (shell only) | ≤ 250 MB |
| Idle CPU | ≈ 0% (event-driven, not polling) |
| Initial JS payload | Shell-only; apps lazy-load on open |
| Background network | Batched 30–60 s, metadata-first, metered-connection mode |
| Offline | Core workspace usable; journal + cache reconcile on reconnect |

Client does: UI, input, render, local cache, light capture.
Server does: coordination, heavy indexing, history, team state.
External apps do their own heavy work — we store relationships, not copies.

## Test Tiers

- **Tier A**: 4 GB RAM / Arch Linux laptop (reference minimum)
- **Tier B**: 8 GB Windows
- **Tier C**: 16 GB+ macOS/Linux

Every release must stay comfortable on Tier A.
