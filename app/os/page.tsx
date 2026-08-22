'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/error-boundary';

const DesktopView = dynamic(
  () => import('@/components/desktop').then((m) => m.Desktop),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
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
  return (
    <ErrorBoundary>
      <OSProvider>
        <DesktopView />
      </OSProvider>
    </ErrorBoundary>
  );
}
