/**
 * Continua Device Capability Detection
 *
 * Runtime detection of what the current machine/browser can do.
 * Used by the continuity engine to determine what can be restored
 * on a given device.
 */

export type Platform = 'macos' | 'linux' | 'windows' | 'ios' | 'android' | 'unknown';

export interface DeviceCapabilities {
  // Identity
  platform: Platform;
  browser: string;
  browserVersion: string;

  // Hardware
  hardwareConcurrency: number;
  deviceMemory: number; // GB, approximate
  maxTouchPoints: number;
  screenResolution: { width: number; height: number };
  colorDepth: number;
  colorGamut: 'srgb' | 'p3' | 'rec2020';
  pixelRatio: number;

  // Features
  hasWebUSB: boolean;
  hasWebBluetooth: boolean;
  hasFileSystemAccess: boolean;
  hasClipboard: boolean;
  hasNotifications: boolean;
  hasWebWorkers: boolean;
  hasServiceWorker: boolean;
  hasWebAssembly: boolean;
  hasWebRTC: boolean;
  hasGeolocation: boolean;
  hasMediaDevices: boolean;
  hasGamepad: boolean;
  hasVibration: boolean;
  hasShare: boolean;
  hasWakeLock: boolean;
  hasBarcodeDetector: boolean;

  // Environment
  isTauri: boolean;
  isStandalone: boolean; // PWA mode
  prefersReducedMotion: boolean;
  darkMode: boolean;
  language: string;
  languages: string[];
  timezone: string;
  online: boolean;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/macintosh|mac os x/.test(ua)) return 'macos';
  if (/windows/.test(ua)) return 'windows';
  if (/linux/.test(ua)) return 'linux';
  return 'unknown';
}

function detectBrowser(): { name: string; version: string } {
  if (typeof navigator === 'undefined') return { name: 'unknown', version: '0' };
  const ua = navigator.userAgent;

  // Order matters — check more specific first
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/);
    return { name: 'edge', version: match?.[1] || '0' };
  }
  if (ua.includes('OPR/') || ua.includes('Opera')) {
    const match = ua.match(/OPR\/([\d.]+)/) || ua.match(/Opera\/([\d.]+)/);
    return { name: 'opera', version: match?.[1] || '0' };
  }
  if (ua.includes('Brave')) {
    const match = ua.match(/Brave\/([\d.]+)/);
    return { name: 'brave', version: match?.[1] || '0' };
  }
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    return { name: 'chrome', version: match?.[1] || '0' };
  }
  if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    return { name: 'firefox', version: match?.[1] || '0' };
  }
  if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/([\d.]+)/);
    return { name: 'safari', version: match?.[1] || '0' };
  }

  return { name: 'unknown', version: '0' };
}

function detectColorGamut(): 'srgb' | 'p3' | 'rec2020' {
  if (typeof window === 'undefined') return 'srgb';
  if (window.matchMedia('(color-gamut: rec2020)').matches) return 'rec2020';
  if (window.matchMedia('(color-gamut: p3)').matches) return 'p3';
  return 'srgb';
}

let cachedCapabilities: DeviceCapabilities | null = null;

export function detectCapabilities(): DeviceCapabilities {
  if (cachedCapabilities) return cachedCapabilities;

  const platform = detectPlatform();
  const { name: browser, version: browserVersion } = detectBrowser();

  // Tauri detection
  const isTauri = typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  // Standalone/PWA detection
  const isStandalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     (window.navigator as any).standalone === true);

  const caps: DeviceCapabilities = {
    // Identity
    platform,
    browser,
    browserVersion,

    // Hardware
    hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
    deviceMemory: typeof navigator !== 'undefined' ? (navigator as any).deviceMemory || 4 : 4,
    maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0,
    screenResolution: typeof screen !== 'undefined'
      ? { width: screen.width, height: screen.height }
      : { width: 1920, height: 1080 },
    colorDepth: typeof screen !== 'undefined' ? screen.colorDepth : 24,
    colorGamut: detectColorGamut(),
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,

    // Features
    hasWebUSB: typeof navigator !== 'undefined' && 'usb' in navigator,
    hasWebBluetooth: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    hasFileSystemAccess: typeof window !== 'undefined' && 'showOpenFilePicker' in window,
    hasClipboard: typeof navigator !== 'undefined' && 'clipboard' in navigator,
    hasNotifications: typeof Notification !== 'undefined',
    hasWebWorkers: typeof Worker !== 'undefined',
    hasServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    hasWebAssembly: typeof WebAssembly !== 'undefined',
    hasWebRTC: typeof RTCPeerConnection !== 'undefined',
    hasGeolocation: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    hasMediaDevices: typeof navigator !== 'undefined' && 'mediaDevices' in navigator,
    hasGamepad: typeof navigator !== 'undefined' && 'getGamepads' in navigator,
    hasVibration: typeof navigator !== 'undefined' && 'vibrate' in navigator,
    hasShare: typeof navigator !== 'undefined' && 'share' in navigator,
    hasWakeLock: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
    hasBarcodeDetector: typeof navigator !== 'undefined' && 'BarcodeDetector' in globalThis,

    // Environment
    isTauri,
    isStandalone,
    prefersReducedMotion: typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
    darkMode: typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
    language: typeof navigator !== 'undefined' ? navigator.language : 'en',
    languages: typeof navigator !== 'undefined' ? [...navigator.languages] : ['en'],
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : true,
    doNotTrack: typeof navigator !== 'undefined' ? navigator.doNotTrack === '1' : false,
  };

  cachedCapabilities = caps;
  return caps;
}

/**
 * Generate a device fingerprint from capabilities.
 * Not cryptographically secure — used for device identification, not authentication.
 */
export function generateFingerprint(caps: DeviceCapabilities): string {
  const parts = [
    caps.platform,
    caps.browser,
    caps.hardwareConcurrency,
    caps.deviceMemory,
    caps.screenResolution.width,
    caps.screenResolution.height,
    caps.colorDepth,
    caps.language,
    caps.timezone,
    caps.maxTouchPoints,
    caps.pixelRatio,
  ];
  // Simple hash — good enough for device identification
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `fp-${Math.abs(hash).toString(36)}`;
}

/**
 * Generate a human-readable device name from capabilities.
 */
export function generateDeviceName(caps: DeviceCapabilities): string {
  const platformNames: Record<Platform, string> = {
    macos: 'Mac',
    linux: 'Linux PC',
    windows: 'Windows PC',
    ios: 'iPhone',
    android: 'Android',
    unknown: 'Device',
  };
  const platform = platformNames[caps.platform] || 'Device';
  const browser = caps.browser.charAt(0).toUpperCase() + caps.browser.slice(1);
  return `${platform} (${browser})`;
}
