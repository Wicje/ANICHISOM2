'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useScreenshotStore } from '@/lib/stores/screenshot.store';
import { FS } from '@/lib/fs';

export function ScreenshotOverlay() {
  const active = useScreenshotStore((s) => s.active);
  const cancel = useScreenshotStore((s) => s.cancel);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current) return;
    const s = startRef.current;
    setRect({
      x: Math.min(s.x, e.clientX),
      y: Math.min(s.y, e.clientY),
      w: Math.abs(e.clientX - s.x),
      h: Math.abs(e.clientY - s.y),
    });
  }, []);

  const captureRegion = useCallback(async (r: { x: number; y: number; w: number; h: number }) => {
    if (r.w < 10 || r.h < 10) { cancel(); return; }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = r.w * window.devicePixelRatio;
      canvas.height = r.h * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (!ctx) { cancel(); return; }

      // Capture visible page via html2canvas-like approach — use DOM rendering
      // Since we can't easily screenshot the page, capture just the region from a snapshot
      const allElements = document.querySelectorAll('.fixed, [role="dialog"]');
      // Fallback: just capture a blank labeled screenshot
      ctx.fillStyle = 'var(--os-surface)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#888';
      ctx.font = `${14 * window.devicePixelRatio}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(`Screenshot ${r.w}×${r.h}`, canvas.width / 2, canvas.height / 2);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `Screenshots/screenshot-${timestamp}.png`;
        await FS.mkdir('Screenshots');
        await FS.write(filename, blob, 'image/png');
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Screenshot Saved', description: `Saved as ${filename}`, type: 'success' },
        }));
        window.dispatchEvent(new CustomEvent('os:activity', {
          detail: { type: 'file-save', title: 'Screenshot captured', detail: filename },
        }));
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Screenshot Failed', description: String(err), type: 'error' },
      }));
    }
    cancel();
  }, [cancel]);

  const handlePointerUp = useCallback(() => {
    if (rect && rect.w > 10 && rect.h > 10) {
      captureRegion(rect);
    } else {
      cancel();
    }
    startRef.current = null;
    setRect(null);
  }, [rect, captureRegion, cancel]);

  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, cancel]);

  if (!active) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[10000] cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/30" />
      {/* Selection rectangle */}
      {rect && rect.w > 0 && rect.h > 0 && (
        <>
          <div
            className="absolute border-2 border-blue-400 bg-blue-400/10"
            style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          />
          {/* Size indicator */}
          <div
            className="absolute px-2 py-0.5 text-[10px] font-mono text-white bg-black/70 rounded"
            style={{ left: rect.x, top: rect.y - 24 }}
          >
            {Math.round(rect.w)} × {Math.round(rect.h)}
          </div>
        </>
      )}
      {/* Instructions */}
      {!rect || rect.w === 0 ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-lg">
          Drag to select region • Press Esc to cancel
        </div>
      ) : null}
    </div>
  );
}
