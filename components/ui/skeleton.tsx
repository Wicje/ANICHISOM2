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
            width={`${60 + Math.random() * 40}%`}
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
  'Initializing workspace...',
  'Loading core services...',
  'Restoring your sessions...',
  'Preparing your workspace...',
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
      style={{ background: 'var(--os-bg, #0a0a0a)' }}
      onClick={onSkip}
    >
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      
      {/* Logo with glow */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 blur-2xl opacity-30" style={{ background: 'var(--os-primary, #6366f1)' }} />
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="relative">
          <rect width="64" height="64" rx="16" fill="var(--os-primary, #6366f1)" />
          <path d="M20 44V20h8l8 12 8-12h8v24h-7V30l-7 10-7-10v14h-7z" fill="white" />
        </svg>
      </div>
      
      {/* App name */}
      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--os-text, #fff)' }}>
        ContinuaOS
      </h1>
      
      {/* Progress bar */}
      <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'var(--os-border, #333)' }}>
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            background: 'var(--os-primary, #6366f1)',
            width: `${progress}%`,
          }}
        />
      </div>
      
      {/* Staged boot message */}
      <p className="text-xs mt-4 transition-opacity duration-300" style={{ color: 'var(--os-text-muted, #666)' }}>
        {message}
      </p>
      
      {/* Skip hint */}
      <p className="text-[10px] mt-8 opacity-30" style={{ color: 'var(--os-text-muted, #666)' }}>
        Click anywhere to skip
      </p>
    </div>
  );
}
