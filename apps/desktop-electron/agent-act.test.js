const { test } = require("node:test");
const assert = require("node:assert/strict");
const Act = require("./agent-act");

test("unknown verbs and bad ids are rejected", () => {
  assert.equal(Act.classify({ verb: "rmrf", id: "0" }).ok, false);
  assert.equal(Act.classify({ verb: "click", id: "0;evil" }).ok, false);
  assert.equal(Act.classify({ verb: "click", id: "../../x" }).ok, false);
  assert.equal(Act.classify({}).ok, false);
});

test("writes need approval; reads run free", () => {
  for (const verb of ["click", "type", "select", "check", "uncheck", "press"]) {
    const c = Act.classify({ verb, id: "0.1", value: "x" }, {});
    assert.equal(c.ok, true);
    assert.equal(c.tier, "write");
    assert.equal(c.needsApproval, true);
    assert.equal(c.approved, false);
  }
  for (const verb of ["focus", "scroll"]) {
    const c = Act.classify({ verb, id: "0.1" }, {});
    assert.equal(c.tier, "read");
    assert.equal(c.needsApproval, false);
    assert.equal(c.approved, true);
  }
});

test("explicit approval accredits; page auto-flow never does", () => {
  const ok = Act.classify({ verb: "type", id: "0.1", value: "hi" }, { approved: true });
  assert.equal(ok.approved, true);
  assert.equal(ok.needsApproval, false);
  // approved + auto (page-sourced) must NOT accredit — the core guardrail.
  const no = Act.classify({ verb: "type", id: "0.1", value: "hi" }, { approved: true, auto: true });
  assert.equal(no.approved, false);
  assert.equal(no.needsApproval, true);
});

test("guardNode refuses missing and disabled nodes", () => {
  assert.equal(Act.guardNode({}, null).ok, false);
  assert.equal(Act.guardNode({}, { disabled: true }).reason, Act.REASON.disabledNode);
  assert.equal(Act.guardNode({}, { role: "button" }).ok, true);
});

test("clickJs walks index-paths with JSON literals only", () => {
  const js = Act.clickJs([0, 2]);
  assert.ok(js.includes('["0","2"]'));
  assert.ok(js.includes("[document.body]"));
  assert.ok(js.includes(".click()"));
  assert.ok(!js.includes("0.2")); // never a bare dotted expression
});

test("typeJs embeds values as JSON string literals (injection-safe)", () => {
  const evil = `");malicious();//`;
  const js = Act.typeJs([0, 1], evil);
  assert.ok(js.includes(JSON.stringify(evil)));
  // appears exactly twice (native setter + fallback), never raw
  assert.equal(js.split(JSON.stringify(evil)).length - 1, 2);
  assert.ok(js.includes('["0","1"]'));
  assert.ok(js.includes("dispatchEvent(new Event('input'"));
});
