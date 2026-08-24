'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/error-boundary';
import { useIsMobile } from '@/hooks/use-is-mobile';

const DesktopView = dynamic(
  () => import('@/components/desktop').then((m) => m.Desktop),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </div>
    ),
  }
);

const MobileControlCenter = dynamic(
  () => import('@/components/mobile/mobile-control-center').then((m) => m.MobileControlCenter),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </div>
    ),
  }
);

const OSProvider = dynamic(
  () => import('@/lib/os-context').then((m) => m.OSProvider),
  { ssr: false }
);

export default function OSPage() {
  const isMobile = useIsMobile();

  return (
    <ErrorBoundary>
      <OSProvider>
        {isMobile ? <MobileControlCenter /> : <DesktopView />}
      </OSProvider>
    </ErrorBoundary>
  );
}
