/**
 * Pool victim selection — pure logic, unit-tested (no Electron imports).
 * LRU over live views: discard oldest-idle first when over K or over RSS
 * budget. Never victimizes the focused tab.
 *
 * @param entries Array<[label, {discarded, view, lastActive}]>
 *   (`view` truthy = live renderer; falsy counts as already discarded)
 * @returns labels to discard, oldest-idle first
 */
function pickVictims(entries, focused, opts = {}) {
  const {
    poolK = 6,
    rss = 0,
    rssBudget = 1.0 * 1024 * 1024 * 1024,
    discardAfterMs = 30 * 1000,
    now = Date.now(),
  } = opts;
  const live = entries.filter(
    ([lab, m]) => !m.discarded && m.view && lab !== focused && now - m.lastActive > discardAfterMs,
  );
  live.sort((a, b) => a[1].lastActive - b[1].lastActive);
  const liveCount = entries.filter(([, m]) => !m.discarded && m.view).length;
  const over = liveCount - poolK;
  const want = Math.max(over > 0 ? over : 0, rss >= rssBudget ? live.length : 0);
  return live.slice(0, want).map(([lab]) => lab);
}

/**
 * Back/forward stack update for one committed navigation — pure logic,
 * unit-tested (no Electron imports).
 *
 * did-navigate / did-navigate-in-page is ground truth for what the view is
 * showing: host metadata must follow it. In particular a committed URL that
 * matches neither the pending programmatic target nor a redirect chain
 * (client-side redirect, or a stale pending flag whose load died) must be
 * recorded as a NEW entry — dropping it desyncs meta.url from the history
 * stack, and a later discard+rehydrate resurrects the stale entry (the
 * "leave a tab, come back, it's back to search" report).
 *
 * @param history current stack, idx current position
 * @param url committed URL (already filtered: no interstitials/internals)
 * @param flags {expectNav, inPage, redirected} — pending programmatic target,
 *   whether this is a same-document nav, whether will-redirect fired recently
 * @returns {history, idx, mode} — new stack/position (inputs never mutated);
 *   mode is "match" | "redirect" | "inpage" | "append" | "same"
 */
function applyNavEntry(history, idx, url, flags = {}) {
  const { expectNav = null, inPage = false, redirected = false } = flags;
  const hist = Array.isArray(history) ? history.slice() : [];
  let i = Math.max(0, Math.min(idx || 0, Math.max(0, hist.length - 1)));
  if (expectNav) {
    if (expectNav === url || inPage) {
      hist[i] = url;
      return { history: hist, idx: i, mode: inPage && expectNav !== url ? "inpage" : "match" };
    }
    if (!inPage && redirected) {
      hist[i] = url;
      return { history: hist, idx: i, mode: "redirect" };
    }
    // Unexpected top-level commit: record it, don't drop it (see above).
    const next = hist.slice(0, i + 1).concat(url);
    return { history: next, idx: i + 1, mode: "append" };
  }
  if (hist[i] !== url) {
    return { history: hist.slice(0, i + 1).concat(url), idx: i + 1, mode: "append" };
  }
  return { history: hist, idx: i, mode: "same" };
}

module.exports = { pickVictims, applyNavEntry };
