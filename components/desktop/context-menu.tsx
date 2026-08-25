'use client';

import React, { useEffect, useRef, useState } from 'react';

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
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Viewport bounds clamping
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.min(x, window.innerWidth - rect.width - 8);
    const ny = Math.min(y, window.innerHeight - rect.height - 8);
    setPos({ x: Math.max(8, nx), y: Math.max(8, ny) });
  }, [x, y]);

  // Click-outside to dismiss
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('pointerdown', handler, { once: true });
    return () => window.removeEventListener('pointerdown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Desktop context menu"
      className="fixed z-[9999] glass-panel-active rounded-xl py-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-100 shadow-2xl"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={(e) => e.stopPropagation()}
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
