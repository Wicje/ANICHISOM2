'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Search, Trash2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoardNode, BoardGroup, BoardTag, Connection, Comment } from '@/components/apps/moodboard/types';
import { NODE_COLORS } from '@/components/apps/moodboard/types';
import type { OSWindow } from '@/lib/os-context';

interface SamurAIViewProps {
  nodes: BoardNode[];
  groups: BoardGroup[];
  tags: BoardTag[];
  connections: Connection[];
  comments: Comment[];
  camera: { x: number; y: number; z: number };
  setCamera: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeContent: (id: string, content: string) => void;
  updateNodeSize: (id: string, w: number, h: number) => void;
  deleteNode: (id: string) => void;
  addText: () => void;
  processUrl: (url: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addNodeReaction: (nodeId: string, emoji: string) => void;
  addNodeComment: (nodeId: string, text: string) => void;
  setNodeLabel: (nodeId: string, label: string) => void;
  setNodeBackground: (nodeId: string, color: string) => void;
  toggleNodeLock: (nodeId: string) => void;
  addNodeTag: (nodeId: string, tagId: string) => void;
  removeNodeTag: (nodeId: string, tagId: string) => void;
  setNodeGroup: (nodeId: string, groupId: string) => void;
  removeNodeGroup: (nodeId: string) => void;
  projectId: string;
  osWindow: OSWindow;
  _updateYNode: (vals: Partial<BoardNode> & { id: string }) => void;
}

export function SamurAIView(props: SamurAIViewProps) {
  const { nodes, camera, setCamera, updateNodePosition, updateNodeContent, deleteNode, addText, _updateYNode } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'add' | 'comment'>('select');

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2 || activeTool === 'comment') {
      e.preventDefault();
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [activeTool]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      setCamera(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
    if (draggingId) {
      const x = (e.clientX - dragOffset.x - camera.x) / camera.z;
      const y = (e.clientY - dragOffset.y - camera.y) / camera.z;
      updateNodePosition(draggingId, x, y);
    }
  }, [isPanning, draggingId, dragOffset, camera, setCamera, updateNodePosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsPanning(false);
    setDraggingId(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handleNodePointerDown = useCallback((e: React.PointerEvent, node: BoardNode) => {
    e.stopPropagation();
    setSelectedId(node.id);
    if (activeTool === 'add' || node.locked) return;
    setDraggingId(node.id);
    setDragOffset({
      x: e.clientX - (node.x * camera.z + camera.x),
      y: e.clientY - (node.y * camera.z + camera.y),
    });
  }, [camera, activeTool]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setCamera(prev => {
      let { x, y, z } = prev;
      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = Math.pow(0.995, e.deltaY);
        const newZ = Math.min(Math.max(0.1, z * zoomFactor), 5);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          x = mouseX - (mouseX - x) * (newZ / z);
          y = mouseY - (mouseY - y) * (newZ / z);
        }
        z = newZ;
      } else {
        x -= e.deltaX;
        y -= e.deltaY;
      }
      return { x, y, z };
    });
  }, [setCamera]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const textNodes = nodes.filter(n => n.type === 'text');
  const imageNodes = nodes.filter(n => n.type === 'image' || n.type === 'video');

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Left Sidebar - Tools */}
      <div className="w-12 flex flex-col items-center gap-3 py-4 shrink-0 border-r border-black/5 bg-[#d8d5d0]">
        <button onClick={addText}
          className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
        <div className="flex flex-col gap-2 mt-2">
          {[
            { id: 'select' as const, icon: '◇', label: 'Select' },
            { id: 'add' as const, icon: '+', label: 'Add' },
            { id: 'comment' as const, icon: '💬', label: 'Comment' },
          ].map(tool => (
            <button key={tool.id} onClick={() => setActiveTool(tool.id)}
              className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors",
                activeTool === tool.id ? "bg-black text-white" : "text-gray-500 hover:bg-black/5")}>
              {tool.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={containerRef}
          className="flex-1 relative overflow-hidden"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Grid dots */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, #c5c2bc 1px, transparent 1px)',
            backgroundSize: `${24 * camera.z}px ${24 * camera.z}px`,
            backgroundPosition: `${camera.x}px ${camera.y}px`,
          }} />

          {/* Nodes */}
          <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})` }}>
            {nodes.map(node => (
              <div
                key={node.id}
                className={cn(
                  "absolute cursor-grab active:cursor-grabbing transition-shadow group",
                  selectedId === node.id ? "ring-2 ring-blue-500 shadow-xl z-20" : "shadow-md hover:shadow-lg"
                )}
                style={{ left: node.x, top: node.y, width: node.width || 160, height: node.height || 120 }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                onDoubleClick={() => { if (node.type === 'text') setEditingId(node.id); }}
              >
                {node.type === 'image' || node.type === 'video' ? (
                  <div className="w-full h-full rounded-lg overflow-hidden" style={{ background: node.backgroundColor || '#555' }}>
                    {node.content && <img src={node.content} alt="" className="w-full h-full object-cover" />}
                  </div>
                ) : (
                  <div className="w-full h-full rounded-xl p-3 bg-white border border-gray-200 flex flex-col">
                    {editingId === node.id ? (
                      <textarea className="w-full h-full bg-transparent border-none outline-none resize-none text-[9px] text-gray-700"
                        defaultValue={node.content || ''}
                        onBlur={(e) => { updateNodeContent(node.id, e.target.value); setEditingId(null); }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="text-[9px] font-semibold text-gray-800 mb-1 line-clamp-1">{node.content?.substring(0, 30) || 'Untitled'}</div>
                        <p className="text-[7px] text-gray-500 leading-relaxed flex-1 line-clamp-4">{node.content || 'Double-click to edit'}</p>
                      </>
                    )}
                  </div>
                )}

                {/* Delete */}
                <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-center pb-3 shrink-0">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-lg rounded-xl px-4 py-2 shadow-lg border border-gray-200 text-xs text-gray-500">
            <span>{nodes.length} items</span>
            <span>·</span>
            <span>{textNodes.length} text</span>
            <span>·</span>
            <span>{imageNodes.length} media</span>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Stats */}
      <div className="w-48 flex flex-col shrink-0 border-l border-black/5 bg-[#d8d5d0] p-3 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-white/60 rounded-lg p-2 text-center">
            <div className="text-[8px] text-gray-500">Total</div>
            <div className="text-lg font-bold text-gray-800">{nodes.length}</div>
          </div>
          <div className="flex-1 bg-white/60 rounded-lg p-2 text-center">
            <div className="text-[8px] text-gray-500">Media</div>
            <div className="text-lg font-bold text-gray-800">{imageNodes.length}</div>
          </div>
        </div>

        <div className="bg-white/60 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3 h-3 text-orange-500" />
            <span className="text-[9px] font-semibold text-gray-700">SAMUR.AI</span>
          </div>
          <div className="text-[8px] text-gray-500">AI-powered creative workspace</div>
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${Math.min(100, nodes.length * 10)}%` }} />
          </div>
        </div>

        {/* Node type breakdown */}
        <div className="space-y-1.5">
          {['text', 'image', 'video', 'embed'].map(type => {
            const count = nodes.filter(n => n.type === type).length;
            if (count === 0) return null;
            return (
              <div key={type} className="flex items-center justify-between bg-white/40 rounded-lg px-2 py-1.5">
                <span className="text-[9px] text-gray-600 capitalize">{type}</span>
                <span className="text-[9px] font-bold text-gray-800">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
