import { useEffect } from "react";
import { api } from "./tauri-bridge";

/**
 * Native content views (WebContentsView) always paint above the window's own
 * HTML, so dropdowns/panels drawn in the React chrome would render underneath
 * the website. While any overlay is open we hide the content views through
 * the host (`chrome_modal`); a counter keeps nested/concurrent overlays safe.
 */
const active = new Set<string>();
let pushed = false;

function push() {
  const shouldHide = active.size > 0;
  if (shouldHide !== pushed) {
    pushed = shouldHide;
    void api.setChromeModal(shouldHide);
  }
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
