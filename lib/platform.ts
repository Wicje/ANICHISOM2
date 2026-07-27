/**
 * Platform utilities for ContinuaOS
 * Detects whether the app is running in a browser or a Tauri native webview.
 */
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
};
