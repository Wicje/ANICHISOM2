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
  // Read a file conditionally using Tauri Native FS if available, else IndexedDB.
  read: async (path: string): Promise<LocalFile | null> => {
    try {
      // @ts-ignore
      if (window.__TAURI__) {
        /*
        // UNCOMMENT FOR PHASE 3
        const { readTextFile } = await import('@tauri-apps/api/fs');
        const content = await readTextFile(path);
        return {
          id: path,
          name: path.split('/').pop() || 'unknown',
          content,
        };
        */
      }
    } catch (e) {
      console.log('Tauri not found, falling back to IndexedDB');
    }
    
    // IndexedDB Fallback
    const file = await get(`file_${path}`);
    return file || null;
  },

  // Write a file conditionally
  write: async (path: string, content: string, mimeType?: string): Promise<void> => {
    try {
      // @ts-ignore
      if (window.__TAURI__) {
        /*
        // UNCOMMENT FOR PHASE 3
        const { writeTextFile } = await import('@tauri-apps/api/fs');
        await writeTextFile(path, content);
        return;
        */
      }
    } catch (e) {
      // Fallback
    }
    
    await set(`file_${path}`, {
      id: path,
      name: path.split('/').pop() || 'unknown',
      content,
      mimeType,
      size: content.length,
    });
  },

  // List directory conditionally
  readDir: async (dir: string = ''): Promise<LocalFile[]> => {
    try {
      // @ts-ignore
      if (window.__TAURI__) {
        /*
        // UNCOMMENT FOR PHASE 3
        const { readDir } = await import('@tauri-apps/api/fs');
        const entries = await readDir(dir);
        return entries.map((e: any) => ({
          id: e.path,
          name: e.name,
        }));
        */
      }
    } catch (e) {
      // Fallback
    }
    
    const allKeys = await keys();
    const fileKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('file_'));
    const files: LocalFile[] = [];
    for (const k of fileKeys) {
      const f = await get(k as string);
      if (f) files.push(f);
    }
    return files; // In a real scenario, filter by directory tree.
  },

  // Delete a file conditionally
  delete: async (path: string): Promise<void> => {
    try {
      // @ts-ignore
      if (window.__TAURI__) {
        /*
        // UNCOMMENT FOR PHASE 3
        const { removeFile } = await import('@tauri-apps/api/fs');
        await removeFile(path);
        return;
        */
      }
    } catch (e) {
      // Fallback
    }
    await del(`file_${path}`);
  }
};
