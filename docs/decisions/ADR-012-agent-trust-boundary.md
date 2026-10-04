# ADR-012 — The agent trust boundary is the product, and it is auditable

- Status: accepted
- Date: 2026-10-04
- Supersedes: nothing. Narrows the agent-track posture in `AGENTS.md` and
  `docs/AGENT_TRACK.md`, which described approvals but left the approving
  party ambiguous.

## Context

Every agentic browser shipping in 2026 gives its agent ambient authority over
the session: Comet, Dia, Neon and the Chrome/Edge agent modes all let the model
click, type and submit with whatever permission the product grants up front.
That is the biggest unsolved problem in the category. The browser is the
highest-value attack surface on a user's machine, and no incumbent has built a
trust boundary into it — partly because ambient authority maximises the
engagement and training signal they are optimised for.

Continua already had the right instinct (`AGENTS.md`: "reads free, writes need
approval; page text can never auto-approve"). The implementation did not match
the intent:

- `act_tab`/`agent_act` accepted a caller-supplied `approved: true`. The
  *caller* was the agent. So the agent approved itself and the boundary was
  theatre — a flag, not a control.
- Any local process that could read `agent-bridge.json` (written with default
  permissions, no ACL tightening) inherited that self-approval plus the token.
- Every agent action went into `agentTimeline`, an in-memory array used for
  the debrief. It was a feature log, not evidence: it could be edited, dropped,
  and it did not distinguish a denial from a success. There was no way to ask
  "what did the agent do, and who approved it" after the fact.

## Decision

Three rules, enforced in one place (`agent-policy.js`), with an evidence trail
(`audit-log.js`).

1. **Reads are free.** An agent may observe any tab, any time.
2. **Writes require a user-issued, action-bound, single-use grant.** The host
   computes an `fingerprint(op, params)`; the user approves a *queued request*
   in the chrome; approval mints a grant bound to that fingerprint, consumed on
   first use. A grant for `click node 3.1 on tab-2` cannot be replayed as
   `type` into a credit-card field, and cannot be reused.
   `approved: true` from any agent is **ignored**. There is no flag that lets an
   agent approve itself.
3. **Page content is never a trusted actor.** `source: "page"` cannot write,
   `auto: true` on a write is refused outright, and credential ops
   (`sync_key_*`) plus approval minting (`agent_approve`) are user-only — an
   agent asking for them is refused, not queued.

Everything the host considers — allowed *or* denied — is appended to an
append-only **hash-chained** JSONL log (`agent-audit-log-<profile>.jsonl`,
per profile, never crossing profiles). Entry N commits to the hash of entry
N-1, so editing or deleting a line invalidates every hash after it, and
`verify()` reports the first broken `seq`. Query strings are stripped from
logged URLs and secret-bearing fields are redacted before hashing, so a typed
password neither lands in the log nor becomes a replayable fingerprint.

## Consequences

**Gained**

- The security claim is now true instead of aspirational, and *checkable*: a
  user or an auditor can export the chain and verify it offline
  (`Managers → Agent audit`, or `audit_log_export`).
- This is a defensible moat rather than a feature. An enterprise buyer can
  adopt "every automated page action is logged, chained, and required a named
  human approval" — something Google and Microsoft cannot ship without
  cannibalising their engagement metrics.
- Distribution through AI agents: an MCP client can recommend Continua *because*
  the boundary exists. That is the only growing browser channel, and it points
  here.
- Denials are now a product signal. A high denial rate means a bad agent, and
  it is visible instead of silent.

**Costs, accepted**

- More friction for autonomous flows. An agent cannot complete a multi-step
  write without a human in the loop. That is the intended trade and the whole
  positioning; if we ever want "unattended agent mode", it must ship as a
  separate, loud, per-profile opt-in that writes to the same chain — never as a
  default.
- One more moving part between the agent and the page. The queue/grant protocol
  is four IPC ops and must stay in sync on both sides of the bridge (it is).
- Log growth. Capped at 5000 entries per profile; note that trimming the head
  makes `verify()` report a break at the first retained entry, which is honest
  (the window is what verifies) but must be explained in any export.

**Rejected**

- *Trust-the-flag* (the old behaviour): the agent approves itself.
- *Capability tokens minted by the agent* for the same reason.
- *Ambient permission prompts once per session* (the incumbent pattern): it
  degrades into blanket consent, which is what we are positioning against.
- *Logging without chaining*: an append-only log that can be silently rewritten
  proves nothing to an auditor.

## What this makes true that was not

- `docs/AGENT_TRACK.md` can now say "the agent cannot approve itself" — because
  it cannot, and there is a test for it
  (`agent-policy.test.js`: "approved:true from the caller is NOT an approval").
- The bridge token file is owner-only (`0600`, plus `icacls` inheritance removal
  on Windows) and the bridge is rate-limited, because a token holder is now a
  *reader* by default rather than an authoriser.
- The number that matters is measurable: sessions restored per day
  (`metrics.js`), surfaced in `Managers → Agent audit`.