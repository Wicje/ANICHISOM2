# Agent Track — See / Work / Live / Distribute

Status: shipped (see `apps/desktop-electron/ax-tree.js`, `agent-act.js`,
`debrief.js`, `mcp-browser.mjs`). The browser shell is the environment; the
agent observes through a redacted pinhole and acts through a gated API.

## Loop (adapted from hyperframes verify-loop; no LLM here)

- **SEE** — `observe_tab` / MCP `see_tab`: reduced a11y snapshot of the live
  DOM (role, name, value, href, invisible/checked/disabled), cap ~600 nodes.
  Node ids are **index-paths** (`"0.2.1"`) into the DOM element tree, resolved
  host-side — the page can never supply a selector.
- **WORK** — `agent_act` / MCP `act_tab`: verbs `click type select check
  uncheck press focus scroll`. Read verbs run free; write verbs are gated.
- **LIVE** — `debrief_session` / MCP `debrief`: deterministic summary +
  action items (top sites, time share, unfinished input, files, approval
  margin) from an in-memory session timeline.
- **DISTRIBUTE** — `skills/` + `AGENTS.md` (next doc section).

## Security policy (the guardrail IS the feature)

**Superseded in detail by ADR-012** (`docs/decisions/ADR-012-agent-trust-boundary.md`).
The short version: the `approved: true` flag described below is **gone**. It let
the agent approve itself, which made the boundary theatre. Writes now require a
*user-issued grant*, and every decision is audited in a tamper-evident chain.

Rights: reads free, writes need approval. Specifically:

- `agent-policy.js#decide` is the single decision point for every automated
  action, from both IPC and the loopback bridge. Three rules:
  1. **Reads are free** — `observe_tab`, `list_tabs`, `debrief_session`, searches.
  2. **Writes need a user-issued, action-bound, single-use grant.** The host
     queues the request, the chrome shows it, the user approves, and a grant
     bound to `fingerprint(op, params)` is minted. A grant for
     `click node 3.1 on tab-2` cannot be replayed as a `type` into a card field,
     and cannot be reused. There is **no flag that lets an agent approve itself**
     — a caller-supplied `approved` is ignored, and `auto: true` on a write is
     refused outright.
  3. **Page content is never a trusted actor** — `source: "page"` cannot write,
     and `sync_key_*` (credential material) plus `agent_approve` (grant minting)
     are **user-only**: an agent asking is refused, not queued.
- `agent-act.js#classify` still marks every mutating verb as **write** and
  validates node ids as index-paths only; the page can never supply a selector.
- Typed values and node ids are embedded as `JSON.stringify` string/number
  literals in the emitted expression (`agent-act.js#typeJs`/`#clickJs`) —
  no page-supplied snippets, ever.
- Every decision, allowed **or denied**, is appended to a hash chain
  (`audit-log.js`, `agent-audit-log-<profile>.jsonl`). Entry N commits to the
  hash of entry N-1, so editing or deleting a line breaks every hash after it
  and `verify()` names the first bad `seq`. Query strings are stripped from
  logged URLs and secret fields are redacted before hashing. Verify + export from
  **Managers → Agent audit**, the `audit_log_export` IPC op, or MCP
  `audit_log`.
- Observed strings are capped/trimmed in `ax-tree.js` (MAX_NODES 400,
  MAX_STRING 120, MAX_TEXT 4000) before they reach an agent.

## Bridge (loopback HTTP, token)

- `main.js#startAgentBridge` binds **only `127.0.0.1`**, random port, per-boot
  random token (== auth), and writes `agent-bridge.json` (port + token) next
  to `userData` and under `~/.continua/`. `POST /rpc` requires
  `Authorization: Bearer <token>`.
- **The token file is owner-only**: written with mode `0600`, `chmod`ed, and on
  Windows stripped of inheritance via `icacls /inheritance:r` so other local
  users cannot read it. A fixed-window rate limit (600 calls/min per IP) bounds
  a token holder. Previously the file was world-readable and unmetered, so any
  local process could both read the token and self-approve writes.
- No remote call can reach it (loopback bind, no DNS names).
- The bridge exposes **no** approve/deny method: a token holder is a reader by
  default, not an authoriser.

