import { FS, LocalFile } from '@/lib/fs';

export interface VFSEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  mimeType: string;
}

export class VirtualFS {
  private cwd: string;

  constructor(initialCwd = '/home/user') {
    this.cwd = initialCwd;
  }

  getCwd(): string {
    return this.cwd;
  }

  resolvePath(input: string): string {
    if (!input) return this.cwd;
    let parts: string[];

    if (input.startsWith('/')) {
      parts = input.split('/').filter(Boolean);
    } else {
      parts = [...this.cwd.split('/').filter(Boolean), ...input.split('/').filter(Boolean)];
    }

    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }
    return '/' + resolved.join('/');
  }

  async cd(path: string): Promise<string> {
    const resolved = this.resolvePath(path);
    if (path === '/' || path === '~') {
      this.cwd = '/home/user';
      return this.cwd;
    }
    if (path === '..') {
      const parts = this.cwd.split('/').filter(Boolean);
      parts.pop();
      this.cwd = '/' + parts.join('/');
      return this.cwd;
    }
    this.cwd = resolved;
    return this.cwd;
  }

  async ls(path?: string): Promise<VFSEntry[]> {
    const target = path ? this.resolvePath(path) : this.cwd;
    const dirPath = target === '/' ? '' : target;
    try {
      const files = await FS.readDir(dirPath);
      return files
        .filter(f => !f.name.endsWith('.meta') && f.name !== '.keep')
        .map(f => ({
          name: f.name,
          path: f.id,
          isDir: f.isFolder === true || f.mimeType === 'inode/directory',
          size: f.size || 0,
          mimeType: f.mimeType || '',
        }));
    } catch {
      return [];
    }
  }

  async cat(path: string): Promise<string> {
    const resolved = this.resolvePath(path);
    const file = await FS.read(resolved);
    if (!file) throw new Error(`cat: ${path}: No such file or directory`);
    if (file.content && file.content.startsWith('blob:')) {
      return `[Binary file: ${file.name} (${this.formatSize(file.size || 0)})]`;
    }
    return file.content || '';
  }

  async touch(path: string): Promise<void> {
    const resolved = this.resolvePath(path);
    await FS.write(resolved, '');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path: resolved } }));
    }
  }

  async mkdir(path: string): Promise<void> {
    const resolved = this.resolvePath(path);
    await FS.mkdir(resolved);
  }

  async rm(path: string, recursive = false): Promise<void> {
    const resolved = this.resolvePath(path);
    if (!recursive) {
      const entries = await this.ls(resolved);
      if (entries.length > 0) throw new Error(`rm: ${path}: is a directory (use -r)`);
    }
    await FS.delete(resolved);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path: resolved } }));
    }
  }

  async write(path: string, content: string): Promise<void> {
    const resolved = this.resolvePath(path);
    await FS.write(resolved, content);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path: resolved } }));
    }
  }

  async append(path: string, content: string): Promise<void> {
    const resolved = this.resolvePath(path);
    const existing = await FS.read(resolved);
    const existingContent = existing?.content && !existing.content.startsWith('blob:') ? existing.content : '';
    await FS.write(resolved, existingContent + content);
  }

  async mv(src: string, dest: string): Promise<void> {
    const srcResolved = this.resolvePath(src);
    const destResolved = this.resolvePath(dest);
    const file = await FS.read(srcResolved);
    if (!file) throw new Error(`mv: ${src}: No such file or directory`);
    const content = file.content && !file.content.startsWith('blob:') ? file.content : '';
    await FS.write(destResolved, content);
    await FS.delete(srcResolved);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path: destResolved } }));
    }
  }

  async cp(src: string, dest: string): Promise<void> {
    const srcResolved = this.resolvePath(src);
    const destResolved = this.resolvePath(dest);
    const file = await FS.read(srcResolved);
    if (!file) throw new Error(`cp: ${src}: No such file or directory`);
    const content = file.content && !file.content.startsWith('blob:') ? file.content : '';
    await FS.write(destResolved, content);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path: destResolved } }));
    }
  }

  async stat(path: string): Promise<VFSEntry> {
    const resolved = this.resolvePath(path);
    const file = await FS.read(resolved);
    if (!file) throw new Error(`stat: ${path}: No such file or directory`);
    return {
      name: file.name,
      path: file.id,
      isDir: false,
      size: file.size || 0,
      mimeType: file.mimeType || '',
    };
  }

  async find(query: string): Promise<string[]> {
    const results: string[] = [];
    const searchDir = async (dirPath: string, depth = 0) => {
      if (depth > 8) return;
      try {
        const entries = await this.ls(dirPath);
        for (const entry of entries) {
          if (entry.name.toLowerCase().includes(query.toLowerCase())) {
            results.push(entry.path);
          }
          if (entry.isDir) {
            await searchDir(entry.path, depth + 1);
          }
        }
      } catch { /* skip */ }
    };
    await searchDir(this.cwd);
    return results;
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + units[i];
  }
}
