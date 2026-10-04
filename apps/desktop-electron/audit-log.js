/**
 * audit-log.js — tamper-evident record of every automated page action.
 *
 * The agent track's trust boundary is only credible if it can be *proved*
 * after the fact. Every decision (allowed or denied) is appended to an
 * append-only, hash-chained log: each entry commits to the previous entry's
 * hash, so editing or deleting a line invalidates every hash after it.
 * `verify()` walks the chain and reports the first broken seq.
 *
 * Storage is one JSONL file per profile, capped and rotated on size. Chain
 * state lives in memory + is rebuilt from the file on open, so the log
 * survives restarts and can be shipped to an auditor as-is.
 *
 * Pure logic is dependency-free (node crypto only); the file is optional so
 * the chain can be unit-tested in memory.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const GENESIS = "0".repeat(64);

/** Entry fields that participate in the hash. Order-independent via stable stringify. */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

/** Chain hash for an entry body committed to `prev`. */
function hashEntry(prev, body) {
  return crypto.createHash("sha256").update(`${prev}|${stableStringify(body)}`).digest("hex");
}

/** Truncate a URL for the log: origin + path, query string dropped. */
function scrubUrl(url) {
  const s = String(url || "");
  if (!/^https?:/i.test(s)) return s.slice(0, 256);
  try {
    const u = new URL(s);
    return `${u.origin}${u.pathname}`;
  } catch {
    return s.slice(0, 256);
  }
}

/**
 * Build the canonical entry body. Only these fields are hashed; anything else
 * on the input is ignored so callers can pass rich context safely.
 */
function bodyOf(entry) {
  return {
    ts: Number(entry.ts) || 0,
    actor: String(entry.actor || "agent"),
    op: String(entry.op || ""),
    tier: String(entry.tier || ""),
    allowed: !!entry.allowed,
    source: String(entry.source || "agent"),
    // Profile is provenance, added after v1. Older entries have no value and
    // stableStringify drops undefined keys, so pre-existing chains still verify.
    profile: entry.profile === undefined || entry.profile === null ? null : String(entry.profile),
    reason: entry.reason === undefined || entry.reason === null ? null : String(entry.reason),
    target: entry.target === undefined || entry.target === null ? null : scrubUrl(entry.target),
    tab: entry.tab === undefined || entry.tab === null ? null : String(entry.tab),
    fp: entry.fp === undefined || entry.fp === null ? null : String(entry.fp),
    grantId: entry.grantId === undefined || entry.grantId === null ? null : String(entry.grantId),
    summary: entry.summary === undefined || entry.summary === null ? null : String(entry.summary).slice(0, 300),
  };
}

/**
 * @param {string|null} file  JSONL path, or null for an in-memory chain
 * @param {{cap?:number}} [opts]
 */
