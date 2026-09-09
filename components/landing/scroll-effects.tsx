'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * ScrollEffects — one client mount that wires GSAP ScrollTrigger to the
 * landing page via data attributes:
 *   data-reveal        → fade/slide up once on enter
 *   data-reveal="grow" → slight scale-in
 *   data-parallax      → vertical parallax; data-speed tunes distance
 */
export default function ScrollEffects() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      gsap.set('[data-reveal], [data-parallax]', { clearProps: 'all' });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context((self) => {
      if (!self) return;

      // Reveal batches (stagger siblings sharing a parent)
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        const parent = el.parentElement;
        const siblings = parent ? Array.from(parent.querySelectorAll(':scope > [data-reveal]')) : [el];
        const isChild = siblings.length > 1;
        const delay = Number(el.dataset.revealDelay || 0);
        gsap.fromTo(
          el,
          { opacity: 0, y: el.dataset.reveal === 'grow' ? 18 : 42, scale: el.dataset.reveal === 'grow' ? 0.96 : 1 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.9,
            ease: 'power3.out',
            delay,
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: isChild ? 'restart none none none' : 'play none none none',
            },
          }
        );
      });

      // Parallax imagery — scrub with viewport
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const speed = parseFloat(el.dataset.speed || '0.12');
        gsap.fromTo(
          el,
          { yPercent: -speed * 50 },
          {
            yPercent: speed * 50,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
            },
          }
        );
      });
    }, host);

    return () => ctx.revert();
  }, []);

  return <div ref={hostRef} className="hidden" aria-hidden />;
}

/** ScrollProgress — thin gradient bar tracking page scroll. */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none">
      <div
        ref={barRef}
        className="h-full origin-left w-full bg-gradient-to-r from-primary via-cyan-400 to-secondary transform scale-x-0"
      />
    </div>
  );
}