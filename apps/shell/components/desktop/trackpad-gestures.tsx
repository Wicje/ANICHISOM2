'use client';

import React, { useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';

interface TrackpadGesturesProps {
  setShowMissionControl: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLaunchpad: React.Dispatch<React.SetStateAction<boolean>>;
}

export function TrackpadGestures({
  setShowMissionControl,
  setShowLaunchpad,
}: TrackpadGesturesProps) {
  const activePointers = useRef<Map<number, { startX: number; startY: number; currentX: number; currentY: number }>>(new Map());
  const gestureFiredRef = useRef(false);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      activePointers.current.set(e.pointerId, {
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      });
      if (activePointers.current.size >= 3) {
        gestureFiredRef.current = false;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const p = activePointers.current.get(e.pointerId);
      if (p) {
        p.currentX = e.clientX;
        p.currentY = e.clientY;
      }

      if (gestureFiredRef.current) return;

      // 3-Finger Gestures
      if (activePointers.current.size === 3) {
        const points = Array.from(activePointers.current.values());
        const p0 = points[0];
        const p1 = points[1];
        const p2 = points[2];
        if (!p0 || !p1 || !p2) return;

        const avgDeltaY = (p0.currentY - p0.startY + p1.currentY - p1.startY + p2.currentY - p2.startY) / 3;
        const avgDeltaX = (p0.currentX - p0.startX + p1.currentX - p1.startX + p2.currentX - p2.startX) / 3;

        // 3-Finger Swipe Up -> Mission Control
        if (avgDeltaY < -65 && Math.abs(avgDeltaX) < 45) {
          gestureFiredRef.current = true;
          setShowMissionControl(prev => !prev);
        }
        // 3-Finger Swipe Down -> Dismiss Mission Control / Peek
        else if (avgDeltaY > 65 && Math.abs(avgDeltaX) < 45) {
          gestureFiredRef.current = true;
          setShowMissionControl(false);
        }
        // 3-Finger Swipe Left / Right -> Switch Spaces
        else if (avgDeltaX < -75 && Math.abs(avgDeltaY) < 45) {
          gestureFiredRef.current = true;
          const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspaceStore.getState();
          const maxIdx = Math.max(0, (workspaces?.length || 4) - 1);
          if (activeWorkspace < maxIdx) {
            setActiveWorkspace(activeWorkspace + 1);
          }
        }
        else if (avgDeltaX > 75 && Math.abs(avgDeltaY) < 45) {
          gestureFiredRef.current = true;
          const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore.getState();
          if (activeWorkspace > 0) {
            setActiveWorkspace(activeWorkspace - 1);
          }
        }
      }

      // 4-Finger Pinch -> Launchpad
      if (activePointers.current.size >= 4) {
        const points = Array.from(activePointers.current.values());
        const p0 = points[0];
        const p1 = points[1];
        if (!p0 || !p1) return;

        const startDist = Math.hypot(p0.startX - p1.startX, p0.startY - p1.startY);
        const currDist = Math.hypot(p0.currentX - p1.currentX, p0.currentY - p1.currentY);

        if (startDist - currDist > 50) {
          gestureFiredRef.current = true;
          setShowLaunchpad(prev => !prev);
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size === 0) {
        gestureFiredRef.current = false;
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [setShowMissionControl, setShowLaunchpad]);

  return null;
}
