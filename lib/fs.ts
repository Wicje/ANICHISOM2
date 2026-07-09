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
  const cleanup = () => {
    for (const url of objectUrlsByKey.values()) {
      URL.revokeObjectURL(url);
    }
    objectUrlsByKey.clear();
  };

  const previousCleanup = (window as any).__anichisom_fs_url_cleanup;
  if (previousCleanup) {
    window.removeEventListener('pagehide', previousCleanup);
    window.removeEventListener('beforeunload', previousCleanup);
  }

  window.addEventListener('pagehide', cleanup);
  window.addEventListener('beforeunload', cleanup);
  (window as any).__anichisom_fs_url_cleanup = cleanup;
}

// Abstraction for File System operations allowing seamless pivot to Tauri.
export interface LocalFile {
  id: string;
  name: string;
  content?: string;
  size?: number;
  mimeType?: string;
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
        
        let content = '';
        // Use Object URLs for large binaries to prevent RAM exhaustion. Text files use raw strings.
        if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.includes('pdf') || file.type.includes('octet-stream')) {
           content = rememberObjectUrl(`read:${path}`, file);
        } else {
           content = await file.text(); 
        }
        
        return {
          id: path,
          name: file.name,
          content,
          size: file.size,
          mimeType: file.type
        };
      }
    } catch (e) {
      console.warn(`OPFS read failed for ${path}, falling back to IndexedDB`, e);
    }
    
    // IndexedDB Fallback
    const file = await get(`file_${path}`);
    return file || null;
  },

  // Write a file to OPFS or IndexedDB
  write: async (path: string, content: string | Blob | File, mimeType?: string): Promise<void> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
        const { dir, name } = await FS._resolvePath(path, true);
        const handle = await dir.getFileHandle(name, { create: true });
        
        // @ts-ignore
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        revokeObjectUrlForKey(`read:${path}`);
        revokeObjectUrlForKey(`dir:${path}`);
        return;
      }
    } catch (e) {
      console.warn(`OPFS write failed for ${path}, falling back to IndexedDB`, e);
    }
    
    // IndexedDB Fallback (Does not support massive Blobs efficiently without crashing)
    let stringContent = typeof content === 'string' ? content : '';
    if (content instanceof Blob && !stringContent) {
       stringContent = 'blob:unsupported-in-idb'; // Avoid RAM crash on legacy
    }

    await set(`file_${path}`, {
      id: path,
      name: path.split('/').pop() || 'unknown',
      content: stringContent,
      mimeType: mimeType || (content instanceof Blob ? content.type : 'text/plain'),
      size: typeof content === 'string' ? content.length : content.size,
    });
  },

  // List directory contents recursively
  readDir: async (dirPath: string = ''): Promise<LocalFile[]> => {
    const files: LocalFile[] = [];
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
        
        const traverse = async (currentDir: any, currentPath: string) => {
           for await (const [name, handle] of currentDir.entries()) {
              const fullPath = currentPath ? `${currentPath}/${name}` : name;
              if (handle.kind === 'file') {
                 try {
                    const file = await handle.getFile();
                    // Generate Object URLs so apps can instantly render images/videos in grids without fetching payloads
                    let contentUrl = '';
                    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                       contentUrl = rememberObjectUrl(`dir:${fullPath}`, file);
                    }
                    files.push({
                      id: fullPath,
                      name: name,
                      size: file.size,
                      mimeType: file.type,
                      content: contentUrl
                    });
                 } catch (err) {
                    // Ignore unreadable files
                 }
              } else if (handle.kind === 'directory') {
                 await traverse(handle, fullPath);
              }
           }
        };

        let rootDir = await navigator.storage.getDirectory();
        if (dirPath) {
           const { dir, name } = await FS._resolvePath(dirPath);
           rootDir = await dir.getDirectoryHandle(name);
        }
        await traverse(rootDir, dirPath);
        
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
        return;
      }
    } catch (e) {
      console.warn(`OPFS delete failed for ${path}, falling back to IndexedDB`, e);
    }
    await del(`file_${path}`);
  }
};
