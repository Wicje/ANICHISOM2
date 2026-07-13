import { get as idbGet, set as idbSet } from 'idb-keyval';

export type DownloadItem = {
  id: string;
  url: string;
  filename: string;
  size?: number;
  mimeType?: string;
  timestamp: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  savedPath?: string; // OPFS path if saved to Files
  blob?: Blob;
};

const DOWNLOADS_KEY = 'anichisom_browser_downloads';

/**
 * Download service — intercepts browser downloads and routes them to Files (OPFS).
 * Handles the full lifecycle: intercept → download → save to OPFS → cleanup.
 */
export const DownloadService = {
  async interceptDownload(url: string, filename?: string): Promise<DownloadItem> {
    const item: DownloadItem = {
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url,
      filename: filename || url.split('/').pop() || 'download',
      timestamp: Date.now(),
      status: 'pending',
    };

    // Start download
    try {
      item.status = 'downloading';
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      item.blob = blob;
      item.size = blob.size;
      item.mimeType = blob.type;

      // Save to OPFS
      const savedPath = await this.saveToOPFS(item.filename, blob);
      item.savedPath = savedPath;
      item.status = 'completed';

      // Persist download history
      await this.addDownloadHistory(item);

      return item;
    } catch (err) {
      item.status = 'failed';
      await this.addDownloadHistory(item);
      throw err;
    }
  },

  async saveToOPFS(filename: string, blob: Blob): Promise<string> {
    try {
      const root = await navigator.storage.getDirectory();
      const downloadsDir = await root.getDirectoryHandle('Downloads', { create: true });
      const fileHandle = await downloadsDir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return `Downloads/${filename}`;
    } catch {
      // Fallback: create object URL for in-memory access
      const url = URL.createObjectURL(blob);
      return url;
    }
  },

  async addDownloadHistory(item: DownloadItem): Promise<void> {
    const history = (await idbGet<DownloadItem[]>(DOWNLOADS_KEY)) || [];
    // Don't store blob in IndexedDB — too large
    const { blob, ...safeItem } = item;
    history.unshift(safeItem);
    // Keep last 100 downloads
    if (history.length > 100) history.length = 100;
    await idbSet(DOWNLOADS_KEY, history);
  },

  async getDownloadHistory(): Promise<DownloadItem[]> {
    return (await idbGet<DownloadItem[]>(DOWNLOADS_KEY)) || [];
  },

  async clearHistory(): Promise<void> {
    await idbSet(DOWNLOADS_KEY, []);
  },

  /**
   * Extract filename from Content-Disposition header or URL.
   */
  getFilenameFromHeaders(headers: Headers, url: string): string {
    const disposition = headers.get('content-disposition');
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
      if (match) return decodeURIComponent(match[1]!);
    }
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop() || 'download';
    } catch {
      return 'download';
    }
  },
};
