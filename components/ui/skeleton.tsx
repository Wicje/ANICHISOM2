'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  variant?: 'rect' | 'circle' | 'rounded';
}

export function Skeleton({ className, width, height, variant = 'rect' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse',
        variant === 'circle' ? 'rounded-full' : variant === 'rounded' ? 'rounded-xl' : 'rounded-md',
        className
      )}
      style={{
        width,
        height,
        background: 'linear-gradient(90deg, var(--os-border, #e5e7eb) 25%, var(--os-hover, #f3f4f6) 50%, var(--os-border, #e5e7eb) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

export function PageSkeleton({ lines = 5, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('p-6 space-y-4', className)}>
      <Skeleton width="40%" height="24px" />
      <div className="space-y-3 mt-4">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            width={`${60 + ((i * 37) % 35)}%`}
            height="16px"
          />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton height="80px" variant="rounded" />
          <Skeleton width="70%" height="14px" />
          <Skeleton width="40%" height="12px" />
        </div>
      ))}
    </div>
  );
}

const BOOT_MESSAGES = [
  'Initializing the layer...',
  'Restoring context...',
  'Preparing your workspace...',
  'Almost there...',
];

export function BootSplash({ onSkip, progress: externalProgress, message: externalMessage }: { onSkip?: () => void; progress?: number; message?: string }) {
  const [internalProgress, setInternalProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const progress = externalProgress ?? internalProgress;
  const message = externalMessage ?? BOOT_MESSAGES[messageIndex];

  useEffect(() => {
    if (externalProgress !== undefined) return;
    const msgInterval = setInterval(() => {
      setMessageIndex(prev => Math.min(prev + 1, BOOT_MESSAGES.length - 1));
    }, 450);
    const progressInterval = setInterval(() => {
      setInternalProgress(prev => Math.min(prev + 2, 100));
    }, 40);
    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, [externalProgress]);

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center cursor-pointer"
      style={{ background: '#060608' }}
      onClick={onSkip}
    >
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.06]" style={{ background: '#10F4A0' }} />

      {/* Logo with glow */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 blur-3xl opacity-40" style={{ background: '#10F4A0' }} />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10F4A0] to-[#0BC68A] flex items-center justify-center shadow-[0_0_80px_rgba(16,244,160,0.25)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#060608" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
      </div>
      
      {/* App name */}
      <h1 className="text-lg font-mono font-bold tracking-[0.3em] uppercase mb-8 text-white/90">
        Continua
      </h1>
      
      {/* Progress bar */}
      <div className="w-40 h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            background: 'linear-gradient(90deg, #10F4A0, #0BC68A)',
            width: `${progress}%`,
            boxShadow: '0 0 12px rgba(16,244,160,0.4)',
          }}
        />
      </div>
      
      {/* Staged boot message */}
      <p className="text-[11px] mt-4 transition-opacity duration-300 font-mono tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
        {message}
      </p>
      
      {/* Skip hint */}
      <p className="text-[10px] mt-10 opacity-20 font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Click anywhere to skip
      </p>
    </div>
  );
}
