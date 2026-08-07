import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FS } from '@/lib/fs';
import { useDownloadsStore } from '@/lib/stores/downloads.store';
import {
  startDownload,
  saveBlobDownload,
  filenameFromUrl,
  safeFilename,
  looksLikeDownloadUrl,
  uniqueFilename,
  blobIsProxyError,
} from '@/lib/services/download-manager.service';

describe('download filename helpers', () => {
  it('derives a filename from a URL path', () => {
    expect(filenameFromUrl('https://example.com/files/report.pdf')).toBe('report.pdf');
    expect(filenameFromUrl('https://example.com/a/b/pic.JPG?dl=1')).toBe('pic.JPG');
    expect(filenameFromUrl('https://example.com/')).toBe('download');
    expect(filenameFromUrl('https://example.com/folder/')).toBe('download');
  });

  it('falls back to a default when no filename is present', () => {
    expect(filenameFromUrl('https://example.com', 'myfile')).toBe('myfile');
  });

  it('sanitizes unsafe filename characters', () => {
    expect(safeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
    expect(safeFilename('   ')).toBe('download');
    expect(safeFilename('')).toBe('download');
  });

  it('detects file-like URLs', () => {
    expect(looksLikeDownloadUrl('https://example.com/report.pdf')).toBe(true);
    expect(looksLikeDownloadUrl('https://example.com/file.zip?download=1')).toBe(true);
    expect(looksLikeDownloadUrl('https://example.com/page')).toBe(false);
    expect(looksLikeDownloadUrl('not-a-url')).toBe(false);
  });
});

describe('uniqueFilename', () => {
  beforeEach(async () => {
    useDownloadsStore.setState({ downloads: [], _loaded: false });
  });

  it('returns the name unchanged when the folder is empty', async () => {
    expect(await uniqueFilename('Downloads', 'report.pdf')).toBe('report.pdf');
  });

  it('appends a numeric suffix when the name exists', async () => {
    await FS.write('Downloads/report.pdf', 'existing', 'application/pdf');
    expect(await uniqueFilename('Downloads', 'report.pdf')).toBe('report (1).pdf');
  });
});

describe('blobIsProxyError', () => {
  it('detects proxy error pages', async () => {
    const err = new Blob(['<!DOCTYPE html><h2>Proxy Error</h2>'], { type: 'text/html' });
    expect(await blobIsProxyError(err)).toBe(true);
    const rate = new Blob(['<!DOCTYPE html><h2>Rate Limited</h2>'], { type: 'text/html' });
    expect(await blobIsProxyError(rate)).toBe(true);
  });

  it('allows legitimate HTML content', async () => {
    const page = new Blob(['<!DOCTYPE html><h2>Welcome</h2><p>Downloads today: 12</p>'], { type: 'text/html' });
    expect(await blobIsProxyError(page)).toBe(false);
    const binary = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' });
    expect(await blobIsProxyError(binary)).toBe(false);
  });
});

describe('startDownload', () => {
  beforeEach(async () => {
    useDownloadsStore.setState({ downloads: [], _loaded: false });
    await useDownloadsStore.getState().loadPersisted();
    vi.unstubAllGlobals();
  });

  it('downloads through the proxy and writes the file into the OS', async () => {
    // Note: pass a string body — undici stringifies jsdom Blobs in the test env.
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('hello from the web', { headers: { 'content-type': 'text/plain', 'content-length': '18' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const id = await startDownload('https://example.com/files/hello.txt');

    expect(id).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/proxy?url=https%3A%2F%2Fexample.com%2Ffiles%2Fhello.txt', expect.anything());

    const item = useDownloadsStore.getState().downloads.find(d => d.id === id);
    expect(item?.status).toBe('done');
    expect(item?.filePath).toBe('Downloads/hello.txt');
    expect(item?.progress).toBe(100);

    const file = await FS.read('Downloads/hello.txt');
    expect(file?.content).toBe('hello from the web');
  });

  it('marks downloads as failed when the proxy returns an error page', async () => {
    const errHtml = '<!DOCTYPE html><h2>Proxy Error</h2><p>fetch failed</p>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(errHtml, { headers: { 'content-type': 'text/html' } })
    ));

    const id = await startDownload('https://example.com/missing.pdf');
    expect(id).toBeNull();

    const item = useDownloadsStore.getState().downloads.find(d => d.url === 'https://example.com/missing.pdf');
    expect(item?.status).toBe('error');
    expect(item?.error).toBeTruthy();
  });

  it('dedupes concurrent downloads of the same URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(['x'], { type: 'text/plain' }), { headers: { 'content-type': 'text/plain' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const [idA, idB] = await Promise.all([
      startDownload('https://example.com/same.pdf'),
      startDownload('https://example.com/same.pdf'),
    ]);

    expect(idA).toBe(idB);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('saveBlobDownload', () => {
  beforeEach(async () => {
    useDownloadsStore.setState({ downloads: [], _loaded: false });
    await useDownloadsStore.getState().loadPersisted();
  });

  it('writes a captured blob into the OS file system', async () => {
    const id = await saveBlobDownload({
      blob: new Blob(['blob bytes'], { type: 'image/png' }),
      filename: 'capture.png',
      url: '',
    });

    expect(id).toBeTruthy();
    const item = useDownloadsStore.getState().downloads.find(d => d.id === id);
    expect(item?.status).toBe('done');
    expect(item?.filePath).toBe('Downloads/capture.png');

    const file = await FS.read('Downloads/capture.png');
    expect(file?.name).toBe('capture.png');
    expect(file?.mimeType).toBe('image/png');
    expect(file?.content).toContain('blob:');
  });
});
