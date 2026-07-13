'use client';

import { useWindowStore } from '@/lib/stores/window.store';

/**
 * Common window store selectors used across 12+ components.
 * Eliminates repeated individual selector subscriptions.
 */
export function useWindowActions() {
  const windows = useWindowStore((s) => s.windows);
  const highestZIndex = useWindowStore((s) => s.highestZIndex);
  const openWindow = useWindowStore((s) => s.openWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const maximizeWindow = useWindowStore((s) => s.maximizeWindow);
  const updateWindowDimensions = useWindowStore((s) => s.updateWindowDimensions);
  const updateWindowData = useWindowStore((s) => s.updateWindowData);

  return {
    windows,
    highestZIndex,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    updateWindowDimensions,
    updateWindowData,
  };
}
