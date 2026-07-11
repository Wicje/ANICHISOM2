import { CloudFile, CloudFileContent } from './storage-connector';

/**
 * Local Folder Connector — uses the File System Access API (PWA only).
 * Allows users to mount a local directory and browse/read/write files.
 * Falls back gracefully when API is not available.
 */
export class LocalFolderConnector {
  readonly id = 'local-folder';
  readonly name = 'Local Folder';
  readonly icon = '📁';

  private rootHandle: FileSystemDirectoryHandle | null = null;
  private mountedPath: string | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  async connect(): Promise<{ connected: boolean; path: string }> {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }

    try {
      this.rootHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      this.mountedPath = this.rootHandle.name;
      return { connected: true, path: this.rootHandle.name };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return { connected: false, path: '' };
      }
      throw err;
    }
  }

  async reconnect(): Promise<boolean> {
    if (!this.rootHandle) return false;
    try {
      // Re-requesting handles is only possible in Chrome's persistence model
      // This is a best-effort check
      await this.list('/');
      return true;
    } catch {
      return false;
    }
  }

  isMounted(): boolean {
    return this.rootHandle !== null;
  }

  getMountPath(): string | null {
    return this.mountedPath;
  }

  async list(relativePath: string = ''): Promise<CloudFile[]> {
    const dir = await this.resolveDir(relativePath);
    const files: CloudFile[] = [];

    const dirEntries = dir as unknown as AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
    for await (const [name, handle] of dirEntries) {
      if (name.startsWith('.')) continue;
      if (handle.kind === 'file') {
        const file = await (handle as unknown as { getFile: () => Promise<File> }).getFile();
        files.push({
          id: `${relativePath}/${name}`,
          name,
          path: `${relativePath}/${name}`,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          isFolder: false,
          modifiedTime: new Date(file.lastModified).toISOString(),
        });
      } else {
        files.push({
          id: `${relativePath}/${name}`,
          name,
          path: `${relativePath}/${name}`,
          mimeType: 'inode/directory',
          size: 0,
          isFolder: true,
        });
      }
    }

    return files.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async read(relativePath: string): Promise<CloudFileContent> {
    const parts = relativePath.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    const dirPath = parts.join('/');
    const dir = await this.resolveDir(dirPath);
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();

    const text = await file.text();
    return {
      id: relativePath,
      name: fileName,
      mimeType: file.type || 'application/octet-stream',
      data: text,
      size: file.size,
    };
  }

  async write(relativePath: string, content: string | Blob, mimeType?: string): Promise<CloudFile> {
    const parts = relativePath.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    const dirPath = parts.join('/');
    const dir = await this.resolveDir(dirPath);

    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();

    if (typeof content === 'string') {
      await writable.write(content);
    } else {
      await writable.write(content);
    }
    await writable.close();

    const file = await fileHandle.getFile();
    return {
      id: relativePath,
      name: fileName,
      path: relativePath,
      mimeType: mimeType || file.type || 'application/octet-stream',
      size: file.size,
      isFolder: false,
      modifiedTime: new Date(file.lastModified).toISOString(),
    };
  }

  async delete(relativePath: string): Promise<void> {
    const parts = relativePath.split('/').filter(Boolean);
    const name = parts.pop()!;
    const dirPath = parts.join('/');
    const dir = await this.resolveDir(dirPath);
    await dir.removeEntry(name, { recursive: true });
  }

  async createFolder(relativePath: string, name: string): Promise<CloudFile> {
    const dir = await this.resolveDir(relativePath);
    await dir.getDirectoryHandle(name, { create: true });
    return {
      id: `${relativePath}/${name}`,
      name,
      path: `${relativePath}/${name}`,
      mimeType: 'inode/directory',
      size: 0,
      isFolder: true,
    };
  }

  private async resolveDir(relativePath: string): Promise<FileSystemDirectoryHandle> {
    if (!this.rootHandle) throw new Error('No directory mounted');

    if (!relativePath || relativePath === '/') return this.rootHandle;

    const parts = relativePath.split('/').filter(Boolean);
    let current = this.rootHandle;

    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: false });
    }

    return current;
  }
}
