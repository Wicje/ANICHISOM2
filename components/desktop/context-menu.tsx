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
      className="absolute z-[9999] bg-black/70 backdrop-blur-3xl border border-white/20 shadow-2xl rounded-xl py-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          role="menuitem"
          className="w-full text-left px-4 py-2 text-sm text-white/90 hover:bg-blue-500 hover:text-white flex items-center gap-3 transition-colors"
          onClick={() => { item.onClick(); onClose(); }}
        >
          {item.icon && <item.icon className="w-4 h-4 opacity-70" aria-hidden="true" />}
          {item.label}
        </button>
      ))}
    </div>
  );
}
