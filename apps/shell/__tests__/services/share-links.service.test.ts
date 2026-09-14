import { describe, it, expect, beforeEach } from 'vitest';
import {
  createShareLink,
  validateShareLink,
  recordDownload,
  revokeShareLink,
  deleteShareLink,
  getShareLinksForFile,
  getActiveShareLinks,
  cleanupExpiredLinks,
  getShareLinkDisplayUrl,
} from '@/lib/services/share-links.service';

describe('share-links.service', () => {
  beforeEach(async () => {
    const { clear } = await import('idb-keyval');
    await clear();
  });

  it('creates a share link with a token', async () => {
    const link = await createShareLink({
      fileId: 'file-1',
      fileName: 'design.png',
      fileSize: 1024,
      expiry: '24h',
      createdBy: 'user-1',
    });
    expect(link.id).toBeTruthy();
    expect(link.token).toBeTruthy();
    expect(link.token.length).toBe(64); // 32 bytes hex
    expect(link.fileId).toBe('file-1');
    expect(link.revoked).toBe(false);
    expect(link.downloadCount).toBe(0);
  });

  it('sets expiry correctly', async () => {
    const link = await createShareLink({
      fileId: 'file-1',
      fileName: 'doc.pdf',
      fileSize: 2048,
      expiry: '1h',
      createdBy: 'user-1',
    });
    const diff = link.expiresAt - link.createdAt;
    expect(diff).toBeCloseTo(3600 * 1000, -3);
  });

  it('validates a valid link', async () => {
    const link = await createShareLink({
      fileId: 'file-1',
      fileName: 'doc.pdf',
      fileSize: 100,
      expiry: '24h',
      createdBy: 'user-1',
    });
    const result = await validateShareLink(link.token);
    expect(result.valid).toBe(true);
    expect(result.link).toBeDefined();
  });

  it('rejects non-existent token', async () => {
    const result = await validateShareLink('nonexistent');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Link not found or revoked');
  });

  it('rejects revoked link', async () => {
    const link = await createShareLink({
      fileId: 'file-1',
      fileName: 'doc.pdf',
      fileSize: 100,
      expiry: '24h',
      createdBy: 'user-1',
    });
    await revokeShareLink(link.id);
    const result = await validateShareLink(link.token);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Link not found or revoked');
  });

  it('enforces download limit', async () => {
    const link = await createShareLink({
      fileId: 'file-1',
      fileName: 'doc.pdf',
      fileSize: 100,
      expiry: '24h',
      maxDownloads: 2,
      createdBy: 'user-1',
    });
    await recordDownload(link.token);
    await recordDownload(link.token);
    const result = await validateShareLink(link.token);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Download limit reached');
  });

  it('requires password when set', async () => {
    const link = await createShareLink({
      fileId: 'file-1',
      fileName: 'secret.pdf',
      fileSize: 100,
      expiry: '24h',
      password: 's3cret',
      createdBy: 'user-1',
    });
    const noPass = await validateShareLink(link.token);
    expect(noPass.valid).toBe(false);
    expect(noPass.error).toBe('Password required');

    const wrongPass = await validateShareLink(link.token, 'wrong');
    expect(wrongPass.valid).toBe(false);
    expect(wrongPass.error).toBe('Invalid password');

    const correctPass = await validateShareLink(link.token, 's3cret');
    expect(correctPass.valid).toBe(true);
  });

  it('records downloads', async () => {
    const link = await createShareLink({
      fileId: 'file-1',
      fileName: 'doc.pdf',
      fileSize: 100,
      expiry: '24h',
      createdBy: 'user-1',
    });
    await recordDownload(link.token);
    await recordDownload(link.token);
    const result = await validateShareLink(link.token);
    expect(result.link?.downloadCount).toBe(2);
  });

  it('deletes share link', async () => {
    const link = await createShareLink({
      fileId: 'file-1',
      fileName: 'doc.pdf',
      fileSize: 100,
      expiry: '24h',
      createdBy: 'user-1',
    });
    await deleteShareLink(link.id);
    const result = await validateShareLink(link.token);
    expect(result.valid).toBe(false);
  });

  it('filters share links by file', async () => {
    await createShareLink({
      fileId: 'file-1',
      fileName: 'a.pdf',
      fileSize: 100,
      expiry: '24h',
      createdBy: 'user-1',
    });
    await createShareLink({
      fileId: 'file-2',
      fileName: 'b.pdf',
      fileSize: 200,
      expiry: '24h',
      createdBy: 'user-1',
    });
    const links = await getShareLinksForFile('file-1');
    expect(links.length).toBe(1);
    expect(links[0]!.fileName).toBe('a.pdf');
  });

  it('gets active share links', async () => {
    await createShareLink({
      fileId: 'f1',
      fileName: 'a.pdf',
      fileSize: 100,
      expiry: '24h',
      createdBy: 'user-1',
    });
    const active = await getActiveShareLinks();
    expect(active.length).toBeGreaterThanOrEqual(1);
  });

  it('cleans up expired links', async () => {
    const { set } = await import('idb-keyval');
    const expiredLink = {
      id: 'exp-1',
      fileId: 'f1',
      fileName: 'old.pdf',
      fileSize: 100,
      createdAt: Date.now() - 100000,
      expiresAt: Date.now() - 1000, // expired
      token: 'expiredtoken',
      downloadCount: 0,
      revoked: false,
      createdBy: 'user-1',
    };
    await set('continuaos-share-links', [expiredLink]);
    const removed = await cleanupExpiredLinks();
    expect(removed).toBe(1);
    const active = await getActiveShareLinks();
    expect(active.length).toBe(0);
  });

  it('generates display URL', () => {
    const url = getShareLinkDisplayUrl('abc123');
    expect(url).toContain('/share/abc123');
  });
});
