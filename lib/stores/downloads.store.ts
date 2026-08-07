/**
 * Downloads Zustand Store — tracks in-OS downloads.
 *
 * All persistence through Context Layer (readDomain/writeDomain).
 */
import { create } from 'zustand';
import { readDomain, writeDomain } from '@/lib/context-layer';

const DOMAIN = 'downloads';

export type DownloadStatus = 'queued' | 'downloading' | 'done' | 'error';

export type DownloadItem = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  status: DownloadStatus;
  progress: number;
  receivedBytes: number;
  totalBytes: number;
  filePath?: string;
  error?: string;
  addedAt: number;
  completedAt?: number;
};

type DownloadsState = {
  downloads: DownloadItem[];
  _loaded: boolean;

  addDownload: (item: DownloadItem) => void;
  updateDownload: (id: string, patch: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
  loadPersisted: () => Promise<void>;
  persist: () => void;
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistDownloads(state: DownloadsState) {
  if (!state._loaded) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    writeDomain(DOMAIN, { downloads: state.downloads });
  }, 2000);
}

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  downloads: [],
  _loaded: false,

  addDownload: (item) => {
    set(s => ({ downloads: [item, ...s.downloads].slice(0, 200) }));
    persistDownloads(get());
  },

  updateDownload: (id, patch) => {
    set(s => ({
      downloads: s.downloads.map(d => (d.id === id ? { ...d, ...patch } : d)),
    }));
    persistDownloads(get());
  },

  removeDownload: (id) => {
    set(s => ({ downloads: s.downloads.filter(d => d.id !== id) }));
    persistDownloads(get());
  },

  clearCompleted: () => {
    set(s => ({ downloads: s.downloads.filter(d => d.status !== 'done') }));
    persistDownloads(get());
  },

  loadPersisted: async () => {
    try {
      const data = await readDomain<Partial<DownloadsState>>(DOMAIN);
      if (data?.downloads) {
        set({ downloads: data.downloads, _loaded: true });
        return;
      }
    } catch {
      // fall through to default
    }
    set({ _loaded: true });
  },

  persist: () => persistDownloads(get()),
}));
