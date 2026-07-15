'use client';

import React, { useState, useEffect } from 'react';
import { Menu, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborativeDoc } from '@/lib/hooks/useCollaborativeDoc';
import type { BoardNode } from '@/components/apps/moodboard/types';
import { NODE_COLORS } from '@/components/apps/moodboard/types';

export function NothingProduct({ window: osWindow }: { window: any }) {
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

  const [selectedColor, setSelectedColor] = useState<'WHITE' | 'BLACK'>('WHITE');

  const features = nodes
    .filter(n => n.type === 'text')
    .map(n => ({
      icon: '⚡',
      label: (n.content || '').toUpperCase(),
      value: '',
    }));

  const displayFeatures = features.length > 0 ? features : [
    { icon: '🔋', label: 'UP TO 50 HOURS OF PLAYBACK', value: '' },
    { icon: '🔊', label: 'SOUND BY KEF', value: '' },
    { icon: '🎧', label: 'REAL-TIME ADAPTIVE ANC', value: '' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#e8e4de] font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <button className="text-gray-700">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold tracking-[0.3em] text-gray-900">NOTHING (R)</h1>
        <button className="text-gray-700">
          <ShoppingCart className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left side - Product image */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="w-72 h-72 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-500" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-gray-200/50 border-4 border-white/30 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gray-100/50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/40" />
                    <div className="w-8 h-1 bg-white/30 rounded mx-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Product info */}
        <div className="w-80 flex flex-col justify-center pr-12 shrink-0">
          <h2 className="text-xl font-medium text-gray-900 mb-6">headphone (1)</h2>

          <div className="space-y-3 mb-8">
            {displayFeatures.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-gray-600 tracking-wider">
                <span className="text-base">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>

          {/* Color selector */}
          <div className="mb-6">
            <button className="flex items-center gap-2 text-xs font-medium text-gray-900 tracking-wider">
              {selectedColor}
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          {/* Price and CTA */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 line-through">£199</span>
            <span className="text-sm font-semibold text-gray-900">£99</span>
            <span className="text-xs text-gray-400">·</span>
            <button className="text-xs font-semibold text-gray-900 tracking-wider hover:underline">
              ADD TO BAG
            </button>
          </div>
        </div>
      </div>

      {/* Bottom nav dots */}
      <div className="flex items-center justify-center gap-2 pb-4">
        {[
          { label: 'Specs', sub: 'TECHNICAL' },
          { label: 'Come to Play', sub: 'FILM' },
          { label: 'Design', sub: '' },
          { label: 'Intelligence', sub: '' },
          { label: 'Nothing|KEF', sub: '' },
          { label: 'Inside sound', sub: 'HARDWARE' },
          { label: 'Soundscape', sub: '' },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1 px-2">
            <div className="w-10 h-10 rounded bg-gray-300/50" />
            <span className="text-[8px] text-gray-500 font-medium">{item.label}</span>
            {item.sub && <span className="text-[7px] text-gray-400">{item.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default NothingProduct;
