'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';

/**
 * Marquee — seamless infinite scroll driven by GSAP.
 * Clones its children into a double-width track and tweens xPercent by -50.
 * Pauses (speed 0) on hover, plus a subtle directional drift on non-reduced devices.
 */
export default function Marquee({
  children,
  speed = 1,
  pauseOnHover = true,
  reverse = false,
  className = '',
}: {
  children: ReactNode;
  speed?: number;
  pauseOnHover?: boolean;
  reverse?: boolean;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const wrap = wrapRef.current;
    if (!track || !wrap) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const tween = gsap.to(track, {
        xPercent: reverse ? 50 : -50,
        ease: 'none',
        duration: 42 / Math.max(speed, 0.25),
        repeat: -1,
      });

      const onEnter = () => { if (pauseOnHover) tween.timeScale(0); };
      const onLeave = () => { if (pauseOnHover) tween.timeScale(1); };
      wrap.addEventListener('mouseenter', onEnter);
      wrap.addEventListener('mouseleave', onLeave);

      return () => {
        wrap.removeEventListener('mouseenter', onEnter);
        wrap.removeEventListener('mouseleave', onLeave);
      };
    }, wrap);
    return () => ctx.revert();
  }, [speed, pauseOnHover, reverse]);

  return (
    <div ref={wrapRef} className={`overflow-hidden select-none ${className}`}>
      <div ref={trackRef} className="flex w-max items-stretch">
        <div className="flex items-stretch shrink-0">{children}</div>
        <div className="flex items-stretch shrink-0" aria-hidden>{children}</div>
      </div>
    </div>
  );
}