const test = require("node:test");
const assert = require("node:assert");
const { createApprovalQueue } = require("./approval-queue");

const CLICK = { verb: "click", id: "3.1", label: "tab-2" };
const rec = (over = {}) => ({ id: "apr-1", profileId: "personal", op: "agent_act", params: CLICK, tab: "tab-2", url: "https://a.test/x", fingerprint: "fp1", describe: "agent_act click node 3.1 (write)", ts: 1000, ...over });

test("a queued request comes back for its own profile", () => {
  const q = createApprovalQueue();
  q.add(rec());
  assert.equal(q.list("personal").length, 1);
  assert.equal(q.list("work").length, 0, "another profile sees nothing");
});

test("a request cannot be answered from another profile", () => {
  const q = createApprovalQueue();
  q.add(rec({ profileId: "work" }));
  assert.equal(q.take("personal", "apr-1").ok, false, "Work's request is invisible to Personal");
  assert.equal(q.take("personal", "apr-1").reason, "no-such-request");
  assert.equal(q.take("work", "apr-1").ok, true, "Work can still answer it");
});

test("taking a request removes it (a decision is made once)", () => {
  const q = createApprovalQueue();
  q.add(rec());
  assert.equal(q.take("personal", "apr-1").ok, true);
  assert.equal(q.take("personal", "apr-1").ok, false);
  assert.equal(q.list("personal").length, 0);
});

test("requests expire and say so instead of vanishing", () => {
  const q = createApprovalQueue({ ttlMs: 1000 });
  q.add(rec({ ts: 1000 }), 1000);
  assert.equal(q.list("personal", 1500).length, 1);
  const late = q.take("personal", "apr-1", 2500);
  assert.equal(late.ok, false);
  assert.equal(late.reason, "request-expired", "the agent gets an explicit answer");
  assert.equal(q.list("personal", 2500).length, 0, "and it is not offered again");
});

test("prune clears expired requests across profiles", () => {
  const q = createApprovalQueue({ ttlMs: 1000 });
  q.add(rec({ id: "a", profileId: "work", ts: 1000 }), 1000);
  q.add(rec({ id: "b", profileId: "personal", ts: 5000 }), 5000);
  assert.equal(q.prune(3000), 1, "only the request queued at 1000 has expired");
  assert.equal(q.size(3000), 1);
  assert.equal(q.prune(9000), 1, "and the second one goes later");
});

test("listing is oldest first and per profile", () => {
  const q = createApprovalQueue();
  q.add(rec({ id: "r2", ts: 2000 }));
  q.add(rec({ id: "r1", ts: 1000 }));
  q.add(rec({ id: "w1", profileId: "work", ts: 500 }));
  assert.deepEqual(q.list("personal").map((r) => r.id), ["r1", "r2"]);
  assert.deepEqual(q.list("work").map((r) => r.id), ["w1"]);
});

test("size counts live requests everywhere", () => {
  const q = createApprovalQueue();
  q.add(rec({ id: "a", profileId: "work" }));
  q.add(rec({ id: "b" }));
  assert.equal(q.size(), 2);
  assert.deepEqual(q.profiles.sort(), ["personal", "work"]);
});

test("the queue never stores the typed value in a prompt field", () => {
  const q = createApprovalQueue();
  const stored = q.add(rec({ params: { verb: "type", id: "2", value: "hunter2" } }));
  // params are kept so the eventual grant binds to the exact action; the
  // prompt line and fingerprint are what leave the host.
  assert.equal(stored.describe, "agent_act click node 3.1 (write)");
  assert.ok(!stored.describe.includes("hunter2"));
});

test("peek does not consume", () => {
  const q = createApprovalQueue();
  q.add(rec());
  assert.equal(q.peek("personal", "apr-1").id, "apr-1");
  assert.equal(q.peek("personal", "apr-1").id, "apr-1");
  assert.equal(q.list("personal").length, 1);
});

test("junk input is refused, not thrown on", () => {
  const q = createApprovalQueue();
  for (const id of [null, undefined, "", 0, {}]) {
    assert.equal(q.take("personal", id).ok, false);
  }
  assert.deepEqual(q.list("nope"), []);
});