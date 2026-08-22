'use client';

export interface NativeEnvironment {
  isTauri: boolean;
  isElectron: boolean;
  isPWA: boolean;
  platform: 'macos' | 'windows' | 'linux' | 'web';
}

export interface NativeSystemInfo {
  os: string;
  arch: string;
  hostname: string;
  app_version: string;
}

export interface NativeFileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
}

class NativeBridgeService {
  private env: NativeEnvironment;

  constructor() {
    this.env = this.detectEnvironment();
  }

  private detectEnvironment(): NativeEnvironment {
    if (typeof window === 'undefined') {
      return { isTauri: false, isElectron: false, isPWA: false, platform: 'web' };
    }

    const isTauri = !!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__;
    const isElectron = !!(window as any).process && (window as any).process.type === 'renderer';
    const isPWA = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)').matches : false;

    let platform: 'macos' | 'windows' | 'linux' | 'web' = 'web';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) platform = 'macos';
    else if (ua.includes('win')) platform = 'windows';
    else if (ua.includes('linux')) platform = 'linux';

    return { isTauri, isElectron, isPWA, platform };
  }

  public getEnvironment(): NativeEnvironment {
    return this.env;
  }

  /**
   * Invokes a native Tauri command if running in Tauri, otherwise returns fallback.
   */
  public async invoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T | null> {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__?.invoke) {
      try {
        return await (window as any).__TAURI_INTERNALS__.invoke(cmd, args);
      } catch (err) {
        console.warn(`[NativeBridge] Tauri invoke('${cmd}') failed:`, err);
        return null;
      }
    }
    return null;
  }

  /**
   * Retrieves native host system information.
   */
  public async getSystemInfo(): Promise<NativeSystemInfo> {
    if (this.env.isTauri) {
      const info = await this.invoke<NativeSystemInfo>('get_system_info');
      if (info) return info;
    }

    return {
      os: this.env.platform,
      arch: 'wasm64/browser',
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
      app_version: '2.4.0',
    };
  }

  /**
   * Reads a file from the host filesystem when in native mode.
   */
  public async readNativeFile(path: string): Promise<string | null> {
    if (this.env.isTauri) {
      return await this.invoke<string>('read_file_native', { path });
    }
    return null;
  }

  /**
   * Writes content to the host filesystem when in native mode.
   */
  public async writeNativeFile(path: string, content: string): Promise<boolean> {
    if (this.env.isTauri) {
      try {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__?.invoke) {
          await (window as any).__TAURI_INTERNALS__.invoke('write_file_native', { path, content });
          return true;
        }
      } catch (e) {
        console.warn('[NativeBridge] writeNativeFile error:', e);
        return false;
      }
    }
    return false;
  }

  /**
   * Lists files in a directory on the host filesystem when in native mode.
   */
  public async listNativeDirectory(path: string): Promise<NativeFileEntry[]> {
    if (this.env.isTauri) {
      const entries = await this.invoke<NativeFileEntry[]>('list_directory_native', { path });
      return entries || [];
    }
    return [];
  }

  /**
   * Shows an OS-level notification.
   */
  public async showNativeNotification(title: string, body: string): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/continua-icon.png' });
      return true;
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body, icon: '/continua-icon.png' });
        return true;
      }
    }
    return false;
  }
}

export const nativeBridge = new NativeBridgeService();
