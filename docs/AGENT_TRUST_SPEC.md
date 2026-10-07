# Agent Trust Spec — policy engine + log format (the credibility half)

Status: normative for `apps/desktop-electron`. Implements ADR-012. Code is
authoritative when this doc and code disagree — file a bug, do not reinterpret.

## 1. Decision point

`agent-policy.js#decide({op, source, params, grant, spent, auto})` is the single
decision point for every automated action (IPC `continua` handler + loopback
bridge `dispatchAgentRpc`). No path may bypass it.

- Tiers: `read` (free), `write` (grant), `user-only` (`sync_key_*`,
  `agent_approve`), unknown (deny).
- Reads free: `observe_tab`, `list_tabs`, `see_visual`, `see_chrome`,
  `layout_state`, `debrief_session`, searches.
- Writes need a user-issued, action-bound, single-use grant. `approved: true`
  or `auto: true` from any agent is ignored/refused, never queued as approval.
- `source: "page"` can never write.

## 2. Fingerprint (action binding)

`fingerprint(op, params) = sha256(stable({op, params: sanitize(params)}))[0:32]`
(hex, 128-bit truncation of a 256-bit digest).

- `sanitize`: secret-bearing keys (`token`, `password`, `value`, `secret`,
  `auth`, `key`) → `"[redacted]"`; other strings capped at 512 chars. Redaction
  happens before hashing, so a typed password neither lands in the log nor
  becomes replayable from it.
- Known limitation (accepted): `value` is redacted, so two `type` actions that
  differ only in text share a fingerprint; the grant still binds op + node +
  tab, and consumption is single-use. `act_tab`/`agent_act` currently bind
  `{verb, id, label}` without `value` or `url` — a tab navigating between
  approve and execute is a known TOCTOU gap (fix queued: bind `url`).
- `nonce` (approval request id) is stored for audit, not hashed.

## 2b. What the fingerprint binds (and what it costs)

Tab-scoped grants bind `url` (the tab's URL at approval) plus, for `type` /
`type_at`, `valueLen` (the length of the text, not the text — secrets stay
redacted). A tab that navigates between approval and retry re-queues instead
of firing: fail closed on TOCTOU, at the price of one more prompt after
navigations. Raw `value` is never bound (it would make the fingerprint a
secret oracle); length-only binding distinguishes `"ok"` from an exfil payload
without storing either.

## 3. Grant protocol (four ops, both sides in sync)

1. Agent attempts write with no/invalid grant → host `decide()` returns
   `{allowed: false, needsApproval: true, fingerprint}` and queues
   `approval-queue.js#add({op, params, tab, url, fingerprint})` (5-min TTL).
2. Chrome shows the request (`agent-approval-requested`); user approves in the
   active profile only.
3. `approveRequest` mints `mintGrant(op, params, {nonce: requestId})`
   → `{id (16 hex), op, fp, nonce, actor: "user", issuedAt}` in the
   per-profile `grant-registry.js` (5-min TTL from issue).
4. Agent retries with `{id, op, fp}` → the registry resolves AND consumes in
   one synchronous step, then the host executes exactly once. Single-use means
   single *attempt*: a failed execution still spends the grant. The old
   resolve-then-consume split had a check-then-act race across concurrent
   actions; `resolveAndConsume` is the only correct call and the gate owns it —
   callers never consume.

There is deliberately no bridge/IPC approve/deny method: a token holder is a
reader by default, never an authoriser. `agent_deny` is chrome-only.

## 4. Audit log format (JSONL, hash-chained)

One file per profile: `agent-audit-log-<profile>.jsonl` (bridge-compat alias
`agent-audit-<profile>.jsonl` is read, never written).

- Entry body (hashed): `{ts, actor, op, tier, allowed, source, profile,
  reason, target (scrubbed URL: origin+path, query dropped), tab, fp,
  grantId, summary (≤300 chars)}`. `params`/`value` are never stored.
- Chain: `hash = sha256(prevHash + "|" + stable(body))`, genesis `0×64`.
  `verify()` reports the first broken `seq`. Rotation caps at 5000 entries;
  trimming the head makes verify report a break at the first retained entry —
  honest (the window is what verifies), explained on export.
- Seal: on quit the head `{seq, head}` per profile is sealed with the OS
  keyring (`safeStorage`) into `agent-audit-<profile>.head.sealed`; on boot
  the loaded chain is compared to the seal and a mismatch is logged as
  `AUDIT SEAL MISMATCH` (file replaced/truncated while away). A full-file
  rewrite with valid hashes still verifies *within* the file — the seal only
  anchors the head across restarts. No keyring (headless Linux) means no
  anchor, stated loudly instead of pretended.
- Every decision, allowed or denied, is appended (debounced 250 ms, tmp+rename,
  flushed on quit). Query: `Managers → Agent audit`, `audit_log_export` IPC,
  or MCP `audit_log`. Export includes `chainOk` + first-bad-seq when broken.

## 5. Bridge + MCP surface

- Loopback only (`127.0.0.1`, random port, per-boot 192-bit token). Token file
  `agent-bridge.json` is owner-only (`0600` + Windows `icacls` inheritance
  removal), written atomically (tmp → lock down → rename, so a crash never
  leaves half-JSON), and unlinked on quit so a stale file can't point a client
  at a reused port. Auth (constant-time compare) runs before the 600 req/min
  rate limit, so unauthenticated locals can't burn the quota. No remote
  reachability by construction; `CONTINUA_BRIDGE_FILE` override is trusted
  config, not input. MCP clients pin the bridge `pid` (dead pid = stale file,
  keep looking). The same agent surface is reachable over IPC from preload
  holders, so captures and writes carry their own 1200/min budget there —
  normal chrome traffic (tabs, config) is uncapped.
- MCP (`mcp-browser.mjs`, dependency-free stdio): `see_tab`, `act_tab`,
  `debrief`, `list_tabs`, `pending_approvals`, `audit_log`. `act_tab` takes a
  `grant` object from a prior `needsApproval` response — never an `approved`
  flag. Node ids are host-resolved index-paths (`"0.2.1"`); the page can never
  supply a selector.
- Visual channel: `see_visual` (tab pixels) + `see_chrome` (chrome pixels) are
  free reads, bounded (dimension + byte budgets) and audited. `click_at` /
  `type_at` coordinates are writes: off-viewport points are refused (never
  clamped), gated and fingerprinted like any write.

## 6. What changed recently (fail-closed fixes)

- IPC + bridge grant consume is atomic inside the gate (`resolveAndConsume`);
  replay gets `grant-spent`, and concurrent double-presentations can't share.
- Grants bind tab `url` + typed `valueLen`; navigation between approve and
  retry re-queues.
- IPC `type_at` is gated/audited as `type_at` (was shadowed to `click_at`).
- `type=password` values are no longer collected into the ax-tree.
- Emitted action JS refuses `disabled` / `aria-disabled` targets at execution
  time (snapshot may be stale); node ids are size-bounded at classify time.
- Bridge auth precedes rate limiting; token writes are atomic and removed on
  quit; MCP pins the bridge pid.
