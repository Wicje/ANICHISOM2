'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

/**
 * AuroraOverlay — animated gradient mesh + moving sheen + grain.
 * Rendered fixed behind page content; blobs drift along long keyframe paths.
 * The cursor-follow radial glow only engages on fine pointers; reduced-motion
 * users get it disabled via the global CSS media query.
 */
export default function AuroraOverlay() {
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const gx = useSpring(mx, { stiffness: 60, damping: 18, mass: 0.6 });
  const gy = useSpring(my, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (!window.matchMedia) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX - 600);
      my.set(e.clientY - 600);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [mx, my]);

  return (
    <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Drifting gradient mesh */}
      <div className="aurora-blob aurora-blob-a" />
      <div className="aurora-blob aurora-blob-b" />
      <div className="aurora-blob aurora-blob-c" />
      {/* Rotating conic sheen sweep */}
      <div className="aurora-sheen" />
      {/* Cursor-follow radial glow */}
      <motion.div
        className="absolute w-[1200px] h-[1200px] rounded-full pointer-events-none opacity-40"
        style={{
          x: gx,
          y: gy,
          background:
            'radial-gradient(circle at center, rgba(16,244,160,0.14) 0%, rgba(0,240,255,0.07) 30%, transparent 62%)',
        }}
      />
      {/* Film grain */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      <div className="absolute bottom-8 right-10 hidden xl:block text-[10px] font-mono tracking-widest text-[var(--os-text-muted)] uppercase">
        Continua·live
      </div>
    </div>
  );
}