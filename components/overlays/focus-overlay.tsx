'use client';

import React from 'react';
import { useFocusStore } from '@/lib/stores/focus.store';
import { useWindowStore } from '@/lib/stores/window.store';

export function FocusOverlay() {
  const enabled = useFocusStore((s) => s.enabled);
  const toggle = useFocusStore((s) => s.toggle);

  if (!enabled) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] pointer-events-none"
      onClick={toggle}
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(2px)',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-[10px] font-medium pointer-events-auto cursor-pointer"
        style={{ background: 'var(--os-glass-bg)', color: 'var(--os-text)', border: '1px solid var(--os-border)' }}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
      >
        Focus Mode — Click to exit or press Cmd+Shift+F
      </div>
    </div>
  );
}
