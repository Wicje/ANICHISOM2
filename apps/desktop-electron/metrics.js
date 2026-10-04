/**
 * metrics.js — the two numbers that decide whether Continua is a real product.
 *
 * Feature count is not a signal. These are:
 *   - sessionsRestored: days on which a session came back to life (history,
 *     scroll, zoom, containers) — the continuity promise, measured.
 *   - agent writes / denied: whether the trust boundary is being used and
 *     whether the agent is behaving (a high denial rate means a bad agent).
 *
 * Counters are bucketed by local day (YYYY-MM-DD), kept in one config key so
 * they ride along with the existing profile store, and capped so the key can
 * never grow without bound. Pure logic — no clock, no fs; the host injects
 * `now`.
 */

const DEFAULT_DAYS = 30;

function dayKey(ts) {
  const d = new Date(Number(ts) || 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function empty() {
  return { sessions_restored: {}, agent_reads: {}, agent_writes: {}, agent_denied: {}, tabs_opened: {} };
}

/** True only for a real calendar day — "2026-13-99" is not a day. */
function isDayKey(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ""));
  if (!m) return false;
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return dt.getFullYear() === Number(y) && dt.getMonth() === Number(mo) - 1 && dt.getDate() === Number(d);
}

function sanitize(raw) {
  const base = empty();
  if (!raw || typeof raw !== "object") return base;
  for (const k of Object.keys(base)) {
    const src = raw[k];
    if (src && typeof src === "object" && !Array.isArray(src)) {
      for (const [day, n] of Object.entries(src)) {
        if (isDayKey(day) && Number.isFinite(Number(n))) base[k][day] = Number(n);
      }
    }
  }
  return base;
}

/** Drop days outside the retention window so the blob stays small. */
function prune(counters, days, nowTs) {
  const keep = new Set();
  for (let i = 0; i < days; i++) keep.add(dayKey(nowTs - i * 86400000));
  for (const k of Object.keys(counters)) {
    for (const day of Object.keys(counters[k])) {
      if (!keep.has(day)) delete counters[k][day];
    }
  }
  return counters;
}

/** Increment one counter for the day of `nowTs`. Returns the new value. */
function bump(counters, key, nowTs, by = 1) {
  const c = sanitize(counters);
  const day = dayKey(nowTs);
  c[key][day] = (c[key][day] || 0) + Number(by || 0);
  return c;
}

/**
 * Totals for the trailing window, plus per-day series for a sparkline and the
 * single headline number (sessions restored in the last `days` days).
 */
function summary(counters, { nowTs = 0, days = DEFAULT_DAYS } = {}) {
  const c = sanitize(counters);
  const win = Math.max(1, Number(days) || DEFAULT_DAYS);
  const inWindow = new Set();
  for (let i = 0; i < win; i++) inWindow.add(dayKey(nowTs - i * 86400000));
  // Totals respect the window; stale days outside it are ignored entirely.
  const sum = (k) => Object.entries(c[k] || {}).reduce((a, [day, n]) => (inWindow.has(day) ? a + n : a), 0);
  const series = [];
  for (let i = win - 1; i >= 0; i--) {
    const day = dayKey(nowTs - i * 86400000);
    series.push({
      day,
      sessionsRestored: c.sessions_restored[day] || 0,
      agentReads: c.agent_reads[day] || 0,
      agentWrites: c.agent_writes[day] || 0,
      agentDenied: c.agent_denied[day] || 0,
    });
  }
  const agentAttempts = sum("agent_writes") + sum("agent_denied");
  return {
    windowDays: win,
    sessionsRestored: sum("sessions_restored"),
    sessionsRestoredToday: c.sessions_restored[dayKey(nowTs)] || 0,
    tabsOpened: sum("tabs_opened"),
    agentReads: sum("agent_reads"),
    agentWrites: sum("agent_writes"),
    agentDenied: sum("agent_denied"),
    agentApprovalRate: agentAttempts ? Math.round((sum("agent_writes") / agentAttempts) * 100) : null,
    series,
  };
}

module.exports = { DEFAULT_DAYS, dayKey, isDayKey, empty, sanitize, prune, bump, summary };