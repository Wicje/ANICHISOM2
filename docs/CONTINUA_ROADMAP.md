# Continua Desktop — Roadmap (post command-palette)

Status snapshot after: immersive mode, workspace resurrection, context-memory
new tab, command palette, shareable sessions (local export/import), and vault
tabs (encrypted pinned tabs) shipped. This file plans the remaining batches.

## P0 — Server-side session sync (context kernel)

Server surface already exists: `POST /api/context/save` (accepts session
cookie OR capability token, plus `deviceId` + `version`), `GET
/api/context/pull`, `/snapshot`, `/export`, `/import`, backed by a
vector-clock kernel (`lib/context-kernel/`) for CRDT-ish conflict handling.

Desktop gap: `sync.rs` sends no token, no `deviceId`, no `version`, and only
pushes lightweight tab context — never a session snapshot.

Steps:

1. **Auth** — desktop registers the machine once, receives a capability
   token, stores it in the OS keyring. This is the "capability-token auth is
   wired" dependency the earlier roadmap was waiting on.
   - Server: `POST /api/devices/register` returns `deviceId` + freshly minted
     capability token (`sub=deviceId`, scopes `context.write context.read
     session.write session.read`).
   - Desktop: `register_device` command -> `sync.rs` client + `DeviceInfo`
     from `trust.rs`; token cached in `vault.rs` keyring under
     `device:capability-token`.
2. **Push snapshots** — new POST `/api/session/save`: `{ deviceId, version
   (vector-clock), snapshot }`; snapshot is the `SessionSnapshot` JSON with
   vault tabs already redacted to `vault_id` (the desktop engine guarantees
   this on serialize).
3. **Cross-device resurrection** — GET `/api/session/pull` returns checkpoints
   newer than a given version/branch; desktop merges with `delta-sync`
   semantics and calls `restore_from_snapshot`. NewTab gains a "Remote"
   checkpoint list beside local Memory.

Open questions:

- Conflict policy: per-tab, per-domain, or last-writer-wins straight merge?
  Proposal: vector-clock per tab (matches kernel) with last-writer-wins for
  the holding snapshot object.
- Snapshot budget per device (e.g. keep latest N per branch, cap payload).

## P1 — Moat device-auth sync

The moat = security core of plan §3: device trust + capability enforcement.
Server has `devices` table with `trust_level`, `fingerprint`, `last_seen_at`,
heartbeat.

1. `trust.rs` -> real device fingerprint (port browser `lib/hardware.ts` +
   `capabilities.ts` logic to Rust): stable machine ID anchored in the
   keyring, not the volatile hostname.
2. Heartbeat every N minutes -> `/api/devices/heartbeat` refreshes
   `last_seen_at`; server raises `trust_level` after sustained uptime.
3. Vault on a new machine: capability token scopes `vault.read`; the wrapped
   vault is recoverable only for the account owner's identity, so a session
   pulls but vault tabs require the owner key.
4. Grace: unregistered devices are read-only (no session pull, no vault)
   until they complete the pairing/auth flow.

Open questions: token TTL/rotation; explicit pairing prompt on the account
device vs silent register.

## P2 — Icon/branding

1. App icon: brass diamond (`◈`) on charcoal -> `icons/` in
   `tauri.conf.json` (png/icns/ico); taskbar + window icon.
2. Titlebar drag region and focus ring (chrome is already brass-accented).
3. First-run brand moment on NewTab (lockup + "your workspace follows you").

## P3 — Wrap-up: tests, HiDPI, plan doc

1. Rust unit tests (`cargo test`): `tab_engine` snapshot/restore roundtrip
   incl. vault redaction (vault shim behind a trait), `vault` manifest
   roundtrip, `session` backward-compat load of old-format `latest.json`.
2. HiDPI audit: `display_resolution` is `"unknown"` in `trust.rs`;
   `layout_rect` under scale factor / device pixel ratio.
3. Plan doc §10 refresh (see final section below).

## P4 — Roadmap review

Keep `docs/CONTINUA_BROWSER_PLAN.md` §10 truthful; move the two resolution
blockers out of "Deferred" (webkit2gtk is installed; build/typecheck run).
Repromote the remaining items into the phase backlog.

## P5 — Input fingerprinting (open source tech)

Goal: add "same human behind the keyboard" as a soft factor in the trust
score, so session/vault recovery is not purely machine-based.

Candidates:

- `browser-fingerprint` (Valve Rust crate) — device fingerprinting; the
  natural fit for a Tauri Rust shell.
- ThumbmarkJS — canvas/audio/WebGL browser fingerprint; portable but
  spoofable; soft signal only.
- Keystroke dynamics — keydown/keyup timestamps captured locally; classify
  lightly (mean/std per keypair, hashed); open-source frameworks exist but
  practical libs are thin.
- HID/mouse micro-features via `evdev`/`libinput` on Linux; capture only
  hashed micro-features (privacy-tight), never raw trajectories.

Recommended v1: `browser-fingerprint` + local typed-input-cadence hashes,
combined as one weighted factor in a trust score — never a deterministic
device identity, never transmitted raw.

## Suggested execution order

P0 -> P3 (plan-doc + HiDPI) -> P1 -> P3 (tests) -> P2 -> P5 (spikes can run
alongside P0/P1).