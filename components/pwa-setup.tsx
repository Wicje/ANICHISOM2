'use client';

import { useEffect } from 'react';

export function PWASetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.error('SW error:', err));
    }
  }, []);
  
  return null;
}
