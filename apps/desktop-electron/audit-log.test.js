const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createAuditLog, summarize, hashEntry, bodyOf, scrubUrl, GENESIS } = require("./audit-log");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "continua-audit-"));

test("a fresh chain verifies and starts at genesis", () => {
  const log = createAuditLog(null);
  const v = log.verify();
  assert.equal(v.ok, true);
  assert.equal(v.checked, 0);
  assert.equal(v.head, GENESIS);
});

test("append returns a hash-chained record", () => {
  const log = createAuditLog(null);
  const a = log.append({ ts: 1, op: "observe_tab", tier: "read", allowed: true });
  const b = log.append({ ts: 2, op: "act_tab", tier: "write", allowed: true, grantId: "g1" });
  assert.equal(a.seq, 1);
  assert.equal(a.prev, GENESIS);
  assert.equal(b.prev, a.hash);
  assert.equal(b.seq, 2);
  assert.equal(log.verify().ok, true);
});

test("editing a committed entry breaks the chain and is located", () => {
  const log = createAuditLog(null);
  log.append({ ts: 1, op: "observe_tab", tier: "read", allowed: true, summary: "a" });
  log.append({ ts: 2, op: "act_tab", tier: "write", allowed: true, summary: "b" });
  log.append({ ts: 3, op: "act_tab", tier: "write", allowed: true, summary: "c" });
  // forge history: make a denied write look allowed
  const rec = log.all()[1];
  rec.allowed = false;
  const v = log.verify();
  assert.equal(v.ok, false);
  assert.equal(v.brokenAt, 2, "the tampered seq is reported");
});

test("deleting a line from an exported log breaks the chain", () => {
  const dir = tmp();
  const file = path.join(dir, "audit.jsonl");
  const a = createAuditLog(file);
  a.append({ ts: 1, op: "observe_tab", tier: "read", allowed: true });
  a.append({ ts: 2, op: "act_tab", tier: "write", allowed: false, reason: "write-needs-grant" });
  a.append({ ts: 3, op: "act_tab", tier: "write", allowed: false, reason: "write-needs-grant" });
  a.flush();
  // someone removes the inconvenient first line from the artifact
  const lines = fs.readFileSync(file, "utf8").trim().split("\n");
  fs.writeFileSync(file, lines.slice(1).join("\n") + "\n");
  const b = createAuditLog(file);
  const v = b.verify();
  assert.equal(v.ok, false, "a head deletion must not verify");
  assert.equal(v.brokenAt, 2);
  assert.equal(b.size, 2);
});

test("append-only extra fields cannot smuggle content into the hashed body", () => {
  const log = createAuditLog(null);
  const rec = log.append({ ts: 1, op: "observe_tab", tier: "read", allowed: true, sneaky: "value" });
  assert.equal(rec.sneaky, undefined, "unknown fields are not stored at all");
  assert.equal(log.verify().ok, true);
});

test("query strings are scrubbed from logged urls", () => {
  assert.equal(scrubUrl("https://bank.example/x?q=secret"), "https://bank.example/x");
  assert.equal(scrubUrl("file:///tmp/a.html"), "file:///tmp/a.html");
  assert.equal(scrubUrl(""), "");
  const log = createAuditLog(null);
  const rec = log.append({ ts: 1, op: "navigate", tier: "write", allowed: true, target: "https://a.test/p?token=abc" });
  assert.ok(!JSON.stringify(rec).includes("abc"), "query strings never reach the log");
});

test("the log survives a restart and still verifies", () => {
  const dir = tmp();
  const file = path.join(dir, "audit.jsonl");
  const a = createAuditLog(file);
  a.append({ ts: 10, op: "observe_tab", tier: "read", allowed: true, tab: "tab-1" });
  a.append({ ts: 11, op: "act_tab", tier: "write", allowed: false, reason: "write-needs-grant", tab: "tab-1" });
  a.flush();
  const b = createAuditLog(file);
  assert.equal(b.size, 2);
  assert.equal(b.verify().ok, true);
  const c = b.append({ ts: 12, op: "act_tab", tier: "write", allowed: true, grantId: "g9" });
  assert.equal(c.seq, 3, "seq continues across restarts");
  assert.equal(c.prev, b.all()[1].hash);
});