function createAuditLog(file, opts = {}) {
  const cap = Number(opts.cap) || 5000;
  const flushMs = opts.flushMs === undefined ? 250 : Number(opts.flushMs);
  const entries = [];
  let seq = 0;
  let prev = GENESIS;
  let dirty = false;
  let timer = null;

  function load() {
    if (!file) return;
    let raw = "";
    try { raw = fs.readFileSync(file, "utf8"); } catch { return; }
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      let rec;
      try { rec = JSON.parse(t); } catch { break; } // truncated tail: stop, keep what parsed
      if (!rec || typeof rec !== "object") continue;
      entries.push(rec);
      seq = Math.max(seq, Number(rec.seq) || 0);
      prev = typeof rec.hash === "string" ? rec.hash : prev;
    }
  }

  function persist() {
    if (!file || !dirty) return;
    dirty = false;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const body = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
      // Write-then-rename: a crash mid-write must not leave a half-written
      // chain that looks like tampering.
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, body);
      try { fs.renameSync(tmp, file); } catch { fs.writeFileSync(file, body); }
    } catch { /* non-fatal: the in-memory chain still verifies */ }
  }

  /**
   * Append one decision. Returns the stored entry (with seq/hash/prev).
   * Writes are debounced to disk: the chain must survive a crash or a quit, but
   * a write per decision would make a burst of agent actions synchronous disk
   * I/O. `flush()` forces it (called on will-quit).
   * @param {object} entry see bodyOf() for the hashed fields
   */
  function append(entry) {
    const body = bodyOf(entry);
    seq += 1;
    const rec = { seq, prev, hash: hashEntry(prev, body), ...body };
    prev = rec.hash;
    entries.push(rec);
    if (entries.length > cap) entries.splice(0, entries.length - cap);
    dirty = true;
    schedule();
    return rec;
  }

  function schedule() {
    if (!file || timer) return;
    timer = setTimeout(() => { timer = null; persist(); }, flushMs);
    // Never hold the process open just to write the audit log.
    try { timer.unref?.(); } catch { /* not all platforms */ }
  }

  /**
   * Walk the chain. Returns the first seq whose stored hash does not match a
   * recomputation, or whose prev does not match its predecessor.
   * @returns {{ok:boolean, checked:number, brokenAt:number|null, head:string}}
   */
  function verify() {
    let p = GENESIS;
    for (const rec of entries) {
      if (rec.prev !== p) return { ok: false, checked: entries.length, brokenAt: rec.seq, head: p };
      const expect = hashEntry(p, bodyOf(rec));
      if (rec.hash !== expect) return { ok: false, checked: entries.length, brokenAt: rec.seq, head: p };
      p = rec.hash;
    }
    return { ok: true, checked: entries.length, brokenAt: null, head: p };
  }

  /** Newest-last copy of the chain. */
  function all() {
    return entries.slice();
  }

  /** The n most recent entries, newest last. */
  function tail(n) {
    return entries.slice(-(Number(n) || 50));
  }

  /** Filter the chain. */
  function filter(fn) {
    return entries.filter((e) => {
      try { return !!fn(e); } catch { return false; }
    });
  }

  /** The chain as a JSONL string — the artifact an auditor receives. */
  function exportJsonl() {
    return entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "");
  }

  /** Header block for an export: what this is, and whether it verifies. */
  function manifest() {
    const v = verify();
    return {
      product: "Continua",
      artifact: "agent-audit-log",
      version: 1,
      exportedAt: new Date().toISOString(),
      entryCount: entries.length,
      chainOk: v.ok,
      head: v.head,
      hash: "sha256",
      note: "Append-only hash chain. Entry N commits to the hash of entry N-1; any edit or deletion breaks every hash after it.",
    };
  }

  load();

  return {
    append,
    verify,
    all,
    tail,
    filter,
    exportJsonl,
    manifest,
    flush() { if (timer) { clearTimeout(timer); timer = null; } persist(); },
    get size() { return entries.length; },
    get head() { return prev; },
    get dirty() { return dirty; },
  };
}

/**
 * Aggregate a chain for the UI: how much the agent did, how much was denied,
 * and the approval rate. Denials are the interesting number — a high denial
 * rate means the agent is guessing, and it is the honest signal of a bad agent.
 */
function summarize(entries) {
  let reads = 0, writes = 0, denied = 0, granted = 0, forbidden = 0;
  const byOp = {};
  const byTab = {};
  for (const e of entries || []) {
    if (e.tier === "read") reads += 1;
    else if (e.tier === "write") writes += 1;
    if (!e.allowed) {
      denied += 1;
      if (e.reason === "page-content-cannot-write" || e.reason === "user-gated-op") forbidden += 1;
    } else if (e.grantId) granted += 1;
    if (e.op) byOp[e.op] = (byOp[e.op] || 0) + 1;
    if (e.tab) byTab[e.tab] = (byTab[e.tab] || 0) + 1;
  }
  const attempts = writes; // every write-class entry is an attempt: granted or denied
  return {
    total: (entries || []).length,
    reads,
    writes,
    denied,
    forbidden,
    granted,
    approvalRate: attempts ? Math.round((granted / attempts) * 100) : null,
    byOp,
    byTab,
  };
}

module.exports = { createAuditLog, summarize, hashEntry, bodyOf, stableStringify, scrubUrl, GENESIS };