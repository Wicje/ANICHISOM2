/**
 * Platform utilities for ContinuaOS
 * Detects whether the app is running in a browser or a Tauri native webview.
 */
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
};

export type BrowserName = 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'brave' | 'other';

/**
 * Detect the browser name from the user agent (and Brave via navigator.brave).
 * Falls back to 'other' so guides always render something sensible.
 */
export const getBrowserName = (): BrowserName => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';

  const brave = (window as unknown as { isBrave?: { isBrave: () => Promise<boolean> } }).isBrave;
  if (brave?.isBrave) return 'brave';
  if (/Edg\//.test(ua)) return 'edge';
  if (/OPR\/|Opera/.test(ua)) return 'opera';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Chrome\/|Chromium\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua) && /Apple Computer/.test(vendor)) return 'safari';
  return 'other';
};
