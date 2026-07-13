'use client';

import { OSProvider } from '@/lib/os-context';
import { Desktop } from '@/components/desktop';
import { ErrorBoundary } from '@/components/error-boundary';

export default function Page() {
  return (
    <ErrorBoundary>
      <OSProvider>
        <Desktop />
      </OSProvider>
    </ErrorBoundary>
  );
}
