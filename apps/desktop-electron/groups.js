/**
 * Local tab intelligence — auto-cluster engine (ADR-010).
 *
 * Pure logic, unit-tested, zero network: groups are suggested from URL +
 * title signals only. No cloud AI, no embeddings, no data leaves the
 * machine — the deliberate inverse of Comet/Dia-style assistants.
 *
 * Rules (conservative on purpose — Chrome's forced auto-grouping taught us
 * that wrong guesses annoy more than no guesses):
 *   1. Same registrable domain with 2+ tabs → one group ("github.com · 3").
 *   2. Different subdomains of one domain (docs/mail/drive) merge upward.
 *   3. Title-keyword overlap links cross-domain research clusters
 *      (needs 2+ shared rare words, min group size 2).
 *   4. Singletons are never suggested. Incognito never clustered.
 */

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Naive registrable domain: last two labels (handles co.uk-style via 3-label rule). */
function domainOf(url) {
  const host = hostOf(url);
  if (!host) return "";
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  const tld2 = parts.slice(-2).join(".");
  // Common two-part public suffixes — merge one more label up.
  if (/^(co|com|org|net|gov|edu|ac|io)\.[a-z]{2}$/.test(tld2) || tld2.endsWith(".co.uk") || tld2.endsWith(".com.au")) {
    return parts.slice(-3).join(".");
  }
  return tld2;
}

const STOP = new Set("the,a,an,and,or,of,to,in,on,for,with,vs,by,at,from,is,are,how,what,why,new,best,top,home,page,docs,app,dashboard,login,search".split(","));

function keywords(title) {
  return (title || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
}

/**
 * @param tabs [{label, url, title, incognito?}]
 * @returns [{key, name, labels, reason}] — suggested groups, size >= 2.
 */
function suggestGroups(tabs) {
  const live = (tabs || []).filter((t) => t && t.url && !t.incognito && /^https?:\/\//i.test(t.url));
  const out = [];
  const claimed = new Set();

  // Pass 1: same registrable domain.
  const byDomain = new Map();
  for (const t of live) {
    const d = domainOf(t.url);
    if (!d) continue;
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push(t);
  }
  for (const [d, members] of byDomain) {
    if (members.length >= 2) {
      out.push({ key: `domain:${d}`, name: `${d} · ${members.length}`, labels: members.map((t) => t.label), reason: "same-site" });
      members.forEach((t) => claimed.add(t.label));
    }
  }

  // Pass 2: title-keyword overlap over the unclaimed remainder.
  const rest = live.filter((t) => !claimed.has(t.label));
  const wordOwners = new Map();
  for (const t of rest) {
    for (const w of new Set(keywords(t.title))) {
      if (!wordOwners.has(w)) wordOwners.set(w, []);
      wordOwners.get(w).push(t.label);
    }
  }
  const pairScore = new Map(); // "a|b" -> shared-word count
  for (const labels of wordOwners.values()) {
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const k = [labels[i], labels[j]].sort().join("|");
        pairScore.set(k, (pairScore.get(k) || 0) + 1);
      }
    }
  }
  // Greedy: strongest pairs first, each tab claimed once.
  const pairs = [...pairScore.entries()].filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]);
  const taken = new Set();
  for (const [k, n] of pairs) {
    const [a, b] = k.split("|");
    if (taken.has(a) || taken.has(b)) continue;
    taken.add(a); taken.add(b);
    const label = (l) => (live.find((t) => t.label === l)?.title || l).slice(0, 28);
    out.push({ key: `topic:${k}`, name: `${label(a)} + ${label(b)}`, labels: [a, b], reason: `shared-topic(${n})` });
  }
  return out;
}

/** Exact-duplicate tabs (same normalized URL) — offer to close extras. */
function findDuplicates(tabs) {
  const seen = new Map();
  const dups = [];
  for (const t of tabs || []) {
    if (!t || !t.url || t.incognito) continue;
    let norm = t.url;
    try {
      const u = new URL(t.url);
      norm = u.origin + u.pathname.replace(/\/$/, "");
    } catch { /* keep raw */ }
    if (seen.has(norm)) dups.push({ url: t.url, keep: seen.get(norm), close: t.label });
    else seen.set(norm, t.label);
  }
  return dups;
}

module.exports = { suggestGroups, findDuplicates, domainOf };
