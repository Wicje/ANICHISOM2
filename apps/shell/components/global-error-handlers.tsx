'use client';

import { useEffect } from 'react';
import { installGlobalErrorHandlers } from '@/components/error-boundary';

export function GlobalErrorHandlers() {
  useEffect(() => {
    installGlobalErrorHandlers();
  }, []);
  return null;
}
