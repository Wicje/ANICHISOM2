/**
 * Continuity sync helpers — pure logic, unit-tested (no Electron imports).
 * Domain save collapses the live tab graph to one versioned record (the
 * server merges via vector clocks); pull merges remote tabs without
 * duplicating local URLs and never destructively replaces.
 */
function buildSavePayload(tabs, focused, deviceId, version, workspaces, groups, profileId, themeId) {
  const live = [...tabs.entries()]
    .filter(([, m]) => !m.incognito)
    .map(([lab, m]) => ({ label: lab, url: m.url, title: m.title, pinned: !!m.pinned, group: m.group || null }));
  // Per-profile domain so Work and Personal merge independently server-side.
  const pid = profileId || "personal";
  const payload = { domain: `browser-profile-${pid}`, data: { tabs: live, active: focused, profileId: pid }, version, deviceId };
  if (themeId) payload.data.themeId = themeId;
  if (Array.isArray(workspaces)) payload.data.workspaces = workspaces;
  if (Array.isArray(groups)) payload.data.groups = groups;
  return payload;
}

function mergeRemoteTabs(localTabs, remoteTabs) {
  const have = new Set([...localTabs.values()].map((t) => t.url));
  const out = [];
  for (const t of remoteTabs || []) {
    if (!t?.url || have.has(t.url)) continue;
    have.add(t.url);
    out.push({ url: t.url, title: t.title || t.url, group: t.group || null });
  }
  return out;
}

/** Union remote workspaces (by name) into local ones. Returns names added. */
function mergeRemoteWorkspaces(localNames, remoteWorkspaces) {
  const have = new Set(localNames);
  const added = [];
  for (const w of remoteWorkspaces || []) {
    const name = w?.name || w?.id;
    if (!name || have.has(name) || !Array.isArray(w.tabs)) continue;
    have.add(name);
    added.push({ name, tabs: w.tabs });
  }
  return added;
}

module.exports = { buildSavePayload, mergeRemoteTabs, mergeRemoteWorkspaces };
