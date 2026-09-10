#!/usr/bin/env node
/**
 * Publish Continua desktop artifacts to Vercel Blob and regenerate
 * public/downloads/manifest.json.
 *
 * Prereqs:
 *   - BLOB_READ_WRITE_TOKEN env var (Vercel Blob store token)
 *   - build artifacts named like:
 *       Continua_0.1.0_x64.dmg      (macOS)
 *       Continua_0.1.0_x64.msi      (Windows)
 *       Continua_0.1.0_amd64.AppImage / .deb (Linux)
 *
 * Usage:
 *   node scripts/publish-downloads.mjs /path/to/build/dir [--version 0.1.0] [--release-date 2026-09-07]
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { put } from '@vercel/blob';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('Missing BLOB_READ_WRITE_TOKEN env var');
  process.exit(1);
}

const args = process.argv.slice(2);
const dirArg = args.find(a => !a.startsWith('--'));
const version = args.find(a => a.startsWith('--version'))?.split('=')[1] || '0.1.0';
const releaseDate = args.find(a => a.startsWith('--release-date'))?.split('=')[1] || new Date().toISOString().slice(0, 10);

if (!dirArg) {
  console.error('Usage: node scripts/publish-downloads.mjs <build-dir> [--version=X] [--release-date=YYYY-MM-DD]');
  process.exit(1);
}

const buildDir = resolve(dirArg);
const MANIFEST_PATH = resolve(import.meta.dirname, '../public/downloads/manifest.json');

// Per-platform primary (shown as the big button) vs. secondary packages
// (e.g. Linux AppImage primary, .deb secondary).
const PLATFORM_RULES = [
  { key: 'mac', match: /\.dmg$/i, primary: /\.dmg$/i, sorted: [/\.dmg$/i, /\.pkg$/i] },
  { key: 'win', match: /\.(msi|exe)$/i, primary: /\.msi$/i, sorted: [/\.msi$/i, /\.exe$/i] },
  { key: 'linux', match: /\.(appimage|deb|rpm)$/i, primary: /\.appimage$/i, sorted: [/\.appimage$/i, /\.deb$/i, /\.rpm$/i] },
];

async function uploadBlob(buildPath, artifactName) {
  const storePath = `downloads/${version}/${artifactName}`;

  const file = await readFile(buildPath);
  const blob = await put(storePath, file, { access: 'public', token, allowOverwrite: true });

  return { url: blob.url, size: file.byteLength };
}

async function main() {
  const files = (await readdir(buildDir)).filter(f => !f.startsWith('.'));
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));

  const uploaded = [];
  for (const rule of PLATFORM_RULES) {
    const matches = files.filter(f => rule.match.test(f)).sort((a, b) => {
      const aa = rule.sorted.findIndex(r => r.test(a));
      const bb = rule.sorted.findIndex(r => r.test(b));
      return (aa < 0 ? 99 : aa) - (bb < 0 ? 99 : bb);
    });
    if (matches.length === 0) {
      console.log(`skipping ${rule.key}: no artifact found in ${buildDir}`);
      continue;
    }
    const primaryName = matches.find(f => rule.primary.test(f)) ?? matches[0];
    const packages = [];
    let primary;
    for (const name of matches) {
      const abs = resolve(buildDir, name);
      const { url, size } = await uploadBlob(abs, name);
      const info = { name, url, size };
      if (name === primaryName) {
        primary = info;
        console.log(`uploaded ${rule.key}: ${name} -> ${url} (${(size / 1024 / 1024).toFixed(1)} MB)`);
      } else {
        packages.push(info);
        console.log(`uploaded ${rule.key} (package): ${name} -> ${url} (${(size / 1024 / 1024).toFixed(1)} MB)`);
      }
    }
    uploaded.push({ key: rule.key, name: primary.name, url: primary.url, size: primary.size, packages });
  }

  for (const u of uploaded) {
    const platform = manifest.platforms[u.key];
    if (platform) {
      platform.artifact = u.name;
      platform.url = u.url;
      platform.size = u.size;
      platform.packages = u.packages;
    }
  }

  manifest.release.version = version;
  manifest.release.released = releaseDate;

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`wrote ${MANIFEST_PATH}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});