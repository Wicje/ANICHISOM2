import { get, set, del, keys } from 'idb-keyval';

const objectUrlsByKey = new Map<string, string>();

function rememberObjectUrl(key: string, blob: Blob): string {
  const existing = objectUrlsByKey.get(key);
  if (existing) URL.revokeObjectURL(existing);

  const next = URL.createObjectURL(blob);
  objectUrlsByKey.set(key, next);
  return next;
}

function revokeObjectUrlForKey(key: string): void {
  const existing = objectUrlsByKey.get(key);
  if (existing) {
    URL.revokeObjectURL(existing);
    objectUrlsByKey.delete(key);
  }
}

function revokeObjectUrlsUnderPath(path: string): void {
  const prefix = path ? `${path}/` : '';
  for (const [key, url] of objectUrlsByKey.entries()) {
    if (key === path || (prefix && key.startsWith(prefix))) {
      URL.revokeObjectURL(url);
      objectUrlsByKey.delete(key);
    }
  }
}

if (typeof window !== 'undefined') {
  const cleanup = (e?: PageTransitionEvent | Event) => {
    if (e && 'persisted' in e && (e as PageTransitionEvent).persisted) {
      return; // Skip cleanup when entering BFCache
    }
    for (const url of objectUrlsByKey.values()) {
      URL.revokeObjectURL(url);
    }
    objectUrlsByKey.clear();
  };

  const previousCleanup = (window as any).__continuaos_fs_url_cleanup;
  if (previousCleanup) {
    window.removeEventListener('beforeunload', previousCleanup);
  }

  window.addEventListener('beforeunload', cleanup);
  (window as any).__continuaos_fs_url_cleanup = cleanup;
}

const MIME_BY_EXT: Record<string, string> = {
  '.txt': 'text/plain', '.md': 'text/markdown', '.csv': 'text/csv',
  '.json': 'application/json', '.xml': 'application/xml',
  '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css',
  '.js': 'text/javascript', '.ts': 'text/typescript', '.tsx': 'text/typescript',
  '.jsx': 'text/javascript', '.py': 'text/x-python', '.rb': 'text/x-ruby',
  '.go': 'text/x-go', '.rs': 'text/x-rust', '.java': 'text/x-java',
  '.c': 'text/x-c', '.cpp': 'text/x-c++', '.h': 'text/x-c',
  '.sh': 'text/x-shellscript', '.bash': 'text/x-shellscript',
  '.yaml': 'text/yaml', '.yml': 'text/yaml', '.toml': 'text/plain',
  '.pdf': 'application/pdf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp', '.ico': 'image/x-icon', '.tiff': 'image/tiff',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.flac': 'audio/flac', '.aac': 'audio/aac',
  '.zip': 'application/zip', '.tar': 'application/x-tar',
  '.gz': 'application/gzip', '.rar': 'application/vnd.rar',
  '.psd': 'image/vnd.adobe.photoshop', '.ai': 'application/postscript',
  '.figma': 'application/x-figma',
};

