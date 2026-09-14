'use client';

import { useState } from 'react';
import { usePerfectCursor } from './hooks';

export function CursorOverlay({ state }: { state: any }) {
  const [point, setPoint] = useState([state.cursor.x, state.cursor.y]);
  usePerfectCursor(setPoint, [state.cursor.x, state.cursor.y]);
  return (
    <div
      className="absolute pointer-events-none z-50 will-change-transform"
      style={{ left: 0, top: 0, transform: `translate(${point[0]}px, ${point[1]}px) translate(-50%, -50%)` }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-md">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-5.01c.2-.21.49-.32.78-.32h6.79c.45 0 .67-.54.35-.85L6.35 2.85c-.31-.31-.85-.09-.85.36z" fill={state.user.color} stroke="white" strokeWidth="2"/>
      </svg>
      <div className="absolute top-5 left-3 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-md whitespace-nowrap" style={{ backgroundColor: state.user.color }}>
        {state.user.name}
      </div>
    </div>
  );
}
