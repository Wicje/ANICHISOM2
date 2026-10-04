const test = require("node:test");
const assert = require("node:assert");
const M = require("./metrics");

const DAY = 86400000;
const at = (daysAgo, hour = 12) => new Date(2026, 8, 20, hour, 0, 0).getTime() - daysAgo * DAY;

test("dayKey is local YYYY-MM-DD and zero-pads", () => {
  assert.equal(M.dayKey(new Date(2026, 0, 5).getTime()), "2026-01-05");
  assert.equal(M.dayKey(new Date(2026, 11, 31).getTime()), "2026-12-31");
});

test("bump increments a per-day counter", () => {
  let c = M.empty();
  c = M.bump(c, "sessions_restored", at(0));
  c = M.bump(c, "sessions_restored", at(0));
  c = M.bump(c, "sessions_restored", at(1));
  assert.equal(c.sessions_restored[M.dayKey(at(0))], 2);
  assert.equal(c.sessions_restored[M.dayKey(at(1))], 1);
});

test("bump on garbage input starts from a clean slate", () => {
  assert.deepEqual(M.sanitize(null), M.empty());
  assert.deepEqual(M.sanitize("nope"), M.empty());
  assert.deepEqual(M.sanitize({ sessions_restored: [1, 2] }), M.empty());
});

test("sanitize drops malformed days and non-numeric counts", () => {
  const c = M.sanitize({ sessions_restored: { "2026-13-99": 4, yesterday: 9, "2026-01-05": "7", "2026-01-06": "x" } });
  assert.deepEqual(c.sessions_restored, { "2026-01-05": 7 });
});

test("summary totals over the window and reports today", () => {
  let c = M.empty();
  c = M.bump(c, "sessions_restored", at(0));
  c = M.bump(c, "sessions_restored", at(3));
  c = M.bump(c, "agent_writes", at(0));
  c = M.bump(c, "agent_reads", at(0), 5);
  const s = M.summary(c, { nowTs: at(0), days: 30 });
  assert.equal(s.sessionsRestored, 2);
  assert.equal(s.sessionsRestoredToday, 1);
  assert.equal(s.agentReads, 5);
  assert.equal(s.agentWrites, 1);
});

test("summary counts only inside the window", () => {
  let c = M.empty();
  c = M.bump(c, "sessions_restored", at(0));
  c = M.bump(c, "sessions_restored", at(40));
  assert.equal(M.summary(c, { nowTs: at(0), days: 30 }).sessionsRestored, 1);
  assert.equal(M.summary(c, { nowTs: at(0), days: 90 }).sessionsRestored, 2);
});

test("approval rate is writes over attempts, null when idle", () => {
  let c = M.empty();
  assert.equal(M.summary(c, { nowTs: at(0) }).agentApprovalRate, null);
  c = M.bump(c, "agent_writes", at(0), 3);
  c = M.bump(c, "agent_denied", at(0), 1);
  assert.equal(M.summary(c, { nowTs: at(0) }).agentApprovalRate, 75);
});

test("series is oldest-first, one row per day, ending today", () => {
  const s = M.summary(M.empty(), { nowTs: at(0), days: 7 });
  assert.equal(s.series.length, 7);
  assert.equal(s.series[6].day, M.dayKey(at(0)));
  assert.ok(s.series[0].day < s.series[6].day);
  assert.equal(s.series[6].sessionsRestored, 0);
});

test("prune drops days outside the retention window", () => {
  let c = M.empty();
  c = M.bump(c, "sessions_restored", at(0));
  c = M.bump(c, "sessions_restored", at(45));
  M.prune(c, 30, at(0));
  assert.deepEqual(Object.keys(c.sessions_restored), [M.dayKey(at(0))]);
});