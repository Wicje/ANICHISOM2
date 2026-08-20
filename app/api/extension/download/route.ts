import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'chrome-extension');

// CRC32 implementation for ZIP format
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeZip(files: [string, Buffer][]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const [name, data] of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const deflated = deflateRawSync(data, { level: 9 });
    const csize = deflated.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // method: deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(csize, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuf, deflated);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(csize, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);

    offset += 30 + nameBuf.length + csize;
  }

  const cdBuf = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, cdBuf, end]);
}

function collectExtensionFiles(dir: string, base = ''): [string, Buffer][] {
  const out: [string, Buffer][] = [];
  if (!existsSync(dir)) return out;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (['node_modules', '.git', 'package.json', 'package-lock.json', 'continua-context-bridge.pem'].includes(entry)) {
      continue;
    }
    const fullPath = join(dir, entry);
    const relPath = base ? `${base}/${entry}` : entry;
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      out.push(...collectExtensionFiles(fullPath, relPath));
    } else if (st.isFile()) {
      out.push([relPath, readFileSync(fullPath)]);
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'zip';

  try {
    const files = collectExtensionFiles(SRC_DIR);
    if (files.length === 0) {
      return NextResponse.json({ error: 'Extension source not found' }, { status: 404 });
    }

    const zipBuffer = makeZip(files);
    const bodyArray = new Uint8Array(zipBuffer);

    if (format === 'xpi') {
      return new NextResponse(bodyArray, {
        headers: {
          'Content-Type': 'application/x-xpinstall',
          'Content-Disposition': 'attachment; filename="continua-context-bridge.xpi"',
          'Content-Length': String(zipBuffer.length),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return new NextResponse(bodyArray, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="continua-context-bridge.zip"',
        'Content-Length': String(zipBuffer.length),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to build extension package' }, { status: 500 });
  }
}