test("the cap keeps the chain bounded", () => {
  const log = createAuditLog(null, { cap: 5 });
  for (let i = 0; i < 20; i++) log.append({ ts: i, op: "observe_tab", tier: "read", allowed: true });
  assert.equal(log.size, 5);
  const v = log.verify();
  // trimming the head breaks the genesis link by design: the retained window
  // is what verifies, and the truncation is visible rather than silent.
  assert.equal(v.brokenAt, 16);
});

test("export produces a manifest plus verifiable JSONL", () => {
  const log = createAuditLog(null);
  log.append({ ts: 1, op: "observe_tab", tier: "read", allowed: true });
  log.append({ ts: 2, op: "act_tab", tier: "write", allowed: false, reason: "page-content-cannot-write" });
  const m = log.manifest();
  assert.equal(m.artifact, "agent-audit-log");
  assert.equal(m.entryCount, 2);
  assert.equal(m.chainOk, true);
  const lines = log.exportJsonl().trim().split("\n");
  assert.equal(lines.length, 2);
  const first = JSON.parse(lines[0]);
  assert.equal(first.seq, 1);
  assert.equal(first.hash.length, 64);
});

test("entries reach disk without an explicit flush (debounced)", async () => {
  const dir = tmp();
  const file = path.join(dir, "audit.jsonl");
  const log = createAuditLog(file, { flushMs: 5 });
  log.append({ ts: 1, op: "observe_tab", tier: "read", allowed: true });
  assert.equal(fs.existsSync(file), false, "not written synchronously");
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(fs.existsSync(file), true, "written by the debounce timer");
  assert.equal(createAuditLog(file).verify().ok, true);
});

test("flush() forces the write and is idempotent", () => {
  const dir = tmp();
  const file = path.join(dir, "audit.jsonl");
  const log = createAuditLog(file, { flushMs: 10000 });
  log.append({ ts: 1, op: "observe_tab", tier: "read", allowed: true });
  log.flush();
  const first = fs.readFileSync(file, "utf8");
  log.flush();
  assert.equal(fs.readFileSync(file, "utf8"), first, "a second flush changes nothing");
  assert.equal(log.dirty, false);
});

test("a burst of decisions collapses into one disk write", () => {
  const dir = tmp();
  const file = path.join(dir, "audit.jsonl");
  const log = createAuditLog(file, { flushMs: 10000 });
  for (let i = 0; i < 500; i++) log.append({ ts: i, op: "observe_tab", tier: "read", allowed: true });
  assert.equal(fs.existsSync(file), false, "no synchronous I/O during the burst");
  log.flush();
  assert.equal(createAuditLog(file).size, 500);
  assert.equal(log.verify().ok, true);
});

test("no temp file is left behind after a write", () => {
  const dir = tmp();
  const file = path.join(dir, "audit.jsonl");
  const log = createAuditLog(file, { flushMs: 0 });
  log.append({ ts: 1, op: "observe_tab", tier: "read", allowed: true });
  log.flush();
  assert.equal(fs.existsSync(`${file}.tmp`), false);
  assert.equal(fs.existsSync(file), true);
});

test("hashEntry is deterministic and prev-sensitive", () => {
  const body = bodyOf({ ts: 5, op: "act_tab", tier: "write", allowed: true });
  assert.equal(hashEntry(GENESIS, body), hashEntry(GENESIS, body));
  assert.notEqual(hashEntry(GENESIS, body), hashEntry("f".repeat(64), body));
});

test("summarize counts reads, writes, denials and approval rate", () => {
  const log = createAuditLog(null);
  log.append({ ts: 1, op: "observe_tab", tier: "read", allowed: true });
  log.append({ ts: 2, op: "act_tab", tier: "write", allowed: true, grantId: "g1" });
  log.append({ ts: 3, op: "act_tab", tier: "write", allowed: true, grantId: "g2" });
  log.append({ ts: 4, op: "act_tab", tier: "write", allowed: false, reason: "write-needs-grant" });
  log.append({ ts: 5, op: "navigate", tier: "write", allowed: false, reason: "page-content-cannot-write" });
  const s = summarize(log.all());
  assert.equal(s.total, 5);
  assert.equal(s.reads, 1);
  assert.equal(s.writes, 4);
  assert.equal(s.denied, 2);
  assert.equal(s.forbidden, 1);
  assert.equal(s.granted, 2);
  assert.equal(s.approvalRate, 50);
  assert.equal(s.byOp.act_tab, 3);
});

test("summarize of an empty chain is safe", () => {
  const s = summarize([]);
  assert.equal(s.total, 0);
  assert.equal(s.approvalRate, null);
});