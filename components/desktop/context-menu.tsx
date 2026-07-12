'use client';

import React from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  return (
    <div
      role="menu"
      aria-label="Desktop context menu"
      className="absolute z-[9999] glass-panel-active rounded-xl py-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          role="menuitem"
          className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors"
          style={{ color: 'var(--os-text)' }}
          onClick={() => { item.onClick(); onClose(); }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--os-active)'; e.currentTarget.style.color = 'var(--os-text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--os-text)'; }}
        >
          {item.icon && <item.icon className="w-4 h-4 opacity-70" aria-hidden="true" />}
          {item.label}
        </button>
      ))}
    </div>
  );
}
