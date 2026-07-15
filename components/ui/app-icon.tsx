'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { AppManifestEntry } from '@/lib/app-manifest';

type AppIconProps = {
  /** Lucide component fallback */
  icon?: React.ComponentType<any>;
  /** SVG data URI or URL for real image */
  iconImage?: string;
  /** Size class */
  className?: string;
  /** Alt text */
  alt?: string;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * Renders an app icon — prefers iconImage (real image) over Lucide component.
 * Used in Dock, Command Palette, and App Store for consistent icon rendering.
 */
export function AppIcon({ icon: Icon, iconImage, className, alt, ...props }: AppIconProps) {
  if (iconImage) {
    return (
      <div className={cn('flex items-center justify-center shrink-0', className)} {...props}>
        <img
          src={iconImage}
          alt={alt || 'App icon'}
          className="w-full h-full object-contain rounded-[inherit]"
          draggable={false}
        />
      </div>
    );
  }
  if (Icon) {
    return (
      <div className={cn('flex items-center justify-center shrink-0', className)} {...props}>
        <Icon className="w-[60%] h-[60%]" style={{ color: 'var(--os-text)' }} />
      </div>
    );
  }
  return null;
}

/**
 * Inline icon — renders image or Lucide icon without a wrapper div.
 * For use inside existing containers.
 */
export function AppIconInline({ icon: Icon, iconImage, size = 20, className }: {
  icon?: React.ComponentType<any>;
  iconImage?: string;
  size?: number;
  className?: string;
}) {
  if (iconImage) {
    return (
      <img
        src={iconImage}
        alt=""
        className={cn('object-contain rounded', className)}
        style={{ width: size, height: size }}
        draggable={false}
      />
    );
  }
  if (Icon) {
    return <Icon size={size} className={className} />;
  }
  return null;
}
