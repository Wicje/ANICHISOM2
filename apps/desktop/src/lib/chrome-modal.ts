import { useEffect } from "react";
import { api } from "./tauri-bridge";

/**
 * Native content views (WebContentsView) always paint above the window's own
 * HTML, so dropdowns/panels drawn in the React chrome would render underneath
 * the website. While any overlay is open we hide the content views through
 * the host (`chrome_modal`); a counter keeps nested/concurrent overlays safe.
 */
const active = new Set<string>();
const listeners = new Set<(open: boolean) => void>();

function push() {
  const shouldHide = active.size > 0;
  // Always re-assert, never dedupe on a remembered boolean. A single desync
  // (an id removed by one overlay while another still holds it) used to wedge
  // `pushed` forever, after which every overlay opened *behind* the live page —
  // the palette looked like it did nothing. One extra IPC is a fair price for
  // a state that cannot get stuck.
  void api.setChromeModal(shouldHide);
  for (const fn of listeners) {
    try { fn(shouldHide); } catch { /* ignore */ }
  }
}

/** Subscribe to any-overlay-open changes (drives the modal cover frame). */
export function subscribeModal(fn: (open: boolean) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function setOverlay(id: string, open: boolean) {
  if (open) active.add(id);
  else active.delete(id);
  push();
}

export function useChromeModal(id: string, open: boolean) {
  useEffect(() => {
    setOverlay(id, open);
    return () => setOverlay(id, false);
  }, [id, open]);
}
