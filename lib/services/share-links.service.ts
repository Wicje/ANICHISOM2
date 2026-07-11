/**
 * Share Links Service — generates time-limited share links for files.
 *
 * Supports:
 * - Password-protected links
 * - Expiration (1h, 24h, 7d, 30d, custom)
 * - Download limits
 * - Link revocation
 */
import { get as idbGet, set as idbSet } from 'idb-keyval';

const SHARE_LINKS_KEY = 'anichisom-share-links';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ShareLink {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  createdAt: number;
  expiresAt: number;
  token: string;
  password?: string; // hashed
  maxDownloads?: number;
  downloadCount: number;
  revoked: boolean;
  createdBy: string;
}

export type ExpiryDuration = '1h' | '24h' | '7d' | '30d' | 'custom';

export interface CreateShareLinkOptions {
  fileId: string;
  fileName: string;
  fileSize: number;
  expiry: ExpiryDuration;
  customExpiryMs?: number;
  password?: string;
  maxDownloads?: number;
  createdBy: string;
}

// ─── Token Generation ─────────────────────────────────────────────────────

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// ─── Expiry Calculation ───────────────────────────────────────────────────

function getExpiryMs(expiry: ExpiryDuration, customMs?: number): number {
  switch (expiry) {
    case '1h': return 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
    case 'custom': return customMs || 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

// ─── CRUD Operations ──────────────────────────────────────────────────────

export async function createShareLink(
  options: CreateShareLinkOptions,
): Promise<ShareLink> {
  const links = await getAllShareLinks();
  
  const link: ShareLink = {
    id: crypto.randomUUID(),
    fileId: options.fileId,
    fileName: options.fileName,
    fileSize: options.fileSize,
    createdAt: Date.now(),
    expiresAt: Date.now() + getExpiryMs(options.expiry, options.customExpiryMs),
    token: generateToken(),
    password: options.password ? await hashPassword(options.password) : undefined,
    maxDownloads: options.maxDownloads,
    downloadCount: 0,
    revoked: false,
    createdBy: options.createdBy,
  };

  links.push(link);
  await idbSet(SHARE_LINKS_KEY, links);

  return link;
}

export async function getShareLink(token: string): Promise<ShareLink | null> {
  const links = await getAllShareLinks();
  return links.find((l) => l.token === token && !l.revoked) || null;
}

export async function validateShareLink(
  token: string,
  password?: string,
): Promise<{ valid: boolean; link?: ShareLink; error?: string }> {
  const link = await getShareLink(token);

  if (!link) {
    return { valid: false, error: 'Link not found or revoked' };
  }

  if (Date.now() > link.expiresAt) {
    return { valid: false, error: 'Link has expired' };
  }

  if (link.maxDownloads && link.downloadCount >= link.maxDownloads) {
    return { valid: false, error: 'Download limit reached' };
  }

  if (link.password && password) {
    const valid = await verifyPassword(password, link.password);
    if (!valid) {
      return { valid: false, error: 'Invalid password' };
    }
  } else if (link.password && !password) {
    return { valid: false, error: 'Password required' };
  }

  return { valid: true, link };
}

export async function recordDownload(token: string): Promise<void> {
  const links = await getAllShareLinks();
  const link = links.find((l) => l.token === token);
  if (link) {
    link.downloadCount++;
    await idbSet(SHARE_LINKS_KEY, links);
  }
}

export async function revokeShareLink(id: string): Promise<void> {
  const links = await getAllShareLinks();
  const link = links.find((l) => l.id === id);
  if (link) {
    link.revoked = true;
    await idbSet(SHARE_LINKS_KEY, links);
  }
}

export async function deleteShareLink(id: string): Promise<void> {
  const links = await getAllShareLinks();
  const filtered = links.filter((l) => l.id !== id);
  await idbSet(SHARE_LINKS_KEY, filtered);
}

export async function getAllShareLinks(): Promise<ShareLink[]> {
  return (await idbGet<ShareLink[]>(SHARE_LINKS_KEY)) || [];
}

export async function getShareLinksForFile(fileId: string): Promise<ShareLink[]> {
  const links = await getAllShareLinks();
  return links.filter((l) => l.fileId === fileId && !l.revoked);
}

export async function getActiveShareLinks(): Promise<ShareLink[]> {
  const links = await getAllShareLinks();
  const now = Date.now();
  return links.filter((l) => !l.revoked && now < l.expiresAt);
}

export async function cleanupExpiredLinks(): Promise<number> {
  const links = await getAllShareLinks();
  const now = Date.now();
  const active = links.filter((l) => l.revoked || now < l.expiresAt);
  const removed = links.length - active.length;
  if (removed > 0) {
    await idbSet(SHARE_LINKS_KEY, active);
  }
  return removed;
}

// ─── Link URL Generation ──────────────────────────────────────────────────

export function getShareLinkUrl(token: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/share/${token}`;
}

export function getShareLinkDisplayUrl(token: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(`/share/${token}`, window.location.origin);
  return url.toString();
}
