const test = require("node:test");
const assert = require("node:assert");
const Policy = require("./agent-policy");

test("tierOf classifies read/write/unknown ops", () => {
  assert.equal(Policy.tierOf("observe_tab"), "read");
  assert.equal(Policy.tierOf("list_tabs"), "read");
  assert.equal(Policy.tierOf("act_tab"), "write");
  assert.equal(Policy.tierOf("navigate"), "write");
  assert.equal(Policy.tierOf("definitely_not_an_op"), "unknown");
  assert.equal(Policy.tierOf(undefined), "unknown");
});

test("reads are always allowed, with no grant and no approval", () => {
  const d = Policy.decide({ op: "observe_tab", source: "agent" });
  assert.equal(d.allowed, true);
  assert.equal(d.tier, "read");
  assert.equal(d.needsApproval, false);
});

test("page content is never a trusted actor for reads or writes", () => {
  assert.equal(Policy.decide({ op: "observe_tab", source: "page" }).allowed, true);
  const w = Policy.decide({ op: "act_tab", source: "page", params: { verb: "click", id: "0" } });
  assert.equal(w.allowed, false);
  assert.equal(w.reason, Policy.REASON.pageCannotWrite);
});

test("a write with no grant is denied and asks for approval", () => {
  const d = Policy.decide({ op: "act_tab", params: { verb: "type", id: "1.2", value: "hi" } });
  assert.equal(d.allowed, false);
  assert.equal(d.needsApproval, true);
  assert.equal(d.reason, Policy.REASON.grantMissing);
  assert.ok(d.fingerprint, "a denied write returns the fingerprint to approve");
});

test("approved:true from the caller is NOT an approval — the agent cannot self-approve", () => {
  const d = Policy.decide({ op: "act_tab", approved: true, params: { verb: "click", id: "3" } });
  assert.equal(d.allowed, false, "a self-supplied approval flag must not open the gate");
  assert.equal(d.reason, Policy.REASON.grantMissing);
});

test("auto-approval is blocked outright on writes", () => {
  const d = Policy.decide({ op: "act_tab", auto: true, params: { verb: "click", id: "0" } });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, Policy.REASON.autoBlocked);
});

test("a user grant opens exactly one matching action", () => {
  const params = { verb: "click", id: "3.1", label: "tab-2" };
  const grant = Policy.mintGrant("act_tab", params, { nonce: "n1" });
  const ok = Policy.decide({ op: "act_tab", grant, params });
  assert.equal(ok.allowed, true);
  assert.equal(ok.granted, true);
  assert.equal(ok.needsApproval, false);
});

test("a grant cannot be replayed against different params or a different op", () => {
  const grant = Policy.mintGrant("act_tab", { verb: "click", id: "3.1" }, { nonce: "n1" });
  const other = Policy.decide({ op: "act_tab", grant, params: { verb: "type", id: "3.1", value: "x" } });
  assert.equal(other.allowed, false);
  assert.equal(other.reason, Policy.REASON.grantMismatch);
  const otherOp = Policy.decide({ op: "navigate", grant, params: { verb: "click", id: "3.1" } });
  assert.equal(otherOp.allowed, false);
  assert.equal(otherOp.reason, Policy.REASON.grantMismatch);
});

test("a spent grant is rejected as already used", () => {
  const params = { verb: "click", id: "0" };
  const grant = Policy.mintGrant("act_tab", params);
  assert.equal(Policy.decide({ op: "act_tab", grant, params, spent: true }).reason, Policy.REASON.grantSpent);
});

test("grants are single-use ids", () => {
  const a = Policy.mintGrant("act_tab", { verb: "click", id: "0" }, { nonce: "a" });
  const b = Policy.mintGrant("act_tab", { verb: "click", id: "0" }, { nonce: "a" });
  assert.notEqual(a.id, b.id, "each mint is a distinct grant even for an identical action");
  assert.equal(a.fp, b.fp, "the fingerprint is action-bound, not nonce-bound");
});

