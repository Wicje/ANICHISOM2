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

module.exports = { pickVictims };
