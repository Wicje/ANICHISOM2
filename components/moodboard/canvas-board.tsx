'use client';

import React, { useState, useEffect } from 'react';
import { Hash, CheckSquare, Image, Menu, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborativeDoc } from '@/lib/hooks/useCollaborativeDoc';
import type { BoardNode } from '@/components/apps/moodboard/types';
import { NODE_COLORS } from '@/components/apps/moodboard/types';

interface FloatingCard {
  id: string;
  type: 'note' | 'image' | 'checklist';
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  color?: string;
  rotation?: number;
}

export function CanvasBoard({ window: osWindow }: { window: any }) {
  const projectId = osWindow?.data?.projectId || osWindow?.id || 'default';

  const collab = useCollaborativeDoc({
    appPrefix: 'moodboard',
    docId: projectId,
    sharedTypes: [{ name: 'nodes', kind: 'Map' }],
    undoTrackingTypes: ['nodes'],
  });

  const [nodes, setNodes] = useState<BoardNode[]>([]);

  useEffect(() => {
    if (!collab.synced) return;
    const nodesMap = collab.sharedTypesRef.current.nodes;
    if (!nodesMap) return;
    const load = () => {
      const arr: BoardNode[] = [];
      nodesMap.forEach((v: any) => arr.push(v));
      setNodes(arr);
    };
    load();
    nodesMap.observe(load);
    return () => nodesMap.unobserve(load);
  }, [collab.synced]);

  const cards: FloatingCard[] = nodes.map((node, i) => ({
    id: node.id,
    type: (node.type === 'image' ? 'image' : node.type === 'text' ? 'note' : 'note') as 'note' | 'image' | 'checklist',
    x: node.x || (i % 4) * 180 + 40,
    y: node.y || Math.floor(i / 4) * 160 + 30,
    width: node.width || 140,
    height: node.height || 100,
    title: node.type === 'text' ? node.content?.substring(0, 30) : undefined,
    color: node.backgroundColor || NODE_COLORS[i % NODE_COLORS.length],
    rotation: ((i * 7) % 7) - 3,
  }));

  return (
    <div className="w-full h-full flex flex-col bg-[#f0eeea] font-sans overflow-hidden rounded-xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-gray-600 hover:bg-white transition-colors">
            <Menu className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-gray-600 hover:bg-white transition-colors">
            <Hash className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors">
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-auto p-8">
        {cards.map(card => (
          <div
            key={card.id}
            className="absolute cursor-pointer hover:shadow-xl transition-shadow"
            style={{
              left: card.x,
              top: card.y,
              width: card.width,
              height: card.height,
              transform: `rotate(${card.rotation || 0}deg)`,
            }}
          >
            {card.type === 'image' ? (
              <div className="w-full h-full rounded-xl overflow-hidden shadow-md" style={{ background: card.color }} />
            ) : (
              <div className="w-full h-full rounded-xl p-3 shadow-md flex flex-col" style={{ background: card.color }}>
                <div className="text-[10px] font-semibold text-gray-700 mb-1">{card.title}</div>
                <div className="flex-1 space-y-1">
                  {card.type === 'checklist' ? (
                    <>
                      {['Design system', 'Color tokens', 'Typography'].map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className={cn("w-2.5 h-2.5 rounded-sm border", i < 2 ? "bg-green-400 border-green-400" : "border-gray-300")} />
                          <span className="text-[8px] text-gray-600">{item}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="w-full h-1.5 bg-gray-200 rounded" />
                      <div className="w-3/4 h-1.5 bg-gray-200 rounded" />
                      <div className="w-1/2 h-1.5 bg-gray-200 rounded" />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-center pb-4 shrink-0">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-lg rounded-2xl px-5 py-2.5 shadow-lg border border-gray-200">
          {[
            { icon: '⊞', label: 'Grid' },
            { icon: '🎨', label: 'Style' },
            { icon: '💬', label: 'Comment' },
            { icon: '📎', label: 'Attach' },
            { icon: '🗑', label: 'Delete' },
          ].map((item, i) => (
            <button key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm">
              {item.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CanvasBoard;
