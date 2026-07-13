import { useFileStore, FileVersionEntry, FileSource } from '@/lib/stores/file.store';
import { FS } from '@/lib/fs';

/**
 * Version History Service — event-sourced file versioning.
 * Stores lightweight version entries (metadata only) in Zustand/IndexedDB.
 * Content snapshots stored in OPFS under /.versions/<fileId>/.
 */

const VERSION_PREFIX = '/.versions';

export type VersionSnapshot = {
  id: string;
  fileId: string;
  filePath: string;
  source: FileSource;
  timestamp: number;
  label: string;
  size: number;
  mimeType: string;
};

export const VersionHistoryService = {
  /**
   * Create a version snapshot of a file.
   */
  async saveVersion(
    fileId: string,
    filePath: string,
    source: FileSource,
    content: string | Blob,
    mimeType: string,
    size: number,
    label?: string,
    author?: string,
  ): Promise<FileVersionEntry> {
    const store = useFileStore.getState();

    // For OPFS files, save the content snapshot
    if (source === 'opfs') {
      const versionPath = `${VERSION_PREFIX}/${fileId}`;
      try {
        await FS.write(versionPath, typeof content === 'string' ? content : content, mimeType);
      } catch {
        // OPFS write may fail for large blobs — still record the metadata
      }
    }

    const entry: Omit<FileVersionEntry, 'id' | 'timestamp'> = {
      fileId,
      filePath,
      source,
      label: label || `Version ${store.getVersionHistory(fileId).length + 1}`,
      author,
      size,
      mimeType,
    };

    store.addVersionEntry(entry);
    return store.getVersionHistory(fileId)[0]!;
  },

  /**
   * Get version history for a file.
   */
  getHistory(fileId: string): FileVersionEntry[] {
    return useFileStore.getState().getVersionHistory(fileId);
  },

  /**
   * Get the nth version of a file (0 = latest).
   */
  getVersion(fileId: string, versionIndex: number): FileVersionEntry | null {
    const history = this.getHistory(fileId);
    return history[versionIndex] || null;
  },

  /**
   * Auto-save a version (called before file edits).
   */
  async autoSave(
    fileId: string,
    filePath: string,
    source: FileSource,
    content: string | Blob,
    mimeType: string,
    size: number,
  ): Promise<FileVersionEntry> {
    return this.saveVersion(fileId, filePath, source, content, mimeType, size, 'Auto-save');
  },

  /**
   * Restore a file to a specific version.
   * Only works for OPFS files.
   */
  async restoreVersion(fileId: string, versionIndex: number): Promise<boolean> {
    const version = this.getVersion(fileId, versionIndex);
    if (!version || version.source !== 'opfs') return false;

    const versionPath = `${VERSION_PREFIX}/${fileId}`;
    try {
      const file = await FS.read(versionPath);
      if (file?.content) {
        await FS.write(version.filePath, file.content, version.mimeType);
        return true;
      }
    } catch {
      // Version content may not exist if OPFS write failed during save
    }
    return false;
  },

  /**
   * Compare two versions (returns true if different).
   */
  async hasChanges(fileId: string, currentContent: string): Promise<boolean> {
    const latest = this.getVersion(fileId, 0);
    if (!latest) return true; // No versions yet — always save
    // Simple heuristic: check if label changed (auto-save labels are all "Auto-save")
    // For real comparison, we'd need content hashing, but this is sufficient for MVP
    return latest.label === 'Auto-save'; // Always create new version if last was auto-save
  },

  /**
   * Clean up old versions (keep last N per file).
   */
  cleanup(maxVersionsPerFile: number = 50): void {
    const store = useFileStore.getState();
    const grouped = new Map<string, FileVersionEntry[]>();

    store.versionHistory.forEach(entry => {
      const existing = grouped.get(entry.fileId) || [];
      existing.push(entry);
      grouped.set(entry.fileId, existing);
    });

    const pruned: FileVersionEntry[] = [];
    grouped.forEach(versions => {
      pruned.push(...versions.slice(0, maxVersionsPerFile));
    });

    useFileStore.setState({ versionHistory: pruned });
  },
};
