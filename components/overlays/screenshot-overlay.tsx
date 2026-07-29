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
      let canvas: HTMLCanvasElement | null = null;
      try {
        const html2canvas = (await import('html2canvas')).default;
        canvas = await html2canvas(document.body, {
          x: r.x,
          y: r.y,
          width: r.w,
          height: r.h,
          useCORS: true,
          logging: false,
          scale: window.devicePixelRatio || 1,
          ignoreElements: (el) => el.classList.contains('cursor-crosshair'),
        });
      } catch {
        canvas = document.createElement('canvas');
        canvas.width = r.w * (window.devicePixelRatio || 1);
        canvas.height = r.h * (window.devicePixelRatio || 1);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#38bdf8';
          ctx.font = `${14 * (window.devicePixelRatio || 1)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.fillText(`Screenshot ${Math.round(r.w)}×${Math.round(r.h)}`, canvas.width / 2, canvas.height / 2);
        }
      }

      if (canvas) {
        const blob = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, 'image/png'));
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const filename = `Desktop/Screenshot-${timestamp}.png`;
          await FS.mkdir('Desktop');
          await FS.write(filename, blob, 'image/png');
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Screenshot Saved', description: `Saved to Desktop/Screenshot-${timestamp}.png`, type: 'success' },
          }));
          window.dispatchEvent(new CustomEvent('os:activity', {
            detail: { type: 'file-save', title: 'Screenshot captured', detail: filename },
          }));
        }
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

  const recordScreen = useCallback(async () => {
    cancel(); // Close overlay before recording
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `Desktop/ScreenRecording-${timestamp}.webm`;
        await FS.mkdir('Desktop');
        await FS.write(filename, blob, 'video/webm');
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Recording Saved', description: `Saved to Desktop/ScreenRecording-${timestamp}.webm`, type: 'success' },
        }));
        window.dispatchEvent(new CustomEvent('os:refresh-desktop'));
      };

      mediaRecorder.start();
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Recording Started', description: `Screen recording is active. Stop sharing via your browser to finish.`, type: 'info' },
      }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Recording Failed', description: String(err), type: 'error' },
      }));
    }
  }, [cancel]);

  if (!active) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[10000]"
    >
      {/* Dim overlay */}
      <div 
        className="absolute inset-0 bg-black/30 cursor-crosshair" 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      
      {/* Selection rectangle */}
      {rect && rect.w > 0 && rect.h > 0 && (
        <>
          <div
            className="absolute border-2 border-blue-400 bg-transparent pointer-events-none"
            style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}
          />
          {/* Size indicator */}
          <div
            className="absolute px-2 py-0.5 text-[10px] font-mono text-white bg-black/70 rounded pointer-events-none"
            style={{ left: rect.x, top: rect.y - 24 }}
          >
            {Math.round(rect.w)} × {Math.round(rect.h)}
          </div>
        </>
      )}
      
      {/* Toolbar */}
      {!rect || rect.w === 0 ? (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 p-2 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="px-4 text-xs font-medium text-white/70">Capture Mode</div>
          <div className="w-px h-6 bg-white/20 mx-1"></div>
          <button 
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/20 transition-colors"
            onClick={() => {
              setRect({ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight });
              setTimeout(() => captureRegion({ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }), 50);
            }}
          >
            Full Screen
          </button>
          <button 
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/20 transition-colors"
            onClick={recordScreen}
          >
            Record Video
          </button>
          <div className="w-px h-6 bg-white/20 mx-1"></div>
          <button 
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            onClick={cancel}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
