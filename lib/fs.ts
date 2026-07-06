import { get, set, del, keys } from 'idb-keyval';

// Abstraction for File System operations allowing seamless pivot to Tauri.
export interface LocalFile {
  id: string;
  name: string;
  content?: string;
  size?: number;
  mimeType?: string;
}

export const FS = {
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
           content = URL.createObjectURL(file);
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
                       contentUrl = URL.createObjectURL(file);
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
