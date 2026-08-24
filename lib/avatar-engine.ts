/**
 * Continua Avatar Engine — deterministic, offline, zero-dependency.
 *
 * Generates Vercel-style gradient-initial avatars and Boring-Avatar-style
 * marble/beam/pixel identicons as raw SVG strings. Everything serializes to
 * a `data:image/svg+xml` URL so any existing <img src={avatarUrl}> site
 * renders it unchanged — no network, no external service, privacy-safe.
 */

export type AvatarStyle = 'gradient' | 'marble' | 'beam' | 'pixel' | 'rings';

export const AVATAR_STYLES: Array<{ id: AvatarStyle; label: string }> = [
  { id: 'gradient', label: 'Gradient' },
  { id: 'marble', label: 'Marble' },
  { id: 'beam', label: 'Beam' },
  { id: 'pixel', label: 'Pixel' },
  { id: 'rings', label: 'Rings' },
];

/* ----------------------------- PRNG (seeded) ------------------------------ */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFor(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

/* -------------------------------- Palettes -------------------------------- */

const PALETTES: string[][] = [
  ['#10F4A0', '#06B6D4'], // emerald / cyan (Continua signature)
  ['#8B5CF6', '#EC4899'], // violet / fuchsia
  ['#F59E0B', '#EF4444'], // amber / red
  ['#3B82F6', '#6366F1'], // blue / indigo
  ['#14B8A6', '#84CC16'], // teal / lime
  ['#F472B6', '#FB923C'], // pink / orange
  ['#22D3EE', '#A78BFA'], // sky / lavender
  ['#E2E8F0', '#94A3B8'], // slate mono
];

export function paletteFor(seed: string): string[] {
  const rand = rngFor(`palette:${seed}`);
  return PALETTES[Math.floor(rand() * PALETTES.length)]!;
}

/* -------------------------------- Initials -------------------------------- */

export function initialsFor(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return '??';
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

/* ------------------------------- Generators ------------------------------- */

const SIZE = 128;

export function generateAvatarSvg(style: AvatarStyle, seed: string): string {
  switch (style) {
    case 'gradient':
      return gradientSvg(seed);
    case 'marble':
      return marbleSvg(seed);
    case 'beam':
      return beamSvg(seed);
    case 'pixel':
      return pixelSvg(seed);
    case 'rings':
      return ringsSvg(seed);
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Vercel-style: deterministic two-stop gradient + white initials. */
function gradientSvg(seed: string): string {
  const [a, b] = paletteFor(seed);
  const angle = Math.floor(rngFor(`angle:${seed}`)() * 360);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<defs><linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">` +
    `<stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/>` +
    `</linearGradient></defs>` +
    `<rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>` +
    `<text x="50%" y="50%" dy="0.36em" text-anchor="middle" font-family="system-ui,sans-serif" ` +
    `font-size="52" font-weight="800" fill="#ffffff">${esc(initialsFor(seed))}</text></svg>`;
}

/** Boring-marble-inspired: turbulence-warped color blobs. */
function marbleSvg(seed: string): string {
  const [a, b] = paletteFor(seed);
  const r = rngFor(`marble:${seed}`);
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const cx = 20 + r() * 88;
    const cy = 20 + r() * 88;
    const rad = 24 + r() * 40;
    const c = i % 2 === 0 ? a : b;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(1)}" fill="${c}" opacity="0.85"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<defs><filter id="m"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="${Math.floor(r() * 100)}"/>` +
    `<feDisplacementMap in="SourceGraphic" scale="28"/></filter>` +
    `<clipPath id="cp"><rect width="${SIZE}" height="${SIZE}" rx="64"/></clipPath></defs>` +
    `<g clip-path="url(#cp)" filter="url(#m)"><rect width="${SIZE}" height="${SIZE}" fill="${b}"/>${blobs}</g></svg>`;
}

/** Boring-beam-inspired: diagonal beams + face + eyes. */
function beamSvg(seed: string): string {
  const [a, b] = paletteFor(seed);
  const r = rngFor(`beam:${seed}`);
  const beamW = 12 + r() * 18;
  const beamX = 20 + r() * 60;
  const faceX = 32 + r() * 32;
  const faceW = SIZE - faceX - 24;
  const eyeY = 78 + r() * 14;
  const eyeH = 10 + r() * 10;
  const eyeGap = faceX + faceW / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<defs><clipPath id="cp"><rect width="${SIZE}" height="${SIZE}" rx="64"/></clipPath></defs>` +
    `<g clip-path="url(#cp)">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="${b}"/>` +
    `<rect x="${beamX.toFixed(1)}" y="0" width="${beamW.toFixed(1)}" height="${SIZE}" fill="${a}" transform="rotate(25 ${SIZE / 2} ${SIZE / 2})"/>` +
    `<rect x="-30" y="${(SIZE * 0.55).toFixed(0)}" width="200" height="${(SIZE * 0.45).toFixed(0)}" fill="${a}"/>` +
    `<rect x="${faceX.toFixed(1)}" y="24" width="${faceW.toFixed(1)}" height="${(SIZE - 48).toFixed(0)}" rx="18" fill="#ffffff" opacity="0.92"/>` +
    `<rect x="${(eyeGap - 14).toFixed(1)}" y="${eyeY.toFixed(1)}" width="7" height="${eyeH.toFixed(1)}" rx="3.5" fill="${b}"/>` +
    `<rect x="${(eyeGap + 7).toFixed(1)}" y="${eyeY.toFixed(1)}" width="7" height="${eyeH.toFixed(1)}" rx="3.5" fill="${b}"/>` +
    `</g></svg>`;
}

/** Boring-pixel-inspired: symmetric 5x5 grid. */
function pixelSvg(seed: string): string {
  const [a, b] = paletteFor(seed);
  const r = rngFor(`pixel:${seed}`);
  const cell = SIZE / 5;
  let cells = '';
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x <= 2; x++) {
      if (r() > 0.55) continue;
      const color = r() > 0.5 ? a : b;
      cells += `<rect x="${(x * cell).toFixed(1)}" y="${(y * cell).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="${color}"/>`;
      if (x < 2) {
        cells += `<rect x="${((4 - x) * cell).toFixed(1)}" y="${(y * cell).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="${color}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<defs><clipPath id="cp"><rect width="${SIZE}" height="${SIZE}" rx="64"/></clipPath></defs>` +
    `<g clip-path="url(#cp)"><rect width="${SIZE}" height="${SIZE}" fill="#0b1120"/>${cells}</g></svg>`;
}

/** Concentric arcs — orbit motif. */
function ringsSvg(seed: string): string {
  const [a, b] = paletteFor(seed);
  const r = rngFor(`rings:${seed}`);
  let arcs = '';
  for (let i = 5; i >= 1; i--) {
    const rad = 12 + i * 11;
    const dash = 40 + r() * 160;
    const rot = r() * 360;
    arcs += `<circle cx="64" cy="64" r="${rad}" fill="none" stroke="${i % 2 ? a : b}" stroke-width="7" ` +
      `stroke-dasharray="${dash.toFixed(0)} 400" stroke-linecap="round" transform="rotate(${rot.toFixed(0)} 64 64)"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<defs><clipPath id="cp"><rect width="${SIZE}" height="${SIZE}" rx="64"/></clipPath></defs>` +
    `<g clip-path="url(#cp)"><rect width="${SIZE}" height="${SIZE}" fill="#0b1120"/>${arcs}</g></svg>`;
}

/* ------------------------------- Data URLs -------------------------------- */

export function avatarDataUrl(style: AvatarStyle, seed: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(generateAvatarSvg(style, seed))}`;
}
