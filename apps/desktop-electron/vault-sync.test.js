const { test } = require("node:test");
const assert = require("node:assert/strict");
const V = require("./vault-sync");

test("generateSyncKey produces valid 32-byte keys", () => {
  const k1 = V.generateSyncKey();
  const k2 = V.generateSyncKey();
  assert.equal(V.validSyncKey(k1), true);
  assert.equal(V.validSyncKey(k2), true);
  assert.notEqual(k1, k2);
  assert.equal(V.validSyncKey(""), false);
  assert.equal(V.validSyncKey("short"), false);
  assert.equal(V.validSyncKey(null), false);
  assert.equal(V.validSyncKey(Buffer.from("x".repeat(32)).toString("base64").slice(0, 10)), false);
});

test("encrypt/decrypt round-trips login rows", () => {
  const key = V.generateSyncKey();
  const rows = [
    { origin: "https://a.com", username: "amy", password: "s3cret" },
    { origin: "https://b.com", username: "bob", password: "hunter2" },
  ];
  const env = V.encryptLogins(key, rows);
  assert.equal(env.v, 1);
  assert.ok(env.iv && env.data);
  const back = V.decryptLogins(key, env);
  assert.deepEqual(back.rows, rows);
});

test("wrong key fails closed (GCM auth)", () => {
  const key = V.generateSyncKey();
  const other = V.generateSyncKey();
  const env = V.encryptLogins(key, [{ origin: "https://a.com", username: "u", password: "p" }]);
  const back = V.decryptLogins(other, env);
  assert.equal(back.error, "decrypt-failed");
});

test("tampered ciphertext fails closed", () => {
  const key = V.generateSyncKey();
  const env = V.encryptLogins(key, [{ origin: "https://a.com", username: "u", password: "p" }]);
  const blob = Buffer.from(env.data, "base64");
  blob[0] ^= 0xff;
  const back = V.decryptLogins(key, { ...env, data: blob.toString("base64") });
  assert.equal(back.error, "decrypt-failed");
});

test("bad envelopes and keys are rejected", () => {
  const key = V.generateSyncKey();
  assert.equal(V.encryptLogins("nope", []).error, "bad-key");
  assert.equal(V.decryptLogins("nope", {}).error, "bad-key");
  assert.equal(V.decryptLogins(key, null).error, "bad-envelope");
  assert.equal(V.decryptLogins(key, { v: 999, iv: "x", data: "y" }).error, "bad-envelope");
});

test("fresh IV per push (same plaintext, different ciphertext)", () => {
  const key = V.generateSyncKey();
  const rows = [{ origin: "https://a.com", username: "u", password: "p" }];
  const a = V.encryptLogins(key, rows);
  const b = V.encryptLogins(key, rows);
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.data, b.data);
});

test("toPlainRows dedupes pairs and drops junk", () => {
  const rows = V.toPlainRows([
    { origin: "https://a.com", username: "u", password: "p1" },
    { origin: "https://a.com", username: "u", password: "p2" },
    { origin: "file:///x", username: "u", password: "p" },
    { origin: "https://b.com", username: "v" },
    null,
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].password, "p1");
});

test("mergeIncomingLogins adopts unknown pairs only, never destructive", () => {
  const local = [{ origin: "https://a.com", username: "amy" }];
  const incoming = [
    { origin: "https://a.com", username: "amy", password: "same" },
    { origin: "https://b.com", username: "bob", password: "new" },
    { origin: "https://b.com", username: "bob", password: "dupe" },
  ];
  const adopt = V.mergeIncomingLogins(local, incoming);
  assert.equal(adopt.length, 1);
  assert.equal(adopt[0].origin, "https://b.com");
  assert.equal(V.mergeIncomingLogins(null, incoming).length, 2);
  assert.deepEqual(V.mergeIncomingLogins(local, null), []);
});
