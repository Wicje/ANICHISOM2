import { describe, expect, it } from 'vitest';
import {
  AVATAR_STYLES,
  avatarDataUrl,
  generateAvatarSvg,
  initialsFor,
  paletteFor,
} from '@/lib/avatar-engine';

describe('initialsFor', () => {
  it('takes first letters of the first two words', () => {
    expect(initialsFor('Ada Lovelace')).toBe('AL');
    expect(initialsFor('  grace   hopper ')).toBe('GH');
  });

  it('falls back to two characters of a single word', () => {
    expect(initialsFor('zk3')).toBe('ZK');
    expect(initialsFor('a')).toBe('A');
  });

  it('handles empty input', () => {
    expect(initialsFor('')).toBe('??');
    expect(initialsFor('   ')).toBe('??');
  });
});

describe('generateAvatarSvg', () => {
  it.each(AVATAR_STYLES.map((s) => s.id))('produces valid SVG for %s', (style) => {
    const svg = generateAvatarSvg(style, 'ada@continua.dev');
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 128 128">/);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg.length).toBeGreaterThan(100);
  });

  it('is deterministic for the same seed + style', () => {
    const a = generateAvatarSvg('beam', 'user-42');
    const b = generateAvatarSvg('beam', 'user-42');
    expect(a).toBe(b);
  });

  it('differs across seeds and styles', () => {
    expect(generateAvatarSvg('pixel', 'a')).not.toBe(generateAvatarSvg('pixel', 'b'));
    expect(generateAvatarSvg('marble', 'same')).not.toBe(generateAvatarSvg('rings', 'same'));
  });

  it('escapes user-controlled text in gradient initials', () => {
    const svg = generateAvatarSvg('gradient', '<script>alert(1)</script>');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;S'); // escaped initial characters
  });
});

describe('avatarDataUrl', () => {
  it('produces an inline SVG data URL usable as <img src>', () => {
    const url = avatarDataUrl('gradient', 'Ada Lovelace');
    expect(url.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    const svg = decodeURIComponent(url.slice(url.indexOf(',') + 1));
    expect(svg).toContain('AL'); // initials rendered
  });
});

describe('paletteFor', () => {
  it('returns a stable two-color palette per seed', () => {
    expect(paletteFor('x')).toEqual(paletteFor('x'));
    expect(paletteFor('x').length).toBe(2);
  });
});
