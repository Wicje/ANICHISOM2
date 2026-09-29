const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chunkText, clampRate } = require("./speech");

test("chunkText packs short sentences under the cap", () => {
  const chunks = chunkText("Hello world. This is a second sentence! And a third?");
  assert.deepEqual(chunks, ["Hello world. This is a second sentence! And a third?"]);
  const split = chunkText("Hello world. This is a second sentence! And a third?", 30);
  assert.deepEqual(split, ["Hello world.", "This is a second sentence!", "And a third?"]);
});

test("chunkText packs short sentences and splits long ones on words", () => {
  const packed = chunkText("Hi. Yo. Ok.", 20);
  assert.deepEqual(packed, ["Hi. Yo. Ok."]);
  const long = chunkText(`word ${"verylongword ".repeat(40)}end`, 200);
  assert.ok(long.length > 1);
  assert.ok(long.every((c) => c.length <= 200));
  // words rejoin losslessly
  assert.equal(long.join(" ").replace(/\s+/g, " ").trim(), `word ${"verylongword ".repeat(40)}end`.replace(/\s+/g, " ").trim());
});

test("chunkText handles empties and never splits mid-word unnecessarily", () => {
  assert.deepEqual(chunkText(""), []);
  assert.deepEqual(chunkText("   "), []);
  assert.deepEqual(chunkText(null), []);
  const single = chunkText("Supercalifragilisticexpialidocious", 10);
  assert.ok(single.every((c) => c.length <= 10));
  assert.equal(single.join(""), "Supercalifragilisticexpialidocious");
});

test("clampRate bounds speech rate", () => {
  assert.equal(clampRate(1), 1);
  assert.equal(clampRate(0), 0.5);
  assert.equal(clampRate(99), 2);
  assert.equal(clampRate("fast"), 1);
});
