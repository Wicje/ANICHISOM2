'use client';

import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Check immediately
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}
