'use client';

export interface ClipboardEntry {
  id: string;
  text: string;
  timestamp: number;
  source?: string;
}

const IDB_DB = 'anichisom-clipboard';
const IDB_STORE = 'entries';
const MAX_ENTRIES = 50;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

class ClipboardHistoryService {
  private entries: ClipboardEntry[] = [];
  private loaded = false;
  private listeners: Set<() => void> = new Set();

  async load(): Promise<void> {
    if (this.loaded) return;
    const db = await openDB();
    if (!db) { this.loaded = true; return; }
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        this.entries = (req.result as ClipboardEntry[])
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_ENTRIES);
        this.loaded = true;
        this.notify();
      };
    } catch {
      this.loaded = true;
    }
  }

  async add(text: string, source?: string): Promise<void> {
    if (!text.trim() || text.length > 10000) return;
    if (this.entries.length > 0 && this.entries[0]!.text === text) return;

    const entry: ClipboardEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      timestamp: Date.now(),
      source,
    };

    this.entries = [entry, ...this.entries].slice(0, MAX_ENTRIES);
    this.notify();

    const db = await openDB();
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(entry);
    } catch {}
  }

  async remove(id: string): Promise<void> {
    this.entries = this.entries.filter((e) => e.id !== id);
    this.notify();
    const db = await openDB();
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
    } catch {}
  }

  async clear(): Promise<void> {
    this.entries = [];
    this.notify();
    const db = await openDB();
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
    } catch {}
  }

  getEntries(): ClipboardEntry[] {
    return this.entries;
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }
}

export const clipboardHistory = new ClipboardHistoryService();
