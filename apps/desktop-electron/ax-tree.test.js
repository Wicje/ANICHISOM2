const { test } = require("node:test");
const assert = require("node:assert/strict");
const A = require("./ax-tree");

const tree = () => A.buildSnapshot([
  { id: "0", role: "generic", name: "body", children: [
    { id: "0.0", role: "button", name: "Search" },
    { id: "0.1", role: "textbox", name: "q", value: "abc" },
    { id: "0.2", role: "link", name: "Docs", href: "https://x.com/d" },
    { id: "0.3", role: "checkbox", name: "Save", checked: true },
    { id: "0.4", role: "button", name: "Gone", disabled: true },
    { id: "0.5", role: "generic", name: "x".repeat(500) },
  ] },
]);

test("buildSnapshot preserves path ids and affordances", () => {
  const s = tree();
  assert.equal(s.truncated, false);
  const rows = A.index(s.tree);
  assert.deepEqual(rows.map((r) => r.id), ["0", "0.0", "0.1", "0.2", "0.3", "0.4", "0.5"]);
  assert.equal(rows[2].value, "abc");
  assert.equal(rows[3].href, "https://x.com/d");
  assert.equal(rows[4].checked, true);
  assert.equal(rows[5].disabled, true);
});

test("strings are capped, never unbounded", () => {
  const rows = A.index(tree().tree);
  assert.ok(rows[6].name.length <= A.MAX_STRING);
});

test("cleanNodeId accepts paths, rejects everything else", () => {
  assert.equal(A.cleanNodeId("0"), "0");
  assert.equal(A.cleanNodeId("0.2.11"), "0.2.11");
  assert.equal(A.cleanNodeId("0;alert(1)"), null);
  assert.equal(A.cleanNodeId("../../etc"), null);
  assert.equal(A.cleanNodeId(""), null);
  assert.equal(A.cleanNodeId(null), null);
});

test("huge trees truncate instead of exploding", () => {
  const kids = Array.from({ length: A.MAX_NODES + 50 }, (_, i) => ({ id: `0.${i}`, role: "generic", name: `n${i}` }));
  const s = A.buildSnapshot([{ id: "0", role: "generic", name: "b", children: kids }]);
  assert.equal(s.truncated, true);
});

test("affordance maps roles conservatively", () => {
  assert.equal(A.affordance("button"), "click");
  assert.equal(A.affordance("link"), "click");
  assert.ok(A.affordance("textbox").startsWith("type"));
  assert.equal(A.affordance("checkbox"), "check/uncheck");
  assert.equal(A.affordance("image"), "read");
  assert.equal(A.affordance("whatever"), "read");
});

test("summarize counts interactive surface", () => {
  const sum = A.summarize(tree().tree);
  assert.equal(sum.nodes, 7);
  assert.equal(sum.editable, 1);
  assert.equal(sum.clickable, 2); // Search + Docs (Gone is disabled)
  assert.equal(sum.roles.button, 2);
});

test("nodeText is capped plain text", () => {
  const t = A.nodeText(tree().tree[0]);
  assert.ok(t.includes("Search"));
  assert.ok(t.length <= A.MAX_TEXT + 64);
});
