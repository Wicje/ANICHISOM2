'use client';

import type { Connection, BoardNode } from './types';

export function ConnectionLines({ connections, nodes, camera }: { connections: Connection[]; nodes: BoardNode[]; camera: { x: number; y: number; z: number } }) {
  return (
    <svg className="absolute inset-0 pointer-events-none z-10" style={{ overflow: 'visible' }}>
      {connections.map(conn => {
        const fromNode = nodes.find(n => n.id === conn.fromId);
        const toNode = nodes.find(n => n.id === conn.toId);
        if (!fromNode || !toNode) return null;
        const fromW = fromNode.width || 200;
        const fromH = fromNode.height || (fromNode.type === 'text' ? 120 : 200);
        const toW = toNode.width || 200;
        const toH = toNode.height || (toNode.type === 'text' ? 120 : 200);
        const x1 = fromNode.x + fromW / 2;
        const y1 = fromNode.y + fromH / 2 + 24;
        const x2 = toNode.x + toW / 2;
        const y2 = toNode.y + toH / 2 + 24;
        return (
          <g key={conn.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={conn.color || '#94a3b8'} strokeWidth={2} strokeDasharray="6 4" />
            {conn.label && (
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" fill={conn.color || '#64748b'} fontSize={11} fontWeight={600}>
                {conn.label}
              </text>
            )}
            <circle cx={x2} cy={y2} r={4} fill={conn.color || '#94a3b8'} />
          </g>
        );
      })}
    </svg>
  );
}
