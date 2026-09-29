/**
 * Continuity sync helpers — pure logic, unit-tested (no Electron imports).
 * Domain save collapses the live tab graph to one versioned record (the
 * server merges via vector clocks); pull merges remote tabs without
 * duplicating local URLs and never destructively replaces.
 */
function buildSavePayload(tabs, focused, deviceId, version, workspaces, groups, profileId, themeId, extra) {
  const live = [...tabs.entries()]
    .filter(([, m]) => !m.incognito)
    .map(([lab, m]) => ({ label: lab, url: m.url, title: m.title, pinned: !!m.pinned, group: m.group || null, container: m.container || null }));
  // Per-profile domain so Work and Personal merge independently server-side.
  const pid = profileId || "personal";
  const payload = { domain: `browser-profile-${pid}`, data: { tabs: live, active: focused, profileId: pid }, version, deviceId };
  if (themeId) payload.data.themeId = themeId;
  if (Array.isArray(workspaces)) payload.data.workspaces = workspaces;
  if (Array.isArray(groups)) payload.data.groups = groups;
  // Container registry (ids + names + colors merge by id, like groups).
  if (extra && Array.isArray(extra.containers) && extra.containers.length) payload.data.containers = extra.containers;
  // E2E-encrypted logins envelope (ciphertext only — the server cannot read it).
  if (extra && extra.loginsEnc && typeof extra.loginsEnc === "object") payload.data.loginsEnc = extra.loginsEnc;
  // "Send to device" outbox + seen ids (same merge convention as tabs).
  if (extra && Array.isArray(extra.tabdrops) && extra.tabdrops.length) payload.data.tabdrops = extra.tabdrops;
  if (extra && Array.isArray(extra.tabdropSeen) && extra.tabdropSeen.length) payload.data.tabdropSeen = extra.tabdropSeen;
  return payload;
}

function mergeRemoteTabs(localTabs, remoteTabs) {
  const have = new Set([...localTabs.values()].map((t) => t.url));
  const out = [];
  for (const t of remoteTabs || []) {
    if (!t?.url || have.has(t.url)) continue;
    have.add(t.url);
    out.push({ url: t.url, title: t.title || t.url, group: t.group || null, container: t.container || null });
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

/**
 * Adopt incoming "send to device" drops: unseen, well-formed http(s) drops
 * only, capped. Seen ids are tracked by the caller (persisted) so each drop
 * opens exactly once even across repeated pulls.
 */
function mergeTabdrops(seenIds, remoteDrops, maxAgeMs = 24 * 60 * 60 * 1000, now = Date.now()) {
  const seen = new Set(Array.isArray(seenIds) ? seenIds : []);
  const out = [];
  for (const d of Array.isArray(remoteDrops) ? remoteDrops : []) {
    if (!d || typeof d.id !== "string" || !d.id || seen.has(d.id)) continue;
    if (typeof d.url !== "string" || !/^https?:\/\//i.test(d.url)) continue;
    if (typeof d.at !== "number" || now - d.at > maxAgeMs) continue;
    seen.add(d.id);
    out.push({ id: d.id, url: d.url, title: typeof d.title === "string" ? d.title : d.url, from: typeof d.from === "string" ? d.from : null, at: d.at });
    if (out.length >= 20) break;
  }
  return out;
}

module.exports = { buildSavePayload, mergeRemoteTabs, mergeRemoteWorkspaces, mergeTabdrops };
