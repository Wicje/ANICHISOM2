/**
 * debrief.js — session debrief heuristics for the agent "live" loop.
 *
 * Pure logic, unit-tested. Consumes a session timeline (host-collected:
 * navigations, interactions, downloads, approval decisions) and produces a
 * plain, readable debrief the agent can cite in memory: top sites, time
 * distribution, unfinished input, files, and approval margins.
 *
 * No LLM here — everything is deterministic bookkeeping; the agent (or an
 * external MCP client) is free to rephrase it later.
 */

const HOSTS = (u) => {
  try { return new URL(u).hostname.replace(/^www\./i, ""); } catch { return "(direct)"; }
};

/** Trim a timeline to essentials and compute aggregates. */
function summarize(events, opts = {}) {
  const ev = Array.isArray(events) ? events : [];
  const siteTime = {};
  const visits = {};
  let interact = 0;
  let downloads = 0;
  let writes = 0;
  let approved = 0;
  for (const e of ev) {
    switch (e.type) {
      case "visit": {
        const h = HOSTS(e.url);
        visits[h] = (visits[h] || 0) + 1;
        // Presence floor so headline/time distribution works without
        // duration instrumentation: every visit counts as ≥1ms.
        siteTime[h] = (siteTime[h] || 0) + Math.max(1, Number(e.ms) || 0);
        break;
      }
      case "activate": {
        const h = HOSTS(e.url);
        const dur = Number(e.ms) || 0;
        siteTime[h] = (siteTime[h] || 0) + dur;
        break;
      }
      case "interact": interact++; break;
      case "download": downloads++; break;
      case "write": {
        writes++;
        if (e.approved) approved++;
        break;
      }
      default: break;
    }
  }
  const totalMs = Object.keys(siteTime).length
    ? Object.values(siteTime).reduce((a, b) => a + b, 0) : 0;
  const top = Object.keys(siteTime)
    .sort((a, b) => (siteTime[b] || 0) - (siteTime[a] || 0))
    .slice(0, 5)
    .map((h) => ({ host: h, ms: siteTime[h], pct: totalMs ? Math.round((siteTime[h] / totalMs) * 100) : 0 }));

  return {
    sites: visits,
    top, totalMs,
    interactions: interact,
    downloads,
    writes, approvals: approved,
    unapprovedWrites: writes - approved,
  };
}

/**
 * Action-item heuristics from the timeline — things a session report should
 * call out so a future session can resume them.
 */
function actionItems(events, opts = {}) {
  const items = [];
  const typedFields = {};
  const ev = Array.isArray(events) ? events : [];
  for (const e of ev) {
    if (e.type === "type") {
      const host = HOSTS(e.url);
      const key = `${host}:${e.id || e.node}`;
      typedFields[key] = String(e.value || "").length;
    }
    if (e.type === "download") {
      items.push({ kind: "file", host: HOSTS(e.url), name: String(e.name || "unknown") });
    }
  }
  const unfinished = Object.keys(typedFields).filter((k) => typedFields[k] > 0);
  for (const k of unfinished.slice(0, 5)) {
    items.push({ kind: "unfinished-input", field: k });
  }
  if (opts.mode === "long") {
    // multi-session resume hints come from per-host last-visit ordering
    const order = [...new Set(ev.filter((e) => e.type === "visit").map((e) => HOSTS(e.url)))];
    items.push({ kind: "resume-order", hosts: order.slice(-5) });
  }
  return items;
}

/** Free-text one-liner for the top of an agent memory entry. */
function headline(sum) {
  const top = sum.top[0];
  const mins = Math.round((sum.totalMs || 0) / 60000);
  if (!top) return "No significant activity recorded yet.";
  const parts = [`${mins}m across ${sum.top.length} site(s)`, `top: ${top.host} (${top.pct}%)`];
  if (sum.writes) parts.push(`${sum.writes} write${sum.writes === 1 ? "" : "s"} (${sum.approvals}/${sum.writes} approved)`);
  if (sum.downloads) parts.push(`${sum.downloads} file(s)`);
  return parts.join(" · ");
}

module.exports = { summarize, actionItems, headline, HOSTS };