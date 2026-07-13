'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ─── GlassPanel ───────────────────────────────────────────────────────────

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  children: React.ReactNode;
}

export function GlassPanel({ active = false, className, children, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(active ? 'glass-panel-active' : 'glass-panel', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── GlassTooltip ─────────────────────────────────────────────────────────

interface GlassTooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function GlassTooltip({ content, children, side = 'top' }: GlassTooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group inline-flex">
      {children}
      <div
        role="tooltip"
        className={cn(
          'absolute scale-0 group-hover:scale-100 transition-transform',
          'px-3 py-1 glass-panel text-xs font-medium rounded-md shadow-lg',
          'pointer-events-none whitespace-nowrap z-50',
          positionClasses[side],
        )}
        style={{ color: 'var(--os-text)' }}
      >
        {content}
      </div>
    </div>
  );
}

// ─── GlassDropdown ────────────────────────────────────────────────────────

interface GlassDropdownItem {
  label: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface GlassDropdownProps {
  items: GlassDropdownItem[];
  open: boolean;
  onClose: () => void;
  className?: string;
}

export function GlassDropdown({ items, open, onClose, className }: GlassDropdownProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        'glass-panel text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]',
        className,
      )}
      style={{ color: 'var(--os-text)' }}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.label === '---' ? (
            <div className="h-px my-1" style={{ background: 'var(--os-border)' }} />
          ) : (
            <button
              role="menuitem"
              disabled={item.disabled}
              onClick={() => { item.onClick(); onClose(); }}
              className="w-full text-left px-4 py-1.5 transition-colors disabled:opacity-40"
              style={{ color: item.danger ? 'var(--os-error)' : 'var(--os-text-muted)' }}
            >
              <span className="flex items-center gap-2">
                {item.icon && <item.icon className="w-3.5 h-3.5" />}
                {item.label}
              </span>
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
