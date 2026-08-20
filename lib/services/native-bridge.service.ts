'use client';

export interface NativeEnvironment {
  isTauri: boolean;
  isElectron: boolean;
  isPWA: boolean;
  platform: 'macos' | 'windows' | 'linux' | 'web';
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
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;

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
