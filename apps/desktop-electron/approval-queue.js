/**
 * approval-queue.js — per-profile queue of write requests awaiting a human.
 *
 * Two invariants this module exists to make enforceable (and testable) rather
 * than incidental:
 *
 *   1. **A profile boundary is real.** Requests and the grants they become are
 *      scoped per profile. A write an agent asked for in Work must never be
 *      approved from Personal, and a grant issued in Work must never be spent
 *      against a Personal tab. (ADR-012; the same family of bug as a container
 *      tab silently reopening in the default partition.)
 *   2. **Nothing waits forever.** Grants are in-memory, so a queued request
 *      that outlives a restart becomes a `requestId` an agent will poll
 *      forever. Requests expire, and expiry is an explicit answer rather than
 *      silence.
 *
 * Pure logic — no clock, no fs; the host injects `now`.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;

function createApprovalQueue(opts = {}) {
  const ttlMs = Number(opts.ttlMs) > 0 ? Number(opts.ttlMs) : DEFAULT_TTL_MS;
  /** profileId -> Map(requestId -> record) */
  const byProfile = new Map();

  const bucket = (profileId, create = false) => {
    const id = String(profileId || "personal");
    if (!byProfile.has(id) && create) byProfile.set(id, new Map());
    return byProfile.get(id);
  };

  function expired(rec, now) {
    return !!rec && rec.expiresAt <= now;
  }

  /**
   * Queue a request for a profile. Returns the stored record.
   * The caller supplies the id so the host can return it to the agent that
   * asked, and so the queue stays a pure data structure.
   *
   * Expiry is measured from insertion (`now`), never from the caller-supplied
   * `ts`: `ts` is a recorded timestamp used for ordering, and trusting it for
   * a security-relevant deadline would let a stale value expire a live request
   * (or a forged one live).
   */
  function add(rec, now = Date.now()) {
    const profileId = String(rec.profileId || "personal");
    const store = bucket(profileId, true);
    const full = {
      id: String(rec.id),
      profileId,
      op: String(rec.op || ""),
      params: rec.params || {},
      tab: rec.tab === undefined ? null : rec.tab,
      url: rec.url === undefined ? null : rec.url,
      fingerprint: String(rec.fingerprint || ""),
      describe: String(rec.describe || ""),
      ts: Number(rec.ts) || now,
      queuedAt: now,
      expiresAt: now + ttlMs,
    };
    store.set(full.id, full);
    return full;
  }

  /** Live requests for one profile, oldest first. Expired ones are dropped. */
  function list(profileId, now = Date.now()) {
    const store = bucket(profileId);
    if (!store) return [];
    const out = [];
    for (const [id, rec] of store) {
      if (expired(rec, now)) store.delete(id);
      else out.push(rec);
    }
    return out.sort((a, b) => a.ts - b.ts);
  }

  /**
   * Remove and return a request. Only ever looks inside `profileId`, so a
   * request raised in one profile cannot be answered from another.
   * @returns {{ok:true, request:object} | {ok:false, reason:string}}
   */
  function take(profileId, requestId, now = Date.now()) {
    const store = bucket(profileId);
    if (!store) return { ok: false, reason: "no-such-request" };
    const rec = store.get(String(requestId));
    if (!rec) return { ok: false, reason: "no-such-request" };
    store.delete(rec.id);
    if (expired(rec, now)) return { ok: false, reason: "request-expired" };
    return { ok: true, request: rec };
  }

  /** Look up without removing (used for audit attribution). */
  function peek(profileId, requestId) {
    const rec = bucket(profileId)?.get(String(requestId));
    return rec || null;
  }

  /** Drop expired records everywhere. Returns how many went. */
  function prune(now = Date.now()) {
    let n = 0;
    for (const store of byProfile.values()) {
      for (const [id, rec] of store) if (expired(rec, now)) { store.delete(id); n += 1; }
    }
    return n;
  }

  /** Total live requests across all profiles. */
  function size(now = Date.now()) {
    let n = 0;
    for (const pid of byProfile.keys()) n += list(pid, now).length;
    return n;
  }

  return { add, list, take, peek, prune, size, get profiles() { return [...byProfile.keys()]; } };
}

module.exports = { createApprovalQueue, DEFAULT_TTL_MS };