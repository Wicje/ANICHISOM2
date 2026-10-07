/**
 * agent-policy.js — the trust boundary decision engine (ADR-012).
 *
 * Pure logic, unit-testable, dependency-free (node crypto only). Every
 * automated page action passes through `decide()` before the host executes
 * anything. The rules are deliberately blunt:
 *
 *   1. Reads are free. An agent may look at anything, any time.
 *   2. Writes need a user-issued, action-bound, single-use grant.
 *      A caller-supplied `approved: true` is NOT an approval — otherwise the
 *      agent approves itself and the boundary is theatre.
 *   3. Page content is never a trusted actor. It cannot write, and it cannot
 *      approve: `auto`/`source:"page"` on a write is forbidden outright.
 *   4. Credential ops (sync key) are user-gated only. No agent path exists.
 *
 * Grants are bound to a fingerprint of (op + sanitized params), so approving
 * "click node 3.1 on tab 5" cannot be replayed as "type a credit card".
 */

const crypto = require("crypto");

const TIER_READ = "read";
const TIER_WRITE = "write";
const TIER_UNKNOWN = "unknown";

/** Automated reads: no approval, always allowed for agent/page sources. */
const READ_OPS = new Set([
  "list_tabs",
  "observe_tab",
  "debrief_session",
  "agent_timeline_clear",
  "read_page_text",
  "search_tabs",
  "search_bookmarks",
  "search_history",
  "list_closed",
  "audit_log_query",
  // Visual read: pixels of a tab the agent may already read semantically, so it
  // is a read — but bounded by `visual.js` (capped dimensions + byte budget).
  "see_visual",
  "see_chrome",
]);

/** Automated writes: require a user grant, bound to this exact action. */
const WRITE_OPS = new Set([
  "act_tab",
  "agent_act",
  "navigate",
  "navigate_tab",
  "open_tab",
  "open_incognito_tab",
  "reload_tab",
  "new_tab_url",
  "close_tab",
  "reopen_closed",
  "read_aloud",
  // Vision-driven input. A coordinate is a write like any other: it can hit a
  // "Buy" button, so it needs the same user grant as an AX-targeted click.
  "click_at",
  "type_at",
]);

/** Credential material: reachable from the user UI only. Never from an agent. */
const USER_GATED_OPS = new Set([
  "sync_key_status",
  "sync_key_create",
  "sync_key_show",
  "sync_key_import",
]);

/**
 * User-control ops: minting or refusing a write grant, and exporting the
 * audit chain. An agent must never be able to approve itself or rewrite the
 * evidence, so these are user-only even though they are not credential ops.
 */
const USER_CONTROL_OPS = new Set([
  "agent_approve",
  "agent_deny",
  "audit_log_export",
  "audit_log_verify",
]);

/** Ops only a human may invoke, for any reason. */
const USER_ONLY_OPS = new Set([...USER_GATED_OPS, ...USER_CONTROL_OPS]);

const REASON = {
  unknownOp: "unknown-op",
  userGatedOnly: "user-gated-op",
  pageCannotWrite: "page-content-cannot-write",
  autoBlocked: "auto-approval-blocked",
  grantMissing: "write-needs-grant",
  grantSpent: "grant-already-used",
  grantMismatch: "grant-does-not-match-action",
  ok: "allowed",
};

/** Classify an op name into read/write/unknown tier. */
function tierOf(op) {
  const name = String(op || "");
  if (READ_OPS.has(name)) return TIER_READ;
  if (WRITE_OPS.has(name) || USER_CONTROL_OPS.has(name)) return TIER_WRITE;
  return TIER_UNKNOWN;
}

/** True when an op is a credential op that only a human may invoke. */
function isUserGated(op) {
  return USER_GATED_OPS.has(String(op || ""));
}

/** True when only the user UI may invoke the op at all. */
function isUserOnly(op) {
  return USER_ONLY_OPS.has(String(op || ""));
}

/** Stable stringify: key order must not change the fingerprint. */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

/** Fields that must never enter a fingerprint or an audit entry verbatim. */
const SECRET_FIELDS = new Set([
  "token", "password", "passwd", "pwd", "value", "secret", "auth", "key",
  "credential", "cookie", "session", "card", "cvv", "cvc", "ssn", "otp",
  "mnemonic", "passphrase", "privatekey",
]);

/** Redact secret-bearing fields so grants/logs can be shared safely. */
function sanitize(params) {
  const out = {};
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined) continue;
    out[k] = SECRET_FIELDS.has(k) ? "[redacted]" : typeof v === "string" ? v.slice(0, 512) : v;
  }
  return out;
}

/**
 * Fingerprint an action. An approval is bound to exactly this op + params.
 * Secrets are redacted before hashing so a typed password cannot be replayed
 * by anyone who later reads the audit log — and so the fingerprint is stable
 * whether or not the caller redacted first.
 */
function fingerprint(op, params) {
  const raw = stableStringify({ op: String(op || ""), params: sanitize(params) });
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/** Mint a grant object. `nonce` keeps two identical actions distinguishable. */
function mintGrant(op, params, { nonce, actor = "user" } = {}) {
  return {
    id: crypto.randomBytes(8).toString("hex"),
    op: String(op || ""),
    fp: fingerprint(op, params),
    nonce: String(nonce || ""),
    actor,
    issuedAt: Date.now(),
  };
}

/**
 * Check a presented grant against the action being attempted.
 * @returns {{ok:boolean, reason?:string, spent?:boolean}}
 */
function verifyGrant(grant, op, params, { spent = false } = {}) {
  if (!grant || typeof grant !== "object") return { ok: false, reason: REASON.grantMissing };
  if (grant.op !== String(op || "")) return { ok: false, reason: REASON.grantMismatch };
  if (grant.fp !== fingerprint(op, params)) return { ok: false, reason: REASON.grantMismatch };
  if (spent) return { ok: false, reason: REASON.grantSpent, spent: true };
  return { ok: true };
}

/**
 * The single decision point. Returns what the host is allowed to do.
 *
 * @param {object} req
 * @param {string} req.op        operation name (bridge method or IPC op)
 * @param {string} [req.source]  "agent" (default) | "user" | "page"
 * @param {boolean} [req.auto]   caller asked for auto-approval
 * @param {object} [req.grant]   user-issued grant for this exact action
 * @param {boolean} [req.spent]  grant already consumed
 * @param {object} [req.params]  action params (for fingerprinting)
 * @returns {{allowed:boolean, tier:string, needsApproval:boolean, reason?:string,
 *            fingerprint?:string, granted?:boolean}}
 */
function decide(req = {}) {
  const op = String(req.op || "");
  const source = String(req.source || "agent");
  const params = req.params || {};
  const tier = tierOf(op);

  if (isUserOnly(op)) {
    // Only the user UI may reach these. An agent asking is always forbidden —
    // including approval minting, or the agent could approve itself.
    return source === "user"
      ? { allowed: true, tier, needsApproval: false, reason: REASON.ok }
      : { allowed: false, tier, needsApproval: false, reason: REASON.userGatedOnly };
  }
  if (tier === TIER_UNKNOWN) {
    return { allowed: false, tier, needsApproval: false, reason: REASON.unknownOp };
  }
  if (tier === TIER_READ) {
    return { allowed: true, tier, needsApproval: false, reason: REASON.ok };
  }
  // write tier
  if (source === "page") {
    return { allowed: false, tier, needsApproval: true, reason: REASON.pageCannotWrite };
  }
  if (req.auto) {
    return { allowed: false, tier, needsApproval: true, reason: REASON.autoBlocked };
  }
  const g = verifyGrant(req.grant, op, params, { spent: !!req.spent });
  if (!g.ok) {
    return {
      allowed: false,
      tier,
      needsApproval: true,
      reason: g.reason,
      fingerprint: fingerprint(op, params),
    };
  }
  return { allowed: true, tier, needsApproval: false, reason: REASON.ok, granted: true };
}

/** Plain-English phrasing for a consent prompt. No ids, no internal labels. */
const HUMAN_VERB = {
  click: "Click on this page",
  type: "Type into this page",
  select: "Choose an option on this page",
  check: "Tick a checkbox on this page",
  uncheck: "Untick a checkbox on this page",
  press: "Press a key on this page",
  focus: "Move focus on this page",
  scroll: "Scroll this page",
  "click_at": "Click a spot on this page",
  "type_at": "Type into a spot on this page",
};

const HUMAN_OP = {
  act_tab: "interact with this page",
  agent_act: "interact with this page",
  navigate: "navigate to another page",
  navigate_tab: "navigate this tab",
  open_tab: "open a new tab",
  open_incognito_tab: "open a private tab",
  reload_tab: "reload this tab",
  new_tab_url: "open a new tab",
  close_tab: "close a tab",
  reopen_closed: "reopen a closed tab",
  read_aloud: "read this page aloud",
};

/**
 * The line a human reads before deciding. Deliberately free of node ids and
 * internal tab labels: `click node 3.1 on tab tab-1791083548459-0` is noise that
 * trains people to click through prompts without reading them. The precise
 * action is still in the audit entry, where an investigator wants it.
 */
function humanize(op, params = {}) {
  const verb = String(params.verb || "").toLowerCase();
  const name = String(op || "");
  return HUMAN_VERB[verb] || HUMAN_VERB[name] || HUMAN_OP[name] || `run ${name || "an action"} on this page`;
}

/**
 * One-line summary for developer surfaces and the audit trail (precise).
 * @example "act_tab click node 3.1 (write)"
 */
function describe(op, params = {}) {
  const tier = tierOf(op);
  const bits = [String(op || "")];
  if (params.verb) bits.push(String(params.verb));
  if (params.id !== undefined && params.id !== null) bits.push(`node ${params.id}`);
  if (params.url) bits.push(String(params.url).slice(0, 120));
  if (params.label) bits.push(`tab ${params.label}`);
  return `${bits.join(" ")} (${tier})`;
}

module.exports = {
  TIER_READ,
  TIER_WRITE,
  TIER_UNKNOWN,
  READ_OPS,
  WRITE_OPS,
  USER_GATED_OPS,
  USER_CONTROL_OPS,
  USER_ONLY_OPS,
  REASON,
  tierOf,
  isUserGated,
  isUserOnly,
  stableStringify,
  sanitize,
  fingerprint,
  mintGrant,
  verifyGrant,
  decide,
  humanize,
  describe,
};