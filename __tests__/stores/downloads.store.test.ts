import { describe, it, expect, beforeEach } from 'vitest';
import { useDownloadsStore, DownloadItem } from '@/lib/stores/downloads.store';

function makeItem(overrides: Partial<DownloadItem> = {}): DownloadItem {
  return {
    id: 'dl-1',
    url: 'https://example.com/file.pdf',
    filename: 'file.pdf',
    mimeType: 'application/pdf',
    status: 'downloading',
    progress: 0,
    receivedBytes: 0,
    totalBytes: 100,
    addedAt: Date.now(),
    ...overrides,
  };
}

describe('downloads store', () => {
  beforeEach(() => {
    useDownloadsStore.setState({ downloads: [], _loaded: false });
  });

  it('adds a download to the front of the list', () => {
    useDownloadsStore.getState().addDownload(makeItem());
    useDownloadsStore.getState().addDownload(makeItem({ id: 'dl-2', filename: 'b.pdf' }));

    const downloads = useDownloadsStore.getState().downloads;
    expect(downloads).toHaveLength(2);
    expect(downloads[0]!.filename).toBe('b.pdf');
  });

  it('updates a download by id', () => {
    useDownloadsStore.getState().addDownload(makeItem());
    useDownloadsStore.getState().updateDownload('dl-1', { status: 'done', progress: 100, filePath: 'Downloads/file.pdf' });

    const item = useDownloadsStore.getState().downloads[0];
    expect(item?.status).toBe('done');
    expect(item?.progress).toBe(100);
    expect(item?.filePath).toBe('Downloads/file.pdf');
    expect(item?.url).toBe('https://example.com/file.pdf');
  });

  it('removes a download by id', () => {
    useDownloadsStore.getState().addDownload(makeItem());
    useDownloadsStore.getState().addDownload(makeItem({ id: 'dl-2' }));
    useDownloadsStore.getState().removeDownload('dl-1');

    expect(useDownloadsStore.getState().downloads.map(d => d.id)).toEqual(['dl-2']);
  });

  it('clears only completed downloads', () => {
    useDownloadsStore.getState().addDownload(makeItem({ id: 'dl-active' }));
    useDownloadsStore.getState().addDownload(makeItem({ id: 'dl-err', status: 'error', error: 'x' }));
    useDownloadsStore.getState().addDownload(makeItem({ id: 'dl-done', status: 'done', progress: 100 }));

    useDownloadsStore.getState().clearCompleted();

    const remaining = useDownloadsStore.getState().downloads.map(d => d.id).sort();
    expect(remaining).toEqual(['dl-active', 'dl-err']);
  });
});
