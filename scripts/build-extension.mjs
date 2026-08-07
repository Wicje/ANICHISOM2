#!/usr/bin/env node
/**
 * Continua Context Bridge — packaging script (one-click).
 *
 * Builds distributable artifacts from chrome-extension/ with zero npm deps:
 *
 *   npm run extension:build   →  dist/continua-context-bridge.zip  (Chrome Web Store)
 *                                dist/continua-context-bridge.crx  (signed, enterprise/self-hosted)
 *   npm run extension:zip     →  dist/continua-context-bridge.zip  (Web Store only)
 *
 * ── Chrome Web Store publish (the "no Dev mode" path) ───────────────────────
 *  1. Run `npm run extension:build` and keep dist/continua-context-bridge.zip.
 *  2. Create a developer account at https://chrome.google.com/webstore/devconsole
 *     (one-time $5 fee, only if you plan to list publicly).
 *  3. "Add new item" → upload the zip → fill the listing (description below) →
 *     add 1280x800 screenshots + a privacy policy URL → publish.
 *  4. Users install with one click from the store — no Developer mode needed.
 *
 *  Listing description (paste into the store):
 *    "Continua Context Bridge lets you embed web apps like Notion, Figma and
 *     GitHub directly inside your Continua OS workspace by stripping framing
 *     headers, and captures your active tab's context to sync into the OS.
 *     Install this extension, then open any web app in Continua OS to see it
 *     load natively. Data never leaves your browser except to the Continua
 *     instance you configure (defaults to http://localhost:3000)."
 *
 * ── Self-hosted CRX note ────────────────────────────────────────────────────
 *  Modern Chrome blocks .crx installs from non-store origins for regular users.
 *  The signed .crx is useful for enterprise policy deployment, QA builds, and
 *  archival. The Web Store zip is the supported path for production visitors.
 *
 * The signing key is generated once and stored at
 * chrome-extension/continua-context-bridge.pem (never upload it — it is the
 * extension's identity). Keep it safe to release updates under the same ID.
 */

import { createHash, createSign, createVerify, generateKeyPairSync } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, sep, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC_DIR = join(ROOT, 'chrome-extension');
const DIST_DIR = join(ROOT, 'dist');
const KEY_PATH = join(SRC_DIR, 'continua-context-bridge.pem');

const EXCLUDE = new Set(['node_modules', 'dist', '.git', 'package.json', 'package-lock.json']);
const args = new Set(process.argv.slice(2));
const wantZip = args.has('--zip') || args.has('--all') || args.size === 0;
const wantCrx = args.has('--crx') || args.has('--all') || args.size === 0;

// ─── CRC32 (ZIP) ─────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ─── Minimal ZIP writer (method 8 = deflate) ─────────────────────────────────
function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, data] of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const deflated = deflateRawSync(data, { level: 9 });
    const csize = deflated.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // method: deflate
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0, 12); // mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(csize, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra len
    localParts.push(local, nameBuf, deflated);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(8, 10); // method
    central.writeUInt16LE(0, 12); // mod time
    central.writeUInt16LE(0, 14); // mod date
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(csize, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra len
    central.writeUInt16LE(0, 32); // comment len
    central.writeUInt16LE(0, 34); // disk start
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);

    offset += 30 + nameBuf.length + csize;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk w/ central dir
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

// ─── Minimal protobuf encoding (CRX v3 header) ───────────────────────────────
function varint(n) {
  const out = [];
  while (n >= 0x80) {
    out.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  out.push(n);
  return Buffer.from(out);
}

function pbField(fieldNumber, wireType, payload) {
  return Buffer.concat([varint((fieldNumber << 3) | wireType), varint(payload.length), payload]);
}

function pbMessage(fields) {
  return Buffer.concat(fields);
}

function pbBytes(fieldNumber, bytes) {
  return pbField(fieldNumber, 2, bytes);
}

// ─── CRX v3 signer ───────────────────────────────────────────────────────────
function loadOrCreateKey() {
  if (existsSync(KEY_PATH)) {
    return readFileSync(KEY_PATH, 'utf8');
  }
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 3072,
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  writeFileSync(KEY_PATH, privateKey, { mode: 0o600 });
  return privateKey;
}

function extensionIdFromPublicKey(spkiDer) {
  const digest = createHash('sha256').update(spkiDer).digest();
  const alphabet = 'abcdefghijklmnop';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += alphabet[(digest[i] >> 4) & 0x0f];
    id += alphabet[digest[i] & 0x0f];
  }
  return id;
}