test("typed secrets are redacted, so a grant cannot be replayed from a log", () => {
  const grant = Policy.mintGrant("act_tab", { verb: "type", id: "2", value: "hunter2" });
  assert.ok(!JSON.stringify(grant).includes("hunter2"), "the secret never enters the grant");
  const d = Policy.decide({ op: "act_tab", grant, params: { verb: "type", id: "2", value: "hunter2" } });
  assert.equal(d.allowed, true, "redaction is stable, so the real action still matches");
});

test("sync-key ops are user-gated: forbidden for agents, allowed for the user UI", () => {
  for (const op of ["sync_key_create", "sync_key_show", "sync_key_import", "sync_key_status"]) {
    const a = Policy.decide({ op, source: "agent" });
    assert.equal(a.allowed, false, `${op} must be unreachable by an agent`);
    assert.equal(a.reason, Policy.REASON.userGatedOnly);
    assert.equal(Policy.decide({ op, source: "user" }).allowed, true, `${op} must work for the user`);
  }
});

test("unknown ops are refused by default (fail closed)", () => {
  const d = Policy.decide({ op: "rm_rf", params: {} });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, Policy.REASON.unknownOp);
});

test("user-control ops are user-only: an agent can never mint its own grant", () => {
  for (const op of ["agent_approve", "agent_deny", "audit_log_export"]) {
    const a = Policy.decide({ op, source: "agent" });
    assert.equal(a.allowed, false, `${op} must be unreachable by an agent`);
    assert.equal(a.reason, Policy.REASON.userGatedOnly);
    assert.equal(Policy.decide({ op, source: "user" }).allowed, true, `${op} must work for the user`);
  }
});

test("a page can never reach a user-control op either", () => {
  const d = Policy.decide({ op: "agent_approve", source: "page", params: { requestId: "apr-1" } });
  assert.equal(d.allowed, false);
});

test("the user driving their own chrome may write without a grant", () => {
  for (const op of ["open_tab", "close_tab", "navigate_tab", "reload_tab", "read_aloud", "act_tab"]) {
    const d = Policy.decide({ op, source: "user", params: { label: "tab-1" } });
    assert.equal(d.allowed, true, `${op}: user click must not need a grant`);
    assert.equal(d.needsApproval, false);
  }
  // An agent still needs a grant for the same ops.
  const a = Policy.decide({ op: "open_tab", source: "agent", params: { url: "https://a.com" } });
  assert.equal(a.allowed, false);
  assert.equal(a.needsApproval, true);
});

test("tab-mutating IPC ops are write-tier (host gates them)", () => {
  for (const op of ["open_tab", "open_incognito_tab", "navigate_tab", "reload_tab", "close_tab", "reopen_closed", "new_tab_url", "read_aloud"]) {
    assert.equal(Policy.tierOf(op), "write", `${op} must need a grant-or-user decision`);
  }
});

test("tierOf labels approval minting as a write", () => {
  assert.equal(Policy.tierOf("agent_approve"), "write");
  assert.equal(Policy.isUserOnly("agent_approve"), true);
  assert.equal(Policy.isUserOnly("act_tab"), false);
});

test("fingerprint is order-independent and value-sensitive", () => {
  assert.equal(Policy.fingerprint("act_tab", { a: 1, b: 2 }), Policy.fingerprint("act_tab", { b: 2, a: 1 }));
  assert.notEqual(Policy.fingerprint("act_tab", { a: 1 }), Policy.fingerprint("act_tab", { a: 2 }));
});

test("describe renders an approval prompt line", () => {
  const s = Policy.describe("act_tab", { verb: "click", id: "3.1", label: "tab-2" });
  assert.match(s, /act_tab click node 3\.1/);
  assert.match(s, /tab tab-2/);
  assert.match(s, /\(write\)$/);
});

test("credential-shaped fields are redacted, not just password/value", () => {
  const s = Policy.sanitize({ otp: "123456", cookie: "sess=abc", card: "4111", nickname: "bob" });
  assert.equal(s.otp, "[redacted]");
  assert.equal(s.cookie, "[redacted]");
  assert.equal(s.card, "[redacted]");
  assert.equal(s.nickname, "bob");
});

test("sanitize truncates long values and drops undefined", () => {
  const s = Policy.sanitize({ url: "x".repeat(900), gone: undefined });
  assert.equal(s.url.length, 512);
  assert.ok(!("gone" in s));
});