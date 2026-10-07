/**
 * grant-registry.js — host-issued, single-use write grants (ADR-012).
 *
 * The trust boundary fails if a grant is just data the caller asserts. An
 * earlier version verified only `grant.fp === fingerprint(op, params)`, and the
 * fingerprint is *public* — the agent reads it from `pending_approvals` in
 * order to poll. It could therefore mint its own approval and click.
 *
 * So a grant is only valid if this registry issued it. The caller may present
 * an id; the authoritative op + fingerprint are read back from host state and
 * the caller's copies are ignored. Consumption is recorded here too, which is
 * what makes a grant single-use across both IPC and the bridge.
 *
 * Pure logic, unit-tested, no clock/fs dependency beyond `now`.
 */

const Policy = require("./agent-policy");

const DEFAULT_TTL_MS = 5 * 60 * 1000; // a grant is a moment, not a session

function createGrantRegistry(opts = {}) {
  const ttlMs = Number(opts.ttlMs) > 0 ? Number(opts.ttlMs) : DEFAULT_TTL_MS;
  /** id -> { id, op, fp, actor, issuedAt, expiresAt, spent } */
  const grants = new Map();

  /** Drop expired entries. Cheap; called on every issue/resolve. */
  function evict(now) {
    for (const [id, g] of grants) if (g.expiresAt <= now) grants.delete(id);
  }

  /**
   * Issue a grant for an action the user just approved. The returned object is
   * what the caller may present later; the authority lives in the registry.
   */
  function issue({ op, params, actor = "user", nonce = "", now = Date.now() }) {
    evict(now);
    const grant = Policy.mintGrant(op, params, { nonce, actor });
    grants.set(grant.id, { ...grant, issuedAt: now, expiresAt: now + ttlMs, spent: false });
    return { id: grant.id, op: grant.op, fp: grant.fp };
  }

  /**
   * Resolve a presented grant id against the action being attempted.
   * The caller's `op`/`fp` fields are deliberately NOT trusted.
   * @returns {{ok:boolean, reason?:string, spent?:boolean, grant?:object}}
   */
  function resolve(presented, op, params, now = Date.now()) {
    evict(now);
    const id = presented && typeof presented === "object" ? presented.id : presented;
    if (!id) return { ok: false, reason: Policy.REASON.grantMissing };
    const held = grants.get(String(id));
    // Unknown id => the caller invented it. Fail exactly like a missing grant.
    if (!held) return { ok: false, reason: Policy.REASON.grantMissing };
    if (held.spent) return { ok: false, reason: Policy.REASON.grantSpent, spent: true };
    // Held authority, not caller claims: compare the registry's copy.
    const check = Policy.verifyGrant({ op: held.op, fp: held.fp }, op, params, { spent: false });
    if (!check.ok) return check;
    return { ok: true, grant: held };
  }

  /** Consume a grant. Returns true only the first time. */
  function consume(id) {
    const held = grants.get(String(id));
    if (!held || held.spent) return false;
    held.spent = true;
    return true;
  }

  /**
   * Resolve AND consume in one synchronous step. `resolve()` then `consume()`
   * as two calls has a check-then-act race: two concurrent actions presenting
   * the same grant both see spent:false before either consumes. The gate must
   * use this — never resolve-then-consume across an await.
   * @returns same shape as resolve(), with spent grants reported spent
   */
  function resolveAndConsume(presented, op, params, now = Date.now()) {
    evict(now);
    const id = presented && typeof presented === "object" ? presented.id : presented;
    if (!id) return { ok: false, reason: Policy.REASON.grantMissing };
    const held = grants.get(String(id));
    if (!held) return { ok: false, reason: Policy.REASON.grantMissing };
    if (held.spent) return { ok: false, reason: Policy.REASON.grantSpent, spent: true };
    const check = Policy.verifyGrant({ op: held.op, fp: held.fp }, op, params, { spent: false });
    if (!check.ok) return check;
    held.spent = true;
    return { ok: true, grant: held };
  }

  return {
    issue,
    resolve,
    consume,
    resolveAndConsume,
    get size() { return grants.size; },
    has: (id) => grants.has(String(id)),
  };
}

module.exports = { createGrantRegistry, DEFAULT_TTL_MS };