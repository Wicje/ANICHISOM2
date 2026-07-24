'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Type, Image as ImageIcon, CheckSquare, Trash2, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoardNode, BoardGroup, BoardTag, Connection, Comment } from '@/components/apps/moodboard/types';
import { NODE_COLORS } from '@/components/apps/moodboard/types';
import { writeBlob } from '@/lib/context-layer';
import type { OSWindow } from '@/lib/os-context';

interface CanvasViewProps {
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
  fileInputRef: React.RefObject<HTMLInputElement | null>;
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

export function CanvasView(props: CanvasViewProps) {
  const { nodes, camera, setCamera, updateNodePosition, updateNodeContent, deleteNode, addText, _updateYNode } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragLocalPos, setDragLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      setCamera(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
    if (draggingId) {
      const x = (e.clientX - dragOffset.x - camera.x) / camera.z;
      const y = (e.clientY - dragOffset.y - camera.y) / camera.z;
      setDragLocalPos({ x, y });
    }
  }, [isPanning, draggingId, dragOffset, camera, setCamera]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsPanning(false);
    if (draggingId && dragLocalPos) {
      updateNodePosition(draggingId, dragLocalPos.x, dragLocalPos.y);
    }
    setDraggingId(null);
    setDragLocalPos(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, [draggingId, dragLocalPos, updateNodePosition]);

  const handleNodePointerDown = useCallback((e: React.PointerEvent, node: BoardNode) => {
    e.stopPropagation();
    if (node.locked) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingId(node.id);
    setDragOffset({
      x: e.clientX - (node.x * camera.z + camera.x),
      y: e.clientY - (node.y * camera.z + camera.y),
    });
  }, [camera, setDraggingId]);

  const handleNodeDoubleClick = useCallback((node: BoardNode) => {
    if (node.type === 'text') {
      setEditingId(node.id);
    }
  }, [setEditingId]);

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

  const handleAddNote = useCallback(() => {
    addText();
  }, [addText]);

  const handleAddChecklist = useCallback(() => {
    const newId = crypto.randomUUID();
    _updateYNode({ id: newId, type: 'text', x: 200, y: 200, content: '☐ Item 1\n☐ Item 2\n☐ Item 3', width: 180, height: 120 });
  }, [_updateYNode]);

  // Viewport Culling (Virtualization)
  const visibleNodes = React.useMemo(() => {
    const buffer = 300 / camera.z;
    const viewLeft = -camera.x / camera.z - buffer;
    const viewTop = -camera.y / camera.z - buffer;
    const viewRight = (props.osWindow.width - camera.x) / camera.z + buffer;
    const viewBottom = (props.osWindow.height - camera.y) / camera.z + buffer;

    return nodes.filter(n => {
      const w = n.width || 200;
      const h = n.height || 200;
      return n.x < viewRight && (n.x + w) > viewLeft &&
             n.y < viewBottom && (n.y + h) > viewTop;
    });
  }, [nodes, camera, props.osWindow.width, props.osWindow.height]);

  const cards = visibleNodes.map((node, i) => ({
    ...node,
    rotation: ((i * 7) % 7) - 3,
  }));

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Mini toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-b border-black/5">
        <button onClick={handleAddNote} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 text-gray-600 hover:bg-white text-xs font-medium transition-colors">
          <Type className="w-3 h-3" /> Note
        </button>
        <button onClick={() => props.fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 text-gray-600 hover:bg-white text-xs font-medium transition-colors">
          <ImageIcon className="w-3 h-3" /> Image
        </button>
        <button onClick={handleAddChecklist} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 text-gray-600 hover:bg-white text-xs font-medium transition-colors">
          <CheckSquare className="w-3 h-3" /> Checklist
        </button>
        <div className="ml-auto text-[10px] text-gray-400">{nodes.length} items</div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-default"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Grid dots */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 origin-top-left"
          style={{
            backgroundImage: 'radial-gradient(circle, #c5c2bc 1px, transparent 1px)',
            backgroundSize: `${24 * camera.z}px ${24 * camera.z}px`,
            backgroundPosition: `${camera.x}px ${camera.y}px`,
          }}
        />

        {/* Cards */}
        <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})` }}>
          {cards.map(card => (
            <div
              key={card.id}
              className={cn(
                "absolute cursor-grab active:cursor-grabbing hover:shadow-xl transition-shadow group",
                draggingId === card.id && "z-50"
              )}
              style={{
                left: draggingId === card.id && dragLocalPos ? dragLocalPos.x : card.x,
                top: draggingId === card.id && dragLocalPos ? dragLocalPos.y : card.y,
                width: card.width || 140,
                height: card.height || 100,
                transform: `rotate(${card.rotation || 0}deg)`,
              }}
              onPointerDown={(e) => handleNodePointerDown(e, card)}
              onDoubleClick={() => handleNodeDoubleClick(card)}
            >
              {card.type === 'image' ? (
                <div className="w-full h-full rounded-xl overflow-hidden shadow-md bg-gray-200" style={{ background: card.backgroundColor || NODE_COLORS[0] }}>
                  {card.content && (
                    <img src={card.content} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              ) : (
                <div className="w-full h-full rounded-xl p-3 shadow-md flex flex-col" style={{ background: card.backgroundColor || NODE_COLORS[0] }}>
                  {editingId === card.id ? (
                    <textarea
                      className="w-full h-full bg-transparent border-none outline-none resize-none text-[10px] text-gray-700"
                      defaultValue={card.content || ''}
                      onBlur={(e) => { updateNodeContent(card.id, e.target.value); setEditingId(null); }}
                      autoFocus
                    />
                  ) : (
                    <div className="text-[10.5px] text-gray-700 leading-normal overflow-hidden whitespace-pre-wrap flex-1 break-words select-none font-medium">
                      {card.content || 'Double click to edit'}
                    </div>
                  )}
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNode(card.id); }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
