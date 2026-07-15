'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Grid, MousePointer, MessageSquare, Settings, User, Zap, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborativeDoc } from '@/lib/hooks/useCollaborativeDoc';
import type { BoardNode } from '@/components/apps/moodboard/types';
import { NODE_COLORS } from '@/components/apps/moodboard/types';

interface CanvasNode {
  id: string;
  type: 'image' | 'text' | 'card';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color?: string;
}

export function SamurAIBoard({ window: osWindow }: { window: any }) {
  const projectId = osWindow?.data?.projectId || osWindow?.id || 'default';

  const collab = useCollaborativeDoc({
    appPrefix: 'moodboard',
    docId: projectId,
    sharedTypes: [{ name: 'nodes', kind: 'Map' }],
    undoTrackingTypes: ['nodes'],
  });

  const [boardNodes, setBoardNodes] = useState<BoardNode[]>([]);
  useEffect(() => {
    if (!collab.synced) return;
    const nodesMap = collab.sharedTypesRef.current.nodes;
    if (!nodesMap) return;
    const load = () => {
      const arr: BoardNode[] = [];
      nodesMap.forEach((v: any) => arr.push(v));
      setBoardNodes(arr);
    };
    load();
    nodesMap.observe(load);
    return () => nodesMap.unobserve(load);
  }, [collab.synced]);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const canvasNodes: CanvasNode[] = boardNodes.length > 0
    ? boardNodes.map(n => ({
        id: n.id,
        type: n.type === 'image' ? 'image' : n.type === 'text' ? 'text' : 'card',
        x: n.x,
        y: n.y,
        width: n.width || 160,
        height: n.height || 120,
        content: n.content,
        color: n.backgroundColor || NODE_COLORS[0],
      }))
    : [
        { id: '1', type: 'image', x: 20, y: 20, width: 160, height: 120, color: '#555' },
        { id: '2', type: 'image', x: 60, y: 160, width: 140, height: 100, color: '#777' },
        { id: '3', type: 'card', x: 220, y: 80, width: 180, height: 200, color: '#f5e6d3' },
        { id: '4', type: 'text', x: 420, y: 40, width: 120, height: 60, content: 'NOTE - Our writing style', color: '#fff' },
        { id: '5', type: 'image', x: 380, y: 200, width: 100, height: 100, color: '#333' },
      ];

  return (
    <div className="w-full h-full flex bg-[#e0ddd8] font-sans overflow-hidden rounded-xl">
      {/* Left Sidebar */}
      <div className="w-12 flex flex-col items-center gap-4 py-4 shrink-0 border-r border-black/5 bg-[#d8d5d0]">
        <button className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
          +
        </button>
        <div className="flex flex-col gap-3 mt-4">
          {[User, Search, Grid, Settings].map((Icon, i) => (
            <button key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-black/5 transition-colors">
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-auto">
        {/* Grid dots */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #c5c2bc 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />

        {/* Nodes */}
        {canvasNodes.map(node => (
          <div
            key={node.id}
            className={cn(
              "absolute cursor-pointer transition-shadow",
              selectedNode === node.id ? "ring-2 ring-blue-500 shadow-xl" : "shadow-md hover:shadow-lg"
            )}
            style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
            onClick={() => setSelectedNode(node.id)}
          >
            {node.type === 'card' ? (
              <div className="w-full h-full rounded-xl p-3 flex flex-col" style={{ background: node.color }}>
                <div className="text-[9px] text-gray-500 mb-1">{node.content || 'Untitled Card'}</div>
                <p className="text-[8px] text-gray-600 leading-relaxed flex-1">
                  {node.content || 'Card content'}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="px-2 py-0.5 bg-gray-200 rounded text-[7px]">Schedule a Call</span>
                </div>
              </div>
            ) : node.type === 'text' ? (
              <div className="w-full h-full rounded-lg p-3 bg-white border border-gray-200">
                <div className="text-[9px] font-semibold text-gray-800 mb-1">{node.content || 'Untitled'}</div>
                <p className="text-[7px] text-gray-500 leading-relaxed">
                  {node.content || 'Text content'}
                </p>
              </div>
            ) : (
              <div className="w-full h-full rounded-lg overflow-hidden" style={{ background: node.color }} />
            )}
          </div>
        ))}

        {/* Bottom toolbar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/80 backdrop-blur-lg rounded-xl px-4 py-2 shadow-lg border border-gray-200">
          {[MousePointer, Grid, MessageSquare, Settings].map((Icon, i) => (
            <button key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-56 flex flex-col shrink-0 border-l border-black/5 bg-[#d8d5d0] p-3 overflow-y-auto">
        {/* Top stats */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-white/60 rounded-lg p-2 text-center">
            <div className="text-[8px] text-gray-500">Knowledge</div>
            <div className="text-lg font-bold text-gray-800">侍</div>
            <div className="text-[7px] text-gray-400">Samur. AI</div>
          </div>
          <div className="flex-1 bg-white/60 rounded-lg p-2 text-center">
            <div className="text-[8px] text-gray-500">Efficiency</div>
            <div className="text-lg font-bold text-gray-800">|||</div>
            <div className="text-[7px] text-gray-400">Takes: AI路</div>
          </div>
        </div>

        {/* Tasks/Messages */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-white/60 rounded-lg p-2">
            <div className="text-[8px] text-gray-500 mb-1">Tasks</div>
            <div className="w-full h-8 bg-gray-200 rounded" />
          </div>
          <div className="flex-1 bg-white/60 rounded-lg p-2">
            <div className="text-[8px] text-gray-500 mb-1">Messages</div>
            <div className="w-full h-8 bg-gray-200 rounded" />
          </div>
        </div>

        {/* SAMUR.AI logo */}
        <div className="bg-white/60 rounded-xl p-4 mb-4 flex flex-col items-center">
          <div className="text-xl font-bold tracking-[0.2em] text-gray-800 mb-2">SAMUR.AI</div>
          <div className="w-full h-32 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <div className="text-white text-4xl">⚔️</div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[8px] text-gray-500">Training</span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-green-500" />
            </div>
            <span className="text-[8px] text-gray-400">Register: 0/1</span>
          </div>
        </div>

        {/* File icons */}
        <div className="flex gap-2">
          {[
            { icon: '📄', label: 'Sales', sub: '4 Total', color: 'bg-orange-100' },
            { icon: '❌', label: 'Patents', sub: '3 Total', color: 'bg-gray-100' },
            { icon: '📊', label: 'Alpha Data', sub: '5 Total', color: 'bg-gray-100' },
          ].map((item, i) => (
            <div key={i} className={cn("flex-1 rounded-lg p-2 flex flex-col items-center", item.color)}>
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-[8px] font-medium text-gray-700">{item.label}</span>
              <span className="text-[7px] text-gray-400">{item.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SamurAIBoard;
