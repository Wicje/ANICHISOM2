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

### Phase G — Team Foundation (~schema + tokens, minimal UI) ✅
*Layer 4 skeleton on top of the shipped identity work.*

- [x] `supabase-step6.sql`: relational team core — `organizations`,
  `org_members(org_id, user_id, role)` replacing JSONB membership; RLS from
  membership functions (`app.org_role` / `app.is_org_member`). Legacy
  filmmaker tables archived to `_archive` + client DML revoked per §7 of the
  architecture doc.
- [x] Capability token claims: `{ sub, ws, org?, scopes[] }`
  (`lib/capability-token.ts`) — backward compatible; v1 tokens receive
  implicit personal defaults via `principalFromClaims`. Org-scoped minting in
  the pair route is gated by `CAPABILITY_TOKEN_V2=1` and requires a verified
  approver holding a real seat.
- [x] Single authz gate `lib/authz.ts` wired into `/api/context/save`,
  `/api/context/pull`, `/api/agent/proxy`, pair route, and the new org routes.
  Org verbs are seat-gated (DB-resolved roles), never token-gated.
- [x] Org API: `POST/GET /api/orgs`, `GET/POST/DELETE /api/orgs/[id]/members`
  (owner/admin grant rules, sole-owner protection, self-leave).
- ~~Add `org_id`/`project_id` to `context_records`~~ — **dropped by design**
  (architecture §5): records stay user-scoped; project slicing arrives with
  checkpoint tags in Phase I.

**Done when:** two test users in one org see only their authorized
checkpoint data through the API → *revised*: G ships the identity/permission
substrate; cross-user scoped reads land with checkpoints in Phase I/H.
Membership + token plumbing is verified by 29 unit tests (695 total green).

### Phase H — Workspace Assembly (onboarding-as-consequence) ✅
*No "employee onboarding" feature. Joining a project IS the onboarding.*

- [x] Role manifests: declarative JSON per role (`lib/org-manifest.ts`,
      strict validator + code-shipped defaults for developer/designer/member;
      DB overrides via `supabase-step8.sql` org_manifests with mirrored RLS).
- [x] `GET /api/orgs/[id]/assemble` (supersedes the draft `/api/org/onboard`)
      — assembly derived server-side from the CALLER'S CURRENT SEAT; the
      role param is never trusted for self-assembly.
- [x] Seat vs workspace split: seats are permission ranks (owner/admin/
      member); optional `org_members.manifest_role` points at the workspace
      definition (e.g. designer) so ranks stay orthogonal to job roles.
- [x] Client assembly (`lib/workspace-assembly.ts`, wired at OS boot):
      installs apps, adds web resources as custom web apps, seeds the
      `ai_context` domain (new canonical domain), sets agency scope.
      Idempotent by design — safe to re-run every boot.
- [x] Offboarding = delete one seat row: assemble 403s instantly, org data
      reads end, nothing was materialized at grant time. Personal state from
      earlier assemblies is deliberately NOT reverted (invariant 2).

**Done when:** adding a user auto-assembles their workspace on next boot ✓;
removing them revokes everything org-side with one row deletion ✓.
Verified by 40 unit tests (741 total green).

### Phase I — Daemon v2: Event Journal (capture ≠ interpretation) ✅
*Architecture principle: capture continuously, interpret asynchronously,
persist selectively, synchronize intentionally.*

- [x] Rust append-only local journal (`~/.continua/journal/YYYY-MM-DD.events`),
      JSONL day files, cheap appends; sync watermark file (`daemon/journal.rs`).
- [x] Deterministic classifiers first (`daemon/classify.rs`): project switch
      → L1 `app.focus`, branch switch → L2 `git.branch`, new HEAD commit →
      L3 `git.commit`, title churn → L0 throttled to 1/5 min. AI
      interpretation stays a later consumer.
- [x] Checkpoint triggers: SIGTERM/Ctrl+C session-end handler writes an L4
      `session.end` and attempts one final flush; startup retention purge
      (raw 7 d default, cloud 90 d via pg_cron when present).
- [x] Batched sync: milestone+ events ship to `/api/journal/ingest` every
      `sync_interval_secs` (default 45 s), watermark advances only on HTTP
      success so failed batches retry; WorkContext snapshot now ships only
      on state change (+ slow heartbeat), replacing the fixed 60 s send.
- [x] S4 contract mirrored in TS (`lib/journal/envelope.ts`), server ingest
      with envelope validation + ownership stamping (`supabase-step7.sql`,
      user-scoped RLS).

**Done when:** hard-killing the laptop loses nothing journaled; cloud
receives only milestones/checkpoints; idle ticks cost a diff, not a write.
Verified by 10 Rust unit tests (standalone harness) + 18 TS tests (713 total).

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
