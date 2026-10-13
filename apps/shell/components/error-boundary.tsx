'use client';

let installed = false;

/**
 * Install window-level error + unhandled-rejection handlers once.
 * Safe to call during render (no-ops on the server); idempotent.
 */
export function installGlobalErrorHandlers() {
  if (installed) return;
  if (typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (event) => {
    try {
      console.error('[continua:error]', event?.message || event);
    } catch {}
  });
  window.addEventListener('unhandledrejection', (event) => {
    try {
      console.error('[continua:rejection]', event?.reason);
    } catch {}
  });
}
