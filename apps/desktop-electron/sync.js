/**
 * Continuity sync helpers — pure logic, unit-tested (no Electron imports).
 * Domain save collapses the live tab graph to one versioned record (the
 * server merges via vector clocks); pull merges remote tabs without
 * duplicating local URLs and never destructively replaces.
 */
function buildSavePayload(tabs, focused, deviceId, version) {
  const live = [...tabs.entries()]
    .filter(([, m]) => !m.incognito)
    .map(([lab, m]) => ({ label: lab, url: m.url, title: m.title, pinned: !!m.pinned }));
  return { domain: "browser", data: { tabs: live, active: focused }, version, deviceId };
}

function mergeRemoteTabs(localTabs, remoteTabs) {
  const have = new Set([...localTabs.values()].map((t) => t.url));
  const out = [];
  for (const t of remoteTabs || []) {
    if (!t?.url || have.has(t.url)) continue;
    have.add(t.url);
    out.push({ url: t.url, title: t.title || t.url });
  }
  return out;
}

module.exports = { buildSavePayload, mergeRemoteTabs };
