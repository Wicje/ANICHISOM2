'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// A module chip of the impasto bar: a capsule with a mark (symbol or small
// glyph) and an optional trailing figure. Mirrors impasto's `ChipFace`.
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  mark: React.ReactNode;
  figure?: React.ReactNode;
  ring?: boolean;
  active?: boolean;
  muted?: boolean;
}

export function Chip({
  mark,
  figure,
  ring,
  active,
  muted,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      className={cn('imp-chip', ring && 'imp-chip--ring', active && 'imp-chip--active', muted && 'imp-chip-muted', className)}
      {...rest}
    >
      <span className="flex items-center justify-center shrink-0 leading-none">{mark}</span>
      {figure !== undefined && figure !== null && (
        <span className="tabular-nums leading-none">{figure}</span>
      )}
      {children}
    </button>
  );
}