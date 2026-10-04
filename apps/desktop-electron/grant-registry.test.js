const test = require("node:test");
const assert = require("node:assert");
const { createGrantRegistry } = require("./grant-registry");
const Policy = require("./agent-policy");

const CLICK = { verb: "click", id: "3.1", label: "tab-2" };

test("an issued grant resolves for the exact action", () => {
  const reg = createGrantRegistry();
  const g = reg.issue({ op: "agent_act", params: CLICK });
  const r = reg.resolve(g, "agent_act", CLICK);
  assert.equal(r.ok, true);
  assert.equal(r.grant.fp, g.fp);
});

test("a grant id the registry never issued is refused", () => {
  const reg = createGrantRegistry();
  const forged = { id: "forged", op: "agent_act", fp: Policy.fingerprint("agent_act", CLICK) };
  const r = reg.resolve(forged, "agent_act", CLICK);
  assert.equal(r.ok, false);
  assert.equal(r.reason, Policy.REASON.grantMissing);
});

test("an attacker cannot mint a grant even knowing the public fingerprint", () => {
  // This is the real exploit: the fingerprint is readable from
  // `pending_approvals`, so matching it must not be enough.
  const reg = createGrantRegistry();
  const fp = Policy.fingerprint("agent_act", CLICK);
  const forged = { id: "self-minted", op: "agent_act", fp };
  assert.equal(reg.resolve(forged, "agent_act", CLICK).ok, false, "known fingerprint is not authority");

  // Even reusing a *previously issued* id for a different action is refused.
  const g = reg.issue({ op: "agent_act", params: CLICK });
  const widened = reg.resolve({ ...g, fp: Policy.fingerprint("agent_act", { verb: "type", id: "2" }) }, "agent_act", { verb: "type", id: "2" });
  assert.equal(widened.ok, false, "the registry's fingerprint wins over the caller's");
});

test("a grant cannot be widened to another action", () => {
  const reg = createGrantRegistry();
  const g = reg.issue({ op: "agent_act", params: CLICK });
  const other = reg.resolve(g, "agent_act", { verb: "type", id: "3.1", value: "x" });
  assert.equal(other.ok, false);
  assert.equal(other.reason, Policy.REASON.grantMismatch);
});

test("a grant cannot be replayed against another op", () => {
  const reg = createGrantRegistry();
  const g = reg.issue({ op: "agent_act", params: CLICK });
  assert.equal(reg.resolve(g, "act_tab", CLICK).reason, Policy.REASON.grantMismatch);
});

test("consume is single-use and resolve reports a spent grant", () => {
  const reg = createGrantRegistry();
  const g = reg.issue({ op: "agent_act", params: CLICK });
  assert.equal(reg.resolve(g, "agent_act", CLICK).ok, true);
  assert.equal(reg.consume(g.id), true, "first consume wins");
  assert.equal(reg.consume(g.id), false, "second consume is refused");
  const replay = reg.resolve(g, "agent_act", CLICK);
  assert.equal(replay.ok, false);
  assert.equal(replay.spent, true);
});

test("two issues for the same action are distinct grants", () => {
  const reg = createGrantRegistry();
  const a = reg.issue({ op: "agent_act", params: CLICK });
  const b = reg.issue({ op: "agent_act", params: CLICK });
  assert.notEqual(a.id, b.id);
  assert.equal(reg.size, 2);
});

test("grants expire", () => {
  const reg = createGrantRegistry({ ttlMs: 1000 });
  const g = reg.issue({ op: "agent_act", params: CLICK, now: 1000 });
  assert.equal(reg.resolve(g, "agent_act", CLICK, 1500).ok, true);
  assert.equal(reg.resolve(g, "agent_act", CLICK, 2500).ok, false, "expired grants do not resolve");
});

test("resolve tolerates junk input", () => {
  const reg = createGrantRegistry();
  for (const junk of [null, undefined, "", 42, {}, [], { id: null }]) {
    const r = reg.resolve(junk, "agent_act", CLICK);
    assert.equal(r.ok, false);
  }
});

test("the registry never leaks the raw action value", () => {
  const reg = createGrantRegistry();
  const g = reg.issue({ op: "agent_act", params: { verb: "type", id: "2", value: "hunter2" } });
  assert.ok(!JSON.stringify(g).includes("hunter2"));
  assert.ok(!JSON.stringify(reg.resolve(g, "agent_act", { verb: "type", id: "2", value: "hunter2" })).includes("hunter2"));
});