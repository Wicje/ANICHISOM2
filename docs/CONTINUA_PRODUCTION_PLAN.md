# Continua — Production Execution Plan

> **Where we are:** The continuity-layer pivot (Phases 1–4 of `CONTINUA_IMPLEMENTATION_PLAN.md`) is structurally complete: mobile control center, `/connect` pairing flow, context graph engine, 30s checkpoint sensor, chrome detectors, and repositioned landing/waitlist.
>
> **What remains:** Everything is demo-grade underneath. This plan hardens the prototype into a product, in dependency order. Each phase ends with a shippable increment.

---

## 0. Sequencing Rationale

| Order | Phase | Why here |
|---|---|---|
| A | Housekeeping | Trivial; unblocks clean diffs for everything else |
| B | Production Connect | Serverless deployment breaks in-memory pairing **today**; tokens are security-critical |
| C | Privacy Guardrails UI | Small, independent, high-trust value; sensor already reads the flag |
| D | Real Hydration | The core product promise ("your work follows you") is currently a loading animation |
| E | Tauri Daemon | Largest track; depends on B's token auth and D's snapshot format being stable |
| F | Launch Readiness | Verification pass over everything above |

---

## Phase A — Housekeeping (~0.5 day)

- [ ] Delete `tsc_errors.log` from root; add `*.log` to `.gitignore`
- [ ] Move one-off audit/test scripts from `scripts/` → `scripts/archive/` (keep `start-os-server.mjs`, `build-extension.mjs`, plugin CLI)
- [ ] Resolve or triage existing TS errors so `tsc --noEmit` is green before new work
- [ ] Verify lint passes (`eslint.config.mjs`)

**Done when:** root is clean, typecheck/lint green.

---

## Phase B — Production-Grade Ephemeral Connect (~3–4 days)

### B1. Persistent Pairing Store
Replace the in-memory `Map` in `app/api/connect/pair/route.ts:21` with Supabase.

- [ ] New table `pairing_sessions`: `pin (pk)`, `status`, `workspace`, `client_info`, `capability_token_hash`, `expires_at`, `created_at`
- [ ] On-read expiry check + periodic cleanup (Supabase pg_cron or lazy delete)
- [ ] RLS: service-role only writes; anon can read status by exact PIN match only
- [ ] Keep API shape identical (`GET ?pin=`, `POST`) so client changes are zero

### B2. Real QR Codes + Phone Approval Page
The QR at `app/connect/page.tsx:145-162` is an SVG mockup; phones cannot scan it.

- [ ] Add `qrcode` npm package; encode `{origin}/connect/approve?pin={PIN}`
- [ ] New route `app/connect/approve/page.tsx` (phone-side): requires authenticated mobile session → shows workspace + device preview → "Grant Access" calls `POST /api/connect/pair`
- [ ] Remove the "Instant Pair" demo button (`handleSimulateApprove`) or gate behind `?demo=1`

### B3. Capability Tokens (JWT)
Token validation at `app/api/agent/proxy/route.ts:36` accepts any string ≥6 chars.

- [ ] Add `jose`; sign short-lived (60 min) JWT at pairing approval with claims: `sub` (userId), `ws` (workspace scope), `exp`, `typ: 'capability'`
- [ ] Secret via `env.CAPABILITY_JWT_SECRET`; verify in proxy route before any provider call
- [ ] Guest client stores token in `sessionStorage` only (already wiped by ephemeral purge)
- [ ] Mobile Control Center sends its real Supabase session-derived capability token instead of `'tok_mobile_key_active'` (`components/mobile/mobile-control-center.tsx:116`)
- [ ] Optional refresh endpoint: `POST /api/connect/refresh` extends token while mobile key stays online

### B4. Auto-Wipe Enforcement
`purgeAllDeviceTraces()` exists in `lib/stores/privacy.store.ts:90`.

- [ ] Trigger wipe on `beforeunload`/`visibilitychange→hidden` when `isEphemeralMode`
- [ ] Enforce server-side expiry too (proxy rejects expired tokens even if client kept them)

**Done when:** a second real device can scan the QR, approve, land in `/os?ephemeral=true`, use AI through the proxy, and every artifact dies within 60 min or on logout.

---

## Phase C — Three-Tier Privacy Guardrails UI (~1–2 days)

The sensor honors `continua_privacy_mode` (`lib/hooks/use-context-sensor.ts:30`) but **nothing writes it**.

- [ ] Settings app: new "Context & Privacy" section with radio switcher:
  - `standard` — metadata-only checkpoints, cloud sync
  - `local_only` — checkpoints written to IndexedDB driver only, no cloud sync
  - `private_session` — sensor fully paused
- [ ] Writer helper `setPrivacyMode()` in `lib/context-kernel/graph.ts` or a small store (single source of truth; localStorage key stays `continua_privacy_mode` for sensor compatibility)
- [ ] Status badge in desktop shell top bar + MobileControlCenter devices tab showing active mode; quick-toggle to pause
- [ ] Chrome extension + future daemon respect mode via `GET /api/context/mode` (new lightweight endpoint)

**Done when:** switching tiers visibly starts/stops checkpoint writes and cloud sync without reload.

---

## Phase D — Real Workspace Hydration (~2–3 days) ⭐ *core value prop*

"Hydrating Workspace Context..." (`app/connect/page.tsx:234-242`) currently just routes to `/os`. Make it actually restore.

- [ ] Audit existing `/api/context/{pull,snapshot,export,import}` routes; pick one canonical read path for latest checkpoint per user+workspace
- [ ] Hydration module `lib/hydration.ts`: map `WorkContext` → stores
  - `browserTabs` → browser store tabs
  - `editor.openFiles` → window store windows (Monaco/Code Studio)
  - `notesSummary`/tasks → Notes/Tasks apps
- [ ] On boot with `?ephemeral=true` (or after any login): pull latest checkpoint → offer "Restore last session?" toast → hydrate
- [ ] Remove hardcoded git fields from sensor (`use-context-sensor.ts:53-59`) until daemon supplies real ones; omit rather than fabricate
- [ ] Show restored-context summary card ("Restored: branch X • 8 tabs • 3 files")

**Done when:** logging in on a fresh browser restores tabs/windows from the last checkpoint within seconds.

---

## Phase E — Tauri Background Context Daemon (~1–1.5 weeks)

Current `src-tauri/src/commands.rs` is file IO only. Evolve shell → tray daemon.

### E1. Shell Transformation
- [x] Hidden main window + system tray icon (menu: Status / Pause / Local-only / Dashboard / Quit)
- [x] Single-instance guard (localhost port bind); autostart optional (tauri-plugin-autostart, deferred)

### E2. Context Sensors (Rust)
- [x] Active window title detection via platform CLI (xdotool/kdotool · osascript · powershell); process name deferred
- [x] Git watcher: shallow walk of configured roots, `git rev-parse --abbrev-ref HEAD` + `git status --porcelain`, most-recent-activity selection
- [ ] VS Code workspace detection: parse recent-workspaces from `~/.config/Code/User/globalStorage/state.vscdb` (or process cmdline fallback)
- [ ] Terminal task detection: best-effort from active process list (defer if messy)

### E3. Uplink
- [x] POST checkpoints to `/api/context/save` with device capability token (30-day JWT from Phase B/F route)
- [x] Pause + Local-only modes enforced locally via tray menu flags
- [x] Offline queue: bounded JSONL buffer (~200 checkpoints) next to config, flushed after next successful post

**Done when:** daemon captures a real branch switch in VS Code and it appears in the web client's restored context.

---

## Phase F — Launch Readiness (~1 week)

- [x] Playwright e2e: full journey `connect → approve → capability-token save/pull → anon rejected → wipe` (`e2e/connect-journey.spec.ts`); landing smoke in `core.spec.ts`
- [x] Unit tests: token sign/verify (`capability-token.test.ts`), pairing TTL + lockout (`pairing-store.test.ts`), hydration mapping (`hydration-mapping.test.ts`), privacy sanitizer (`privacy-sanitizer.test.ts`)
- [x] Security review checklist:
  - No raw keys server-side (capability JWTs only; secrets via env) ✅
  - CORS tightened: `lib/cors.ts` allowlist via `CONTINUA_ALLOWED_ORIGINS`; unset = `*` (dev), set = echo only allowed origins (prod) ✅
  - Pairing rate-limited: `CONNECT_PAIR` 30 req / 5 min / IP ✅
  - PIN brute-force lockout: 10 failed approvals within 10 min → session destroyed + PIN locked out (`recordPairingFailure`) ✅
  - `/connect` added to middleware public routes (guests have no Supabase session — was redirecting them to `/`) ✅
- [ ] Load sanity: pairing + checkpoint routes under concurrent users
- [ ] Landing page: replace remaining OS-imitation copy; add daemon download section after E ships
- [ ] Alpha waitlist → invite flow (export emails, send connect links)

---

## Open Decisions (resolve during Phase B)

| # | Decision | Default unless overridden |
|---|---|---|
| 1 | QR content: deep link vs URL+PIN | URL+PIN (works cross-platform, no app scheme needed) |
| 2 | Capability secret: env HMAC vs Supabase JWT | HMAC via `CAPABILITY_JWT_SECRET` (no extra deps) |
| 3 | Pairing DB: Supabase vs Redis/Upstash | Supabase (already integrated, RLS available) |
| 4 | Daemon platform priority | Linux/macOS first (dev machines), Windows later |

---

## Suggested First PR Sequence

1. `chore: repo cleanup + typecheck green` *(Phase A)*
2. `feat(connect): supabase-backed pairing + real QR + approve page` *(B1+B2)*
3. `feat(auth): signed capability tokens end-to-end` *(B3+B4)*
4. `feat(privacy): three-tier switcher UI` *(C)*
5. `feat(hydration): restore workspace from last checkpoint` *(D)*
6. `feat(daemon): tauri tray context sensors` *(E, split into 2–3 PRs)*