async function main() {
  mkdirSync(DIST_DIR, { recursive: true });

  // 1. Collect source files (sorted, POSIX separators).
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      if (EXCLUDE.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.pem')) continue; // signing key never ships
      else files.push(full);
    }
  };
  walk(SRC_DIR);

  const entries = files
    .map((f) => [relative(SRC_DIR, f).split(sep).join('/'), readFileSync(f)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  if (entries.length === 0) {
    console.error('No files found under chrome-extension/. Aborting.');
    process.exit(1);
  }

  const zipBuffer = makeZip(entries);
  const zipPath = join(DIST_DIR, 'continua-context-bridge.zip');
  writeFileSync(zipPath, zipBuffer);
  console.log(`\u2713 zip   ${zipPath}  (${(zipBuffer.length / 1024).toFixed(1)} KB, ${entries.length} files)`);

  if (wantCrx) {
    // Load (or create) the persistent signing key.
    const keyPem = loadOrCreateKey();
    const privateKey = await import('node:crypto').then((c) => c.createPrivateKey(keyPem));
    const spkiDer = await import('node:crypto').then((c) =>
      c.createPublicKey(privateKey).export({ type: 'spki', format: 'der' })
    );

    // SignedData { crx_id = sha256(pubkey)[:16] }
    const crxId = createHash('sha256').update(spkiDer).digest().subarray(0, 16);
    const signedHeaderData = pbMessage([pbBytes(1, crxId)]);

    // Sign the signed header data (RSASSA-PKCS1-v1_5 / SHA-256).
    const signature = createSign('sha256').update(signedHeaderData).sign(privateKey);

    // CrxFileHeader { sha256_with_rsa { public_key, signature } (field 2),
    //                 signed_header_data (field 10000) }
    const proof = pbMessage([pbBytes(1, spkiDer), pbBytes(2, signature)]);
    const header = pbMessage([pbField(2, 2, proof), pbBytes(10000, signedHeaderData)]);

    // Self-verify before writing.
    const verify = createVerify('sha256').update(signedHeaderData);
    if (!verify.verify(
      await import('node:crypto').then((c) => c.createPublicKey({ key: spkiDer, format: 'der', type: 'spki' })),
      signature
    )) {
      console.error('\u2717 CRX signature self-verification failed. Aborting.');
      process.exit(1);
    }

    const crxHeader = Buffer.alloc(12);
    crxHeader.write('Cr24', 0, 'ascii');
    crxHeader.writeUInt32LE(3, 4);
    crxHeader.writeUInt32LE(header.length, 8);
    const crx = Buffer.concat([crxHeader, header, zipBuffer]);

    const crxPath = join(DIST_DIR, 'continua-context-bridge.crx');
    writeFileSync(crxPath, crx);

    const extensionId = extensionIdFromPublicKey(spkiDer);
    console.log(`\u2713 crx   ${crxPath}  (${(crx.length / 1024).toFixed(1)} KB)`);
    console.log(`\u2713 key   ${KEY_PATH}  (keep private — signing identity)`);
    console.log(`\n  Extension ID: ${extensionId}`);
    console.log(
      `\n  Next steps for production visitors (no Dev mode):\n` +
      `    1. Upload ${zipPath} to the Chrome Web Store dev console.\n` +
      `    2. Publish; users then install it with one click from the store.\n` +
      `    3. Future updates: rebuild and re-upload — ID stays stable via the .pem key.\n`
    );
  }
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
