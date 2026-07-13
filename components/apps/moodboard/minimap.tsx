'use client';

import { useMemo } from 'react';
import type { BoardNode } from './types';
import { GROUP_COLORS } from './types';

export function MiniMap({ nodes, camera, containerSize, onNavigate }: {
  nodes: BoardNode[];
  camera: { x: number; y: number; z: number };
  containerSize: { w: number; h: number };
  onNavigate: (x: number, y: number) => void;
}) {
  const mapW = 160;
  const mapH = 100;
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + (n.width || 200));
      maxY = Math.max(maxY, n.y + (n.height || 200));
    }
    return { minX, minY, maxX, maxY };
  }, [nodes]);

  const worldW = bounds.maxX - bounds.minX + 200;
  const worldH = bounds.maxY - bounds.minY + 200;
  const scale = Math.min(mapW / worldW, mapH / worldH);

  return (
    <div className="absolute bottom-4 right-4 z-40 bg-white/90 border border-black/10 rounded-lg shadow-lg overflow-hidden" style={{ width: mapW, height: mapH }}>
      <svg width={mapW} height={mapH} className="bg-slate-50">
        {nodes.map(n => {
          const nx = (n.x - bounds.minX + 100) * scale;
          const ny = (n.y - bounds.minY + 100) * scale;
          const nw = (n.width || 200) * scale;
          const groupColor = n.groupId ? GROUP_COLORS[GROUP_COLORS.indexOf(n.groupId) % GROUP_COLORS.length] : undefined;
          return <rect key={n.id} x={nx} y={ny} width={nw} height={4} fill={groupColor || (n.type === 'text' ? '#3b82f6' : '#94a3b8')} rx={1} />;
        })}
        <rect
          x={(-camera.x / camera.z - bounds.minX + 100) * scale}
          y={(-camera.y / camera.z - bounds.minY + 100) * scale}
          width={containerSize.w / camera.z * scale}
          height={containerSize.h / camera.z * scale}
          fill="none" stroke="#3b82f6" strokeWidth={1.5} rx={2}
        />
      </svg>
      <div className="absolute inset-0 cursor-pointer" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const worldX = clickX / scale + bounds.minX - 100;
        const worldY = clickY / scale + bounds.minY - 100;
        onNavigate(-worldX * camera.z + containerSize.w / 2, -worldY * camera.z + containerSize.h / 2);
      }} />
    </div>
  );
}
