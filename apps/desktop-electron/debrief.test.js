const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("./debrief");

const ev = () => ([
  { type: "visit", url: "https://a.com/x" },
  { type: "visit", url: "https://a.com/y" },
  { type: "visit", url: "https://b.com/z" },
  { type: "activate", url: "https://a.com/x", ms: 120000 },
  { type: "interact", url: "https://a.com/x", verb: "scroll" },
  { type: "type", url: "https://a.com/x", id: "0.1", value: "hello" },
  { type: "type", url: "https://b.com/z", id: "0.2", value: "" },
  { type: "write", url: "https://a.com/x", approved: true },
  { type: "write", url: "https://a.com/x", approved: false },
  { type: "download", url: "https://a.com/r.pdf", name: "r.pdf" },
]);

test("summarize aggregates visits, time, writes, downloads", () => {
  const s = D.summarize(ev());
  assert.equal(s.sites["a.com"], 2);
  assert.equal(s.sites["b.com"], 1);
  assert.equal(s.top[0].host, "a.com");
  assert.equal(s.interactions, 1);
  assert.equal(s.writes, 2);
  assert.equal(s.approvals, 1);
  assert.equal(s.unapprovedWrites, 1);
  assert.equal(s.downloads, 1);
  assert.ok(s.totalMs >= 120000);
});

test("headline names the top site and the margins", () => {
  const h = D.headline(D.summarize(ev()));
  assert.ok(h.includes("a.com"));
  assert.ok(h.includes("2 writes"));
  assert.ok(h.includes("1 file"));
});

test("headline is honest on empty timelines", () => {
  assert.ok(D.headline(D.summarize([])).includes("No significant activity"));
});

test("actionItems flag files and unfinished input only", () => {
  const items = D.actionItems(ev());
  assert.ok(items.some((i) => i.kind === "file" && i.name === "r.pdf"));
  assert.ok(items.some((i) => i.kind === "unfinished-input" && i.field === "a.com:0.1"));
  assert.ok(!items.some((i) => i.kind === "unfinished-input" && String(i.field).includes("b.com")));
});

test("long mode adds a capped resume order", () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ type: "visit", url: `https://h${i}.com/` }));
  const items = D.actionItems(many, { mode: "long" });
  const r = items.find((i) => i.kind === "resume-order");
  assert.ok(r && r.hosts.length === 5);
  assert.ok(!D.actionItems(many, { mode: "short" }).some((i) => i.kind === "resume-order"));
});
