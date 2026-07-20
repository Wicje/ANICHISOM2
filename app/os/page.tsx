'use client';

import { OSProvider } from '@/lib/os-context';
import { Desktop } from '@/components/desktop';
import { ErrorBoundary } from '@/components/error-boundary';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MobileCompanion } from '@/components/mobile-companion';

export default function OSPage() {
  const isMobile = useIsMobile();

  return (
    <ErrorBoundary>
      <OSProvider>
        {isMobile ? <MobileCompanion /> : <Desktop />}
      </OSProvider>
    </ErrorBoundary>
  );
}
