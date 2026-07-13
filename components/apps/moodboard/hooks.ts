'use client';

import { useState, useEffect } from 'react';
import { PerfectCursor } from 'perfect-cursors';

export function usePerfectCursor(cb: (point: number[]) => void, point?: number[]) {
  const [pc] = useState(() => new PerfectCursor(cb));
  useEffect(() => { if (point) pc.addPoint(point); }, [pc, point]);
  useEffect(() => () => pc.dispose(), [pc]);
  return pc;
}