## MCP server (dependency-free)

`mcp-browser.mjs` implements the stdio JSON-RPC 2.0 MCP surface with only Node
stdlib — the `@modelcontextprotocol` SDK is **not installed** in this repo
(verify with `ls node_modules/@modelcontextprotocol 2>/dev/null` → empty), so
this server must not import it. Tools: `see_tab`, `act_tab`, `debrief`,
`list_tabs`, `pending_approvals`, `audit_log`. `act_tab` takes a `grant`
object from a previous `needsApproval` response — never an `approved` flag.

Run with any stdio MCP client; the root `mcp.mjs` is a *different*, older OS
bridge (socket.io to the browser OS) and is unrelated.

## Session timeline (what feeds debrief)

The host appends to an in-memory, capped ring (`agentTimeline`, 4000 entries,
trimmed to 3000) — never persisted, cleared with `agent_timeline_clear`:

- `visit` — every `observe_tab` call (url + tab label),
- `activate` — every `activate()` tab switch (url + label),
- `interact` — read-class acts (`focus`, `scroll`),
- `write` — `click`/`type` executions, tagged with the approval outcome,
- `download` — completed downloads from `will-download` (name + source url).

`debrief_session` runs `debrief.js#summarize` + `#actionItems` + `#headline`
over this ring — deterministic, no LLM.

## Ops reference (code-ahead-of-docs catch-up)

- `see_visual {label?, maxWidth?, maxHeight?, maxBytes?, quality?}` — tab
  pixels (free read, bounded, audited). Returns `{tab, dataUrl|buffer ref,
  capturedAt}` or `{error: "no-tab"}`.
- `see_chrome {…same budgets}` — chrome-window pixels (free read, audited).
  Use for rail/overlay/toolbar truth, not page content.
- `click_at {x, y, target: "page"|"chrome"}` / `type_at {x, y, value, target}` —
  vision-driven writes. Points are validated against the named viewport and
  refused when outside (never clamped). Gated + fingerprinted like any write;
  `type_at` without a grant queues approval; replayed grants get `grant-spent`.
- `layout_state {}` — read-only host truth: `{sig, modalHidden, chromeH,
  railW, focused, tabs[]}`. Use when overlays/rails disagree with pixels.
- `pending_approvals {}` / `audit_log {}` — poll the queue; export/verify the
  chain. Full policy + log format: `docs/AGENT_TRUST_SPEC.md`.

## Tests

`ax-tree.test.js`, `agent-act.test.js`, `debrief.test.js` (Node test runner,
part of the 115-passing suite). Load-bearing assertions: snapshot caps +
truncation flags, path-id validation, write-gating, the approved+auto refusal
(page content can never accredit itself), and JSON-literal embedding of typed
values.

## Launch + smoke test (verified 2026-09-24)

Dev launch on the laptop: `electron .` from `apps/desktop-electron/` (system
Electron 44; no workspace `node_modules` needed — `main.js` only requires
Electron + local modules, everything else is lazy with JSON fallbacks). The
chrome loads from `apps/desktop/dist` (rebuild with `npm -w apps/desktop run
build` after UI changes).

Health signals: `[continua] chrome did-finish-load` in stderr,
`~/.continua/agent-bridge.json` appears with `{port, token}`, then:

```bash
node apps/desktop-electron/mcp-browser.mjs   # stdio MCP: initialize → tools/list
```

Low-memory note: on a ~3 GB box the session-restore burst (several heavy tabs
at once, software compositing) can OOM the process with no log trace. If the
window dies silently in the first minute, relaunch and let it settle — the
tab pool (`POOL_K=3` under 5 GB, 30 s discard) sheds background tabs, after
which it runs stable. Check with `ps` + the `[launcher] exit=` trap line.

## Chromium surface

Palette exposes read-only agent affordances: "Detect page language",
"Translate this page", "Read-aloud". Approval for agent writes is surfaced out
of band (MCP) today; an in-chrome prompt is a future enhancement.

## Not taken

- Auto-approvals, auto-submit, autonomous clicks on login forms.
- LLM-in-the-loop inside the browser (debrief is deterministic; agents may
  rephrase).
- Non-loopback exposure, HTTPS not required (loopback-only), no auth-less
  paths.