function inferMimeType(name: string): string {
  const ext = name.includes('.') ? '.' + name.split('.').pop()!.toLowerCase() : '';
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

// Abstraction for File System operations allowing seamless pivot to Tauri.
export interface LocalFile {
  id: string;
  name: string;
  content?: string;
  size?: number;
  mimeType?: string;
  isFolder?: boolean;
  modified?: number;
}

export const FS = {
  /** Revoke an object URL previously created by FS.read or FS.readDir */
  revokeUrl: (url: string) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      for (const [key, storedUrl] of objectUrlsByKey.entries()) {
        if (storedUrl === url) objectUrlsByKey.delete(key);
      }
    }
  },

  // Helper to resolve nested directories in OPFS
  _resolvePath: async (path: string, createDirs = false) => {
     const parts = path.split('/').filter(Boolean);
     const fileName = parts.pop() || '';
     let current = await navigator.storage.getDirectory();
     
     for (const part of parts) {
        current = await current.getDirectoryHandle(part, { create: createDirs });
     }
     return { dir: current, name: fileName };
  },

  // Read a file using OPFS or fallback to IndexedDB.
  read: async (path: string): Promise<LocalFile | null> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
        const { dir, name } = await FS._resolvePath(path);
        const handle = await dir.getFileHandle(name);
        const file = await handle.getFile();
        
        // Read mimeType: try file.type, then .meta companion, then infer from extension
        let mimeType = file.type;
        if (!mimeType) {
          try {
            const metaHandle = await dir.getFileHandle(`${name}.meta`);
            const metaFile = await metaHandle.getFile();
            const meta = JSON.parse(await metaFile.text());
            mimeType = meta.mimeType || '';
          } catch {
            mimeType = inferMimeType(name);
          }
        }

        let content = '';
        // Use Object URLs for large binaries to prevent RAM exhaustion. Text files use raw strings.
        if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.includes('pdf') || mimeType.includes('octet-stream')) {
           content = rememberObjectUrl(`read:${path}`, file);
        } else {
           content = await file.text(); 
        }
        
        return {
          id: path,
          name: file.name,
          content,
          size: file.size,
          mimeType
        };
      }
    } catch (e) {
      console.warn(`OPFS read failed for ${path}, falling back to IndexedDB`, e);
    }
    
    // IndexedDB Fallback
    const file = await get(`file_${path}`);
    if (!file) return null;
    if (file.content instanceof Blob) {
      const mime = file.mimeType || file.content.type || inferMimeType(file.name);
      let content = '';
      if (mime.startsWith('image/') || mime.startsWith('video/') || mime.includes('pdf') || mime.includes('octet-stream')) {
        content = rememberObjectUrl(`read:${path}`, file.content);
      } else {
        content = await file.content.text();
      }
      return { ...file, content, mimeType: mime };
    }
    return file;
  },

  // Write a file to OPFS or IndexedDB
  write: async (path: string, content: string | Blob | File, mimeType?: string): Promise<void> => {
    const resolvedMime = mimeType || (content instanceof File ? content.type : '') || inferMimeType(path.split('/').pop() || '');
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
        const { dir, name } = await FS._resolvePath(path, true);
        const handle = await dir.getFileHandle(name, { create: true });
        
        // @ts-ignore
        const writable = await handle.createWritable();
        try {
          await writable.write(content);
          await writable.close();
        } catch (e) {
          try { await writable.close(); } catch { /* ignore close error */ }
          throw e;
        }

        // Write .meta companion file to persist mimeType
        try {
          const metaHandle = await dir.getFileHandle(`${name}.meta`, { create: true });
          // @ts-ignore
          const metaWritable = await metaHandle.createWritable();
          try {
            await metaWritable.write(JSON.stringify({ mimeType: resolvedMime }));
            await metaWritable.close();
          } catch {
            try { await metaWritable.close(); } catch { /* ignore */ }
          }
        } catch { /* meta write is best-effort */ }

        revokeObjectUrlForKey(`read:${path}`);
        revokeObjectUrlForKey(`dir:${path}`);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path } }));
        }
        return;
      }
    } catch (e) {
      console.warn(`OPFS write failed for ${path}, falling back to IndexedDB`, e);
    }
    
    // IndexedDB Fallback — natively supports storing Blob objects and text strings
    await set(`file_${path}`, {
      id: path,
      name: path.split('/').pop() || 'unknown',
      content: content, // Store Blob or string directly
      mimeType: resolvedMime,
      size: typeof content === 'string' ? content.length : content.size,
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path } }));
    }
  },

  // Create a directory in OPFS
  mkdir: async (path: string): Promise<void> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
        await FS._resolvePath(path, true);
        // Write a .keep sentinel so the directory persists even if empty
        try { await FS.write(`${path}/.keep`, ''); } catch { /* best-effort */ }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path } }));
        }
        return;
      }
    } catch (e) {
      console.warn(`OPFS mkdir failed for ${path}`, e);
    }
  },

  // List directory contents (non-recursive for top-level display)
  readDir: async (dirPath: string = ''): Promise<LocalFile[]> => {
    const files: LocalFile[] = [];
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
        
        const visited = new Set<string>();
        const MAX_RECURSION_DEPTH = 10;

        const traverse = async (currentDir: any, currentPath: string, depth: number) => {
           if (depth > MAX_RECURSION_DEPTH) return;
           for await (const [name, handle] of currentDir.entries()) {
              const fullPath = currentPath ? `${currentPath}/${name}` : name;
              if (visited.has(fullPath)) continue; // Symlink / loop protection (Issue 70)
              visited.add(fullPath);

              if (handle.kind === 'file') {
                 // Skip .meta companion files — they're read alongside their parent
                 if (name.endsWith('.meta')) continue;
                 // Skip .keep sentinel files — they mark empty directories
                 if (name === '.keep') continue;
                 try {
                    const file = await handle.getFile();
                    // Read mimeType from .meta companion, or infer from file.type, or infer from extension
                    let mimeType = file.type;
                    if (!mimeType) {
                      try {
                        const metaHandle = await currentDir.getFileHandle(`${name}.meta`);
                        const metaFile = await metaHandle.getFile();
                        const meta = JSON.parse(await metaFile.text());
                        mimeType = meta.mimeType || '';
                      } catch {
                        mimeType = inferMimeType(name);
                      }
                    }
                    // Generate Object URLs so apps can instantly render images/videos in grids without fetching payloads
                    let contentUrl = '';
                    if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
                       contentUrl = rememberObjectUrl(`dir:${fullPath}`, file);
                    }
                    files.push({
                      id: fullPath,
                      name: name,
                      size: file.size,
                      mimeType,
                      content: contentUrl,
                      isFolder: false,
                      modified: file.lastModified,
                    });
                 } catch (err) {
                    // Ignore unreadable files
                 }
              } else if (handle.kind === 'directory') {
                 // Track subdirectories so they appear in listing
                 files.push({
                   id: fullPath,
                   name: name,
                   mimeType: 'inode/directory',
                   isFolder: true,
                   modified: Date.now() - 3600000, // mock a slightly older date for folders so files appear first/separately
                 });
                 // Only traverse deeper if depth > 0 (1 = immediate children only, 0 = recursive)
                 if (depth > 0) {
                   await traverse(handle, fullPath, depth - 1);
                 }
              }
           }
        };

        let rootDir = await navigator.storage.getDirectory();
        if (dirPath) {
           const { dir, name } = await FS._resolvePath(dirPath);
           rootDir = await dir.getDirectoryHandle(name);
        }
        // depth=1 means immediate children only (non-recursive listing)
        await traverse(rootDir, dirPath, 1);
        
        if (files.length > 0) return files;
      }
    } catch (e) {
      console.warn('OPFS readDir failed, falling back to IndexedDB', e);
    }
    
    const allKeys = await keys();
    const fileKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('file_'));
    const idbFiles = await Promise.all(fileKeys.map(k => get(k as string)));
    return idbFiles.filter((f): f is LocalFile => f !== null && f !== undefined);
  },

  // Delete a file or directory
  delete: async (path: string): Promise<void> => {
    revokeObjectUrlForKey(`read:${path}`);
    revokeObjectUrlsUnderPath(`dir:${path}`);
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
        const { dir, name } = await FS._resolvePath(path);
        await dir.removeEntry(name, { recursive: true });
        // Also remove .meta companion if it exists
        try { await dir.removeEntry(`${name}.meta`); } catch { /* no meta file */ }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path } }));
        }
        return;
      }
    } catch (e) {
      console.warn(`OPFS delete failed for ${path}, falling back to IndexedDB`, e);
    }
    await del(`file_${path}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path } }));
    }
  },

  _isDirectory: async (path: string): Promise<boolean> => {
    try {
      const parts = path.split('/').filter(Boolean);
      let current = await navigator.storage.getDirectory();
      for (const part of parts) {
        current = await current.getDirectoryHandle(part);
      }
      return true;
    } catch {
      return false;
    }
  },

  _moveDirectory: async (srcPath: string, destPath: string): Promise<void> => {
    await FS.mkdir(destPath);
    const children = await FS.readDir(srcPath);
    for (const child of children) {
      if (child.name === '.keep') continue;
      const childSrc = `${srcPath}/${child.name}`;
      const childDest = `${destPath}/${child.name}`;
      if (child.isFolder) {
        await FS._moveDirectory(childSrc, childDest);
      } else {
        const file = await FS.read(childSrc);
        if (file) {
          let content: string | Blob = file.content || '';
          if (file.content && file.content.startsWith('blob:')) {
            try {
              const res = await fetch(file.content);
              if (!res.ok) throw new Error(`Failed to fetch blob for ${childSrc}`);
              content = await res.blob();
            } catch (e) {
              console.error(`Failed to read blob for ${childSrc}:`, e);
              continue;
            }
          }
          await FS.write(childDest, content, file.mimeType);
        }
        try {
          await FS.delete(childSrc);
          try {
            const { dir, name } = await FS._resolvePath(childSrc);
            await dir.removeEntry(`${name}.meta`);
          } catch { /* no meta */ }
        } catch (e) {
          console.warn(`Failed to delete source after move: ${childSrc}`, e);
        }
      }
    }
    try {
      await FS.delete(srcPath);
    } catch (e) {
      console.warn(`Failed to delete source directory: ${srcPath}`, e);
    }
  },

  _copyDirectory: async (srcPath: string, destPath: string): Promise<void> => {
    await FS.mkdir(destPath);
    const children = await FS.readDir(srcPath);
    for (const child of children) {
      if (child.name === '.keep') continue;
      const childSrc = `${srcPath}/${child.name}`;
      const childDest = `${destPath}/${child.name}`;
      if (child.isFolder) {
        await FS._copyDirectory(childSrc, childDest);
      } else {
        const file = await FS.read(childSrc);
        if (file) {
          let content: string | Blob = file.content || '';
          if (file.content && file.content.startsWith('blob:')) {
            try {
              const res = await fetch(file.content);
              if (!res.ok) throw new Error(`Failed to fetch blob for ${childSrc}`);
              content = await res.blob();
            } catch (e) {
              console.error(`Failed to read blob for ${childSrc}:`, e);
              continue;
            }
          }
          await FS.write(childDest, content, file.mimeType);
        }
      }
    }
  },

  // Move a file or directory from one path to another (handles binary blobs)
  move: async (srcPath: string, destPath: string): Promise<void> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
        const isDir = await FS._isDirectory(srcPath);

        if (isDir) {
          await FS._moveDirectory(srcPath, destPath);
          return;
        }

        const srcFile = await FS.read(srcPath);
        if (!srcFile) throw new Error(`Source not found: ${srcPath}`);

        let mimeType = srcFile.mimeType || '';
        if (!mimeType) {
          try {
            const { dir: srcDir, name: srcName } = await FS._resolvePath(srcPath);
            const metaHandle = await srcDir.getFileHandle(`${srcName}.meta`);
            const metaFile = await metaHandle.getFile();
            const meta = JSON.parse(await metaFile.text());
            mimeType = meta.mimeType || '';
          } catch { /* no meta */ }
        }

        // For binary files, content is a blob: URL — fetch the blob
        let writeContent: string | Blob = srcFile.content || '';
        if (srcFile.content && srcFile.content.startsWith('blob:')) {
          try {
            const res = await fetch(srcFile.content);
            if (!res.ok) throw new Error(`Failed to fetch blob for ${srcPath}`);
            writeContent = await res.blob();
          } catch (e) {
            console.error(`Failed to read blob for ${srcPath}:`, e);
            return;
          }
        }

        await FS.write(destPath, writeContent, mimeType);
        try {
          await FS.delete(srcPath);
        } catch (e) {
          console.warn(`Failed to delete source after move: ${srcPath}`, e);
        }
        return;
      }
    } catch (e) {
      console.warn(`OPFS move failed for ${srcPath} -> ${destPath}`, e);
    }
    const file = await get(`file_${srcPath}`);
    if (file) {
      await set(`file_${destPath}`, file);
      await del(`file_${srcPath}`);
    }
  },

  copy: async (srcPath: string, destPath: string): Promise<void> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
        const isDir = await FS._isDirectory(srcPath);

        if (isDir) {
          await FS._copyDirectory(srcPath, destPath);
          return;
        }

        const srcFile = await FS.read(srcPath);
        if (!srcFile) throw new Error(`Source not found: ${srcPath}`);

        let mimeType = srcFile.mimeType || '';
        if (!mimeType) {
          try {
            const { dir: srcDir, name: srcName } = await FS._resolvePath(srcPath);
            const metaHandle = await srcDir.getFileHandle(`${srcName}.meta`);
            const metaFile = await metaHandle.getFile();
            const meta = JSON.parse(await metaFile.text());
            mimeType = meta.mimeType || '';
          } catch { /* no meta */ }
        }

        let writeContent: string | Blob = srcFile.content || '';
        if (srcFile.content && srcFile.content.startsWith('blob:')) {
          try {
            const res = await fetch(srcFile.content);
            if (!res.ok) throw new Error(`Failed to fetch blob for ${srcPath}`);
            writeContent = await res.blob();
          } catch (e) {
            console.error(`Failed to read blob for ${srcPath}:`, e);
            return;
          }
        }

        await FS.write(destPath, writeContent, mimeType);
        return;
      }
    } catch (e) {
      console.warn(`OPFS copy failed for ${srcPath} -> ${destPath}`, e);
    }
    const file = await get(`file_${srcPath}`);
    if (file) {
      await set(`file_${destPath}`, { ...file, id: destPath });
    }
  },
};
