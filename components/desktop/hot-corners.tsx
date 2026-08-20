'use client';

import React, { useRef } from 'react';
import { useWindowActions } from '@/lib/hooks/use-window-actions';

interface HotCornersProps {
  setShowMissionControl?: (v: boolean | ((p: boolean) => boolean)) => void;
  setShowLaunchpad?: (v: boolean | ((p: boolean) => boolean)) => void;
  setShowControlCenter?: (v: boolean | ((p: boolean) => boolean)) => void;
}

export function HotCorners({
  setShowMissionControl,
  setShowLaunchpad,
  setShowControlCenter,
}: HotCornersProps) {
  const { openWindow } = useWindowActions();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCornerEnter = (action: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      action();
    }, 280);
  };

  const handleCornerLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <>
      {/* Top-Left: Mission Control */}
      <div
        className="fixed top-0 left-0 w-3 h-3 z-[9990] pointer-events-auto opacity-0 hover:opacity-100 transition-opacity"
        onMouseEnter={() => handleCornerEnter(() => {
          if (setShowMissionControl) setShowMissionControl(prev => !prev);
          else window.dispatchEvent(new CustomEvent('os:toggle-mission-control'));
        })}
        onMouseLeave={handleCornerLeave}
        title="Hot Corner: Mission Control"
      />

      {/* Top-Right: Notification & Control Center */}
      <div
        className="fixed top-0 right-0 w-3 h-3 z-[9990] pointer-events-auto opacity-0 hover:opacity-100 transition-opacity"
        onMouseEnter={() => handleCornerEnter(() => {
          if (setShowControlCenter) setShowControlCenter(prev => !prev);
          else window.dispatchEvent(new CustomEvent('os:toggle-notification-center'));
        })}
        onMouseLeave={handleCornerLeave}
        title="Hot Corner: Control Center"
      />

      {/* Bottom-Left: Launchpad */}
      <div
        className="fixed bottom-0 left-0 w-3 h-3 z-[9990] pointer-events-auto opacity-0 hover:opacity-100 transition-opacity"
        onMouseEnter={() => handleCornerEnter(() => {
          if (setShowLaunchpad) setShowLaunchpad(prev => !prev);
          else window.dispatchEvent(new CustomEvent('os:toggle-launchpad'));
        })}
        onMouseLeave={handleCornerLeave}
        title="Hot Corner: Launchpad"
      />

      {/* Bottom-Right: Quick Note */}
      <div
        className="fixed bottom-0 right-0 w-3 h-3 z-[9990] pointer-events-auto opacity-0 hover:opacity-100 transition-opacity"
        onMouseEnter={() => handleCornerEnter(() => {
          openWindow('productivity', 'Quick Note', { initialTab: 'notes', isQuickNote: true });
        })}
        onMouseLeave={handleCornerLeave}
        title="Hot Corner: Quick Note"
      />
    </>
  );
}
