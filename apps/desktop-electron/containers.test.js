const { test } = require("node:test");
const assert = require("node:assert/strict");
const C = require("./containers");

test("partitionFor sanitizes ids into stable persist partitions", () => {
  assert.equal(C.partitionFor("ctr-abc123"), "persist:continua-container-ctr-abc123");
  assert.equal(C.partitionFor("ctr-evil/../x"), "persist:continua-container-ctr-evilx");
  assert.equal(C.partitionFor(""), "persist:continua-container-default");
  assert.equal(C.partitionFor(null), "persist:continua-container-default");
});

test("createContainer assigns ids, names and rotating colors", () => {
  const r1 = C.createContainer([], "Work", "aaaa1111");
  assert.equal(r1.created.id, "ctr-aaaa1111");
  assert.equal(r1.created.name, "Work");
  assert.equal(r1.created.color, C.CONTAINER_COLORS[0]);
  const r2 = C.createContainer(r1.registry, "  ", "bbbb2222");
  assert.equal(r2.created.name, "Untitled");
  assert.equal(r2.created.color, C.CONTAINER_COLORS[1]);
});

test("createContainer caps the registry", () => {
  let reg = [];
  for (let i = 0; i < C.MAX_CONTAINERS; i++) {
    const r = C.createContainer(reg, `c${i}`, `id${i}0000`);
    reg = r.registry;
  }
  assert.equal(reg.length, C.MAX_CONTAINERS);
  const over = C.createContainer(reg, "one-more", "ffffffff");
  assert.equal(over.error, "limit");
  assert.equal(over.registry.length, C.MAX_CONTAINERS);
});

test("renameContainer renames or reports not-found", () => {
  const { registry } = C.createContainer([], "Work", "aaaa1111");
  const ok = C.renameContainer(registry, "ctr-aaaa1111", "  Job  ");
  assert.equal(ok.renamed.name, "Job");
  const miss = C.renameContainer(registry, "ctr-nope", "x");
  assert.equal(miss.error, "not-found");
});

test("deleteContainer + clearTabsOf detach tabs", () => {
  const r1 = C.createContainer([], "A", "aaaa1111");
  const r2 = C.createContainer(r1.registry, "B", "bbbb2222");
  const del = C.deleteContainer(r2.registry, "ctr-aaaa1111");
  assert.equal(del.registry.length, 1);
  assert.equal(del.registry[0].id, "ctr-bbbb2222");
  const tabs = [{ container: "ctr-aaaa1111" }, { container: "ctr-bbbb2222" }, { container: null }];
  assert.equal(C.clearTabsOf(tabs, "ctr-aaaa1111"), 1);
  assert.equal(tabs[0].container, null);
  assert.equal(tabs[1].container, "ctr-bbbb2222");
});

test("sanitizeRegistry drops junk, dupes and bad colors", () => {
  const out = C.sanitizeRegistry([
    { id: "ctr-1", name: "A", color: "#ff0000" },
    { id: "ctr-1", name: "dupe" },
    { id: "", name: "noid" },
    null,
    { id: "ctr-2", name: "", color: "nope" },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].color, "#ff0000");
  assert.equal(out[1].name, "Untitled");
});

test("findContainer resolves or returns null", () => {
  const { registry } = C.createContainer([], "Work", "aaaa1111");
  assert.equal(C.findContainer(registry, "ctr-aaaa1111").name, "Work");
  assert.equal(C.findContainer(registry, "ctr-missing"), null);
  assert.equal(C.findContainer(null, "ctr-aaaa1111"), null);
});
