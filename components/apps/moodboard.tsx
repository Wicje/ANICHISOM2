'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { motion, useDragControls } from 'motion/react';
import {
  MousePointer2, GripHorizontal, Type, Trash2, Link as LinkIcon, Upload,
  MessageSquare, Heart, X as XIcon, CheckCircle, Plus, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize, Download, Tag, Group, Minus, ArrowRight,
  Lock, Unlock, Palette, Eye, LayoutGrid, Pin, Star, Sparkles,
  ChevronDown, ChevronRight, Send, Filter, Presentation, Scissors, ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import { get, set } from 'idb-keyval';
import { cn } from '@/lib/utils';
import { useCollaborativeDoc } from '@/lib/hooks/useCollaborativeDoc';
import { PerfectCursor } from 'perfect-cursors';
import { MoodboardExportService } from '@/lib/services/moodboard-export.service';

// ─── Types ────────────────────────────────────────────────────────────────

type NodeComment = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
  parentId?: string;
};

type BoardNode = {
  id: string;
  type: 'image' | 'text' | 'video' | 'embed';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  backgroundColor?: string;
  tags?: string[];
  groupId?: string;
  reactions?: Record<string, string[]>;
  comments?: NodeComment[];
  campaignLinkId?: string;
  locked?: boolean;
  label?: string;
};

type Comment = {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
};

type BoardGroup = {
  id: string;
  name: string;
  color: string;
  collapsed?: boolean;
};

type BoardTag = {
  id: string;
  name: string;
  color: string;
};

type Connection = {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
};

type CanvasMode = 'select' | 'pan' | 'comment' | 'connect';

const REACTION_EMOJIS = ['❤️', '👍', '🔥', '✨', '🎯', '💡'];
const NODE_COLORS = [
  '#ffffff', '#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3',
  '#f3e8ff', '#e0e7ff', '#fed7aa', '#d1fae5', '#fecaca',
  '#f5f5f4', '#1e1e1e',
];
const GROUP_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e',
];
const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#64748b',
];
const SNAP_GRID_SIZE = 24;

// ─── Helpers ──────────────────────────────────────────────────────────────

function usePerfectCursor(cb: (point: number[]) => void, point?: number[]) {
  const [pc] = useState(() => new PerfectCursor(cb));
  useEffect(() => { if (point) pc.addPoint(point); }, [pc, point]);
  useEffect(() => () => pc.dispose(), [pc]);
  return pc;
}

function CursorOverlay({ state }: { state: any }) {
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

function BlobMedia({ content, type, className }: { content: string; type: 'image' | 'video'; className?: string }) {
  const [blobSrc, setBlobSrc] = useState<string>('');
  useEffect(() => {
    if (content.startsWith('local-blob:')) {
      const id = content.split(':')[1];
      let active = true;
      let url = '';
      get(`blob_${id}`).then((blob: any) => {
        if (active && blob instanceof Blob) {
          url = URL.createObjectURL(blob);
          setBlobSrc(url);
        }
      });
      return () => { active = false; if (url) URL.revokeObjectURL(url); };
    }
  }, [content]);
  const src = content.startsWith('local-blob:') ? blobSrc : content;
  if (!src) return <div className="w-[400px] h-[300px] bg-slate-100 animate-pulse rounded flex items-center justify-center text-xs text-black/50">Loading Media...</div>;
  if (type === 'video') return <video src={src} className={className} controls onPointerDown={(e) => e.stopPropagation()} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} className={className} alt="Media content" />;
}

const isImageUrl = (url: string) => /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(url);

function getEmbedDetails(url: string) {
  try {
    if (url.includes('youtube.com/watch') || url.includes('youtube.com/shorts/')) {
      const urlObj = new URL(url);
      const v = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      return { url: `https://www.youtube.com/embed/${v}`, w: 400, h: 225 };
    }
    if (url.includes('youtu.be/')) {
      const urlObj = new URL(url);
      return { url: `https://www.youtube.com/embed${urlObj.pathname}`, w: 400, h: 225 };
    }
    if (url.includes('instagram.com/')) {
      const cleanUrl = url.split('?')[0].replace(/\/$/, '');
      return { url: `${cleanUrl}/embed`, w: 340, h: 440 };
    }
    if (url.includes('pinterest.com/pin/')) {
      const parts = url.split('/');
      const pinIndex = parts.indexOf('pin');
      if (pinIndex !== -1 && parts[pinIndex + 1]) {
        return { url: `https://assets.pinterest.com/ext/embed.html?id=${parts[pinIndex + 1]}`, w: 236, h: 420 };
      }
    }
  } catch (_) {}
  return { url, w: 400, h: 300 };
}

function snapToGrid(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}

// ─── Connection Line Renderer ─────────────────────────────────────────────

function ConnectionLines({ connections, nodes, camera }: { connections: Connection[]; nodes: BoardNode[]; camera: { x: number; y: number; z: number } }) {
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

// ─── Mini Map ─────────────────────────────────────────────────────────────

function MiniMap({ nodes, camera, containerSize, onNavigate }: {
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

// ─── Resizable Draggable Node ─────────────────────────────────────────────

function DraggableNode({
  node, cameraScale, groups, tags, onDelete, onPositionChange, onContentChange,
  onSizeChange, onToggleLock, onSetBackground, onAddTag, onRemoveTag,
  onSetGroup, onRemoveGroup, onAddReaction, onAddComment, onSetLabel,
  onRemoveCampaignLink, connectFromId, onConnectTo,
}: {
  node: BoardNode; cameraScale: number; groups: BoardGroup[]; tags: BoardTag[];
  onDelete: () => void; onPositionChange: (x: number, y: number) => void;
  onContentChange: (c: string) => void; onSizeChange: (w: number, h: number) => void;
  onToggleLock: () => void; onSetBackground: (color: string) => void;
  onAddTag: (tagId: string) => void; onRemoveTag: (tagId: string) => void;
  onSetGroup: (groupId: string) => void; onRemoveGroup: () => void;
  onAddReaction: (emoji: string) => void; onAddComment: (text: string) => void;
  onSetLabel: (label: string) => void; onRemoveCampaignLink: () => void;
  connectFromId: string | null; onConnectTo: (fromId: string, toId: string) => void;
}) {
  const dragControls = useDragControls();
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState<string>('');
  const nodeRef = useRef<HTMLDivElement>(null);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const group = groups.find(g => g.id === node.groupId);
  const nodeTags = tags.filter(t => node.tags?.includes(t.id));
  const defaultW = node.type === 'text' ? 240 : node.type === 'embed' ? getEmbedDetails(node.content).w + 16 : 300;
  const defaultH = node.type === 'text' ? 150 : node.type === 'embed' ? getEmbedDetails(node.content).h + 16 : 200;
  const nodeW = node.width || defaultW;
  const nodeH = node.height || defaultH;

  const handleResizeStart = useCallback((dir: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeDir(dir);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: nodeW, h: nodeH };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [nodeW, nodeH]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing) return;
    const dx = (e.clientX - resizeStart.current.x) / cameraScale;
    const dy = (e.clientY - resizeStart.current.y) / cameraScale;
    let newW = resizeStart.current.w;
    let newH = resizeStart.current.h;
    if (resizeDir.includes('e')) newW = Math.max(100, resizeStart.current.w + dx);
    if (resizeDir.includes('w')) newW = Math.max(100, resizeStart.current.w - dx);
    if (resizeDir.includes('s')) newH = Math.max(60, resizeStart.current.h + dy);
    if (resizeDir.includes('n')) newH = Math.max(60, resizeStart.current.h - dy);
    onSizeChange(newW, newH);
  }, [isResizing, resizeDir, cameraScale, onSizeChange]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeDir('');
  }, []);

  // Connect mode: clicking this node becomes the target
  const isConnectTarget = connectFromId !== null && connectFromId !== node.id;

  return (
    <motion.div
      ref={nodeRef}
      drag={!node.locked && !isResizing}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      initial={{ x: node.x, y: node.y, opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onDragEnd={(_, info) => {
        onPositionChange(node.x + info.offset.x / cameraScale, node.y + info.offset.y / cameraScale);
      }}
      onPointerMove={isResizing ? handleResizeMove : undefined}
      onPointerUp={isResizing ? handleResizeEnd : undefined}
      className={cn(
        "absolute group rounded-xl shadow-lg border transition-shadow",
        node.locked ? "border-slate-300" : "border-black/10",
        isConnectTarget ? "ring-2 ring-blue-500 ring-offset-2" : "",
        "hover:shadow-xl",
      )}
      style={{
        width: nodeW,
        minHeight: nodeH,
        backgroundColor: node.backgroundColor || '#ffffff',
        position: 'absolute',
      }}
      onPointerDown={(e) => {
        if (isConnectTarget) {
          onConnectTo(connectFromId, node.id);
          return;
        }
        if (!node.locked && !isResizing) {
          dragControls.start(e);
        }
      }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setShowContextMenu(!showContextMenu); }}
    >
      {/* Drag handle header */}
      <div
        className={cn(
          "h-7 w-full rounded-t-xl flex items-center justify-between px-2 transition-opacity cursor-grab active:cursor-grabbing",
          node.locked ? "bg-slate-200 opacity-100" : "bg-slate-50/80 border-b border-black/5 opacity-0 group-hover:opacity-100",
        )}
        onPointerDown={(e) => { if (!node.locked) dragControls.start(e); }}
      >
        <div className="flex items-center gap-1">
          <GripHorizontal className="w-3 h-3 text-slate-400" />
          {node.label && <span className="text-[10px] font-bold text-black/40 truncate max-w-[100px]">{node.label}</span>}
          {node.locked && <Lock className="w-3 h-3 text-slate-400" />}
          {node.campaignLinkId && <ExternalLink className="w-3 h-3 text-blue-400" />}
        </div>
        <div className="flex items-center gap-1">
          {group && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: group.color + '30', color: group.color }}>{group.name}</span>}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={onDelete} className="hover:bg-rose-100 p-0.5 rounded text-rose-500 opacity-0 group-hover:opacity-100">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tags row */}
      {nodeTags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-1">
          {nodeTags.map(tag => (
            <span key={tag.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
              {tag.name}
              <button onClick={() => onRemoveTag(tag.id)} className="hover:opacity-100 opacity-60">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      {node.type === 'text' && (
        <div className="p-3 font-sans text-black" style={{ minHeight: nodeH - 28 - (nodeTags.length > 0 ? 20 : 0) }}>
          <textarea
            className="w-full bg-transparent border-none outline-none resize-none"
            value={node.content}
            onChange={(e) => onContentChange(e.target.value)}
            spellCheck={false}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Type or paste text..."
            style={{ minHeight: nodeH - 60 }}
          />
        </div>
      )}

      {node.type === 'image' && (
        <div className="p-2 pointer-events-none">
          <BlobMedia content={node.content} type="image" className={cn("object-cover rounded pointer-events-none", `max-w-[${nodeW}px]`)} />
        </div>
      )}

      {node.type === 'video' && (
        <div className="p-2" style={{ maxWidth: nodeW - 16 }}>
          <BlobMedia content={node.content} type="video" className="object-cover rounded max-w-full" />
        </div>
      )}

      {node.type === 'embed' && (
        <div className="p-2" style={{ width: getEmbedDetails(node.content).w + 16, height: getEmbedDetails(node.content).h + 16 }}>
          <iframe
            src={getEmbedDetails(node.content).url}
            className="w-full h-full border-none rounded pointer-events-auto"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Reactions row */}
      {node.reactions && Object.keys(node.reactions).length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-1">
          {Object.entries(node.reactions).map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => onAddReaction(emoji)}
              className="text-xs px-1.5 py-0.5 rounded-full bg-black/5 hover:bg-black/10 transition-colors flex items-center gap-0.5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {emoji} <span className="text-black/50">{users.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Comment count indicator */}
      {node.comments && node.comments.length > 0 && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowComments(!showComments)}
            className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-1 font-bold"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MessageSquare className="w-3 h-3" /> {node.comments.length} comment{node.comments.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Quick action bar (appears on hover) */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white shadow-md rounded-full px-1 py-0.5 border border-black/10 z-20">
        <button onClick={() => setShowReactions(!showReactions)} className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-slate-100" onPointerDown={(e) => e.stopPropagation()} title="React">😊</button>
        <button onClick={() => setShowComments(!showComments)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 text-black/50" onPointerDown={(e) => e.stopPropagation()} title="Comment">
          <MessageSquare className="w-3 h-3" />
        </button>
        <button onClick={onToggleLock} className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 text-black/50" onPointerDown={(e) => e.stopPropagation()} title={node.locked ? 'Unlock' : 'Lock'}>
          {node.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
        </button>
      </div>

      {/* Reaction picker popup */}
      {showReactions && (
        <div className="absolute top-8 left-0 bg-white shadow-xl rounded-lg border border-black/10 p-1.5 flex gap-1 z-30" onPointerDown={(e) => e.stopPropagation()}>
          {REACTION_EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => { onAddReaction(emoji); setShowReactions(false); }} className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-sm transition-colors">
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Comment thread panel */}
      {showComments && (
        <div className="absolute top-8 right-0 w-64 bg-white shadow-xl rounded-lg border border-black/10 z-30" onPointerDown={(e) => e.stopPropagation()}>
          <div className="p-2 border-b border-black/5 flex items-center justify-between">
            <span className="text-xs font-bold text-black/60">Comments</span>
            <button onClick={() => setShowComments(false)} className="text-black/40 hover:text-black"><XIcon className="w-3 h-3" /></button>
          </div>
          <div className="max-h-[200px] overflow-y-auto p-2 space-y-2">
            {(node.comments || []).map(c => (
              <div key={c.id} className="text-xs">
                <div className="font-bold text-black/50">{c.author}</div>
                <div className="text-black/80">{c.text}</div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-black/5 flex gap-1">
            <input
              className="flex-1 text-xs border border-black/10 rounded px-2 py-1 outline-none focus:border-blue-400"
              placeholder="Add comment..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  onAddComment(e.currentTarget.value.trim());
                  e.currentTarget.value = '';
                }
              }}
            />
            <button className="w-6 h-6 rounded flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600">
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Context menu */}
      {showContextMenu && (
        <div className="absolute top-8 left-0 bg-white shadow-xl rounded-lg border border-black/10 py-1 z-30 w-48" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => { onSetLabel(prompt('Set label:', node.label || '') || ''); setShowContextMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 flex items-center gap-2">
            <Tag className="w-3 h-3" /> Set Label
          </button>
          <button onClick={() => { onSetGroup(prompt('Group ID (or empty to remove):', node.groupId || '') || ''); setShowContextMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 flex items-center gap-2">
            <Group className="w-3 h-3" /> Set Group
          </button>
          <button onClick={() => { onRemoveGroup(); setShowContextMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 flex items-center gap-2">
            <Minus className="w-3 h-3" /> Remove Group
          </button>
          <button onClick={() => { onRemoveCampaignLink(); setShowContextMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 flex items-center gap-2">
            <ExternalLink className="w-3 h-3" /> Unlink Campaign
          </button>
          <div className="border-t border-black/5 my-1" />
          <div className="px-3 py-1 text-[10px] font-bold text-black/30 uppercase">Background</div>
          <div className="px-2 pb-1 flex flex-wrap gap-1">
            {NODE_COLORS.map(color => (
              <button key={color} onClick={() => { onSetBackground(color); setShowContextMenu(false); }} className="w-5 h-5 rounded border border-black/10 hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="border-t border-black/5 my-1" />
          <button onClick={() => { onDelete(); setShowContextMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-rose-50 text-rose-500 flex items-center gap-2">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}

      {/* Resize handles */}
      {!node.locked && (
        <>
          <div className="absolute -right-1 -bottom-1 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity" onPointerDown={(e) => handleResizeStart('se', e)} style={{ background: 'transparent' }}>
            <div className="w-2 h-2 bg-slate-400 rounded-bl absolute right-0.5 bottom-0.5" />
          </div>
          <div className="absolute -right-1 top-3 w-4 h-4 cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity" onPointerDown={(e) => handleResizeStart('e', e)} style={{ background: 'transparent' }} />
          <div className="absolute left-3 -bottom-1 w-4 h-4 cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity" onPointerDown={(e) => handleResizeStart('s', e)} style={{ background: 'transparent' }} />
        </>
      )}
    </motion.div>
  );
}

// ─── Sidebar Panel ────────────────────────────────────────────────────────

function MoodboardSidebar({
  groups, tags, connections, nodes,
  onCreateGroup, onDeleteGroup, onCreateTag, onDeleteTag,
  onDeleteConnection, onFilterTag, onFilterGroup, activeFilter,
  onAutoArrange,
}: {
  groups: BoardGroup[]; tags: BoardTag[]; connections: Connection[]; nodes: BoardNode[];
  onCreateGroup: (name: string, color: string) => void; onDeleteGroup: (id: string) => void;
  onCreateTag: (name: string, color: string) => void; onDeleteTag: (id: string) => void;
  onDeleteConnection: (id: string) => void;
  onFilterTag: (tagId: string | null) => void; onFilterGroup: (groupId: string | null) => void;
  activeFilter: { tagId: string | null; groupId: string | null };
  onAutoArrange: () => void;
}) {
  const [section, setSection] = useState<'groups' | 'tags' | 'layout' | 'connections'>('groups');

  return (
    <div className="absolute top-4 left-4 bottom-4 w-52 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-black/10 z-40 overflow-y-auto">
      <div className="p-3 border-b border-black/5">
        <div className="text-xs font-bold text-black/40 uppercase tracking-wider">Organize</div>
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-black/5">
        {(['groups', 'tags', 'layout', 'connections'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)} className={cn(
            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors",
            section === s ? "text-black bg-slate-50" : "text-black/30 hover:text-black/50",
          )}>
            {s === 'connections' ? 'lines' : s}
          </button>
        ))}
      </div>

      <div className="p-2">
        {section === 'groups' && (
          <div className="space-y-1">
            {groups.map(g => (
              <div key={g.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 group/item">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="text-xs font-medium flex-1 truncate">{g.name}</span>
                <span className="text-[10px] text-black/30">{nodes.filter(n => n.groupId === g.id).length}</span>
                <button onClick={() => onFilterGroup(activeFilter.groupId === g.id ? null : g.id)} className={cn(
                  "w-5 h-5 rounded flex items-center justify-center transition-colors",
                  activeFilter.groupId === g.id ? "bg-blue-500 text-white" : "text-black/30 hover:text-black/60",
                )}>
                  <Filter className="w-3 h-3" />
                </button>
                <button onClick={() => onDeleteGroup(g.id)} className="w-5 h-5 rounded text-rose-400 opacity-0 group-hover/item:opacity-100 hover:bg-rose-50">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={() => {
              const name = prompt('Group name:');
              if (name) onCreateGroup(name, GROUP_COLORS[groups.length % GROUP_COLORS.length]);
            }} className="w-full text-xs text-blue-500 hover:text-blue-600 py-1 flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" /> Add Group
            </button>
          </div>
        )}

        {section === 'tags' && (
          <div className="space-y-1">
            {tags.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 group/item">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: t.color }} />
                <span className="text-xs font-medium flex-1 truncate">{t.name}</span>
                <span className="text-[10px] text-black/30">{nodes.filter(n => n.tags?.includes(t.id)).length}</span>
                <button onClick={() => onFilterTag(activeFilter.tagId === t.id ? null : t.id)} className={cn(
                  "w-5 h-5 rounded flex items-center justify-center transition-colors",
                  activeFilter.tagId === t.id ? "bg-blue-500 text-white" : "text-black/30 hover:text-black/60",
                )}>
                  <Filter className="w-3 h-3" />
                </button>
                <button onClick={() => onDeleteTag(t.id)} className="w-5 h-5 rounded text-rose-400 opacity-0 group-hover/item:opacity-100 hover:bg-rose-50">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={() => {
              const name = prompt('Tag name:');
              if (name) onCreateTag(name, TAG_COLORS[tags.length % TAG_COLORS.length]);
            }} className="w-full text-xs text-blue-500 hover:text-blue-600 py-1 flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" /> Add Tag
            </button>
          </div>
        )}

        {section === 'layout' && (
          <div className="space-y-2">
            <button onClick={onAutoArrange} className="w-full text-xs bg-slate-50 hover:bg-slate-100 rounded-lg py-2 flex items-center justify-center gap-1 text-black/60">
              <LayoutGrid className="w-3 h-3" /> Auto-Arrange Grid
            </button>
            <div className="text-[10px] text-black/30 text-center">Arrange items in a neat grid layout</div>
          </div>
        )}

        {section === 'connections' && (
          <div className="space-y-1">
            {connections.length === 0 && (
              <div className="text-xs text-black/30 text-center py-4">No connections yet. Use the Connect tool to draw lines between items.</div>
            )}
            {connections.map(c => {
              const from = nodes.find(n => n.id === c.fromId);
              const to = nodes.find(n => n.id === c.toId);
              return (
                <div key={c.id} className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-50 group/item">
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] truncate flex-1">{from?.label || from?.content.slice(0, 20) || '?'} → {to?.label || to?.content.slice(0, 20) || '?'}</span>
                  <button onClick={() => onDeleteConnection(c.id)} className="w-5 h-5 rounded text-rose-400 opacity-0 group-hover/item:opacity-100 hover:bg-rose-50">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Moodboard Component ─────────────────────────────────────────────

export function Moodboard({ window: osWindow }: { window: OSWindow }) {
  const { workspaceMode, openWindow } = useOS();
  const projectId = osWindow.data?.projectId || osWindow.id;

  const collab = useCollaborativeDoc({
    appPrefix: 'moodboard',
    docId: projectId,
    sharedTypes: [
      { name: 'nodes', kind: 'Map' },
      { name: 'comments', kind: 'Map' },
      { name: 'connections', kind: 'Map' },
      { name: 'groups', kind: 'Map' },
      { name: 'tags', kind: 'Map' },
    ],
    undoTrackingTypes: ['nodes', 'comments', 'connections', 'groups', 'tags'],
    onFirstSync: (_ydoc: any, types: Record<string, any>) => {
      if (types.nodes.size === 0) {
        const initNode: BoardNode = {
          id: '1', type: 'text', x: 100, y: 100,
          content: `CAMPAIGN: "${projectId.toUpperCase()}"\n\n${workspaceMode === 'agency' ? 'Agency Shared Mode' : 'Private Mode'}`,
          backgroundColor: '#fef3c7',
        };
        types.nodes.set(initNode.id, initNode);
      }
    },
  });

  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<BoardGroup[]>([]);
  const [tags, setTags] = useState<BoardTag[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [mode, setMode] = useState<CanvasMode>('select');
  const [voteMode, setVoteMode] = useState(false);
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ tagId: string | null; groupId: string | null }>({ tagId: null, groupId: null });
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [presentMode, setPresentMode] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCampaignLink, setShowCampaignLink] = useState<string | null>(null);

  // Sync Yjs → React
  useEffect(() => {
    if (!collab.synced) return;
    const yNodes = collab.sharedTypesRef.current.nodes;
    const yComments = collab.sharedTypesRef.current.comments;
    const yConnections = collab.sharedTypesRef.current.connections;
    const yGroups = collab.sharedTypesRef.current.groups;
    const yTags = collab.sharedTypesRef.current.tags;

    const syncUi = () => {
      setNodes(Array.from(yNodes.values()));
      setComments(Array.from(yComments.values()));
      setConnections(Array.from(yConnections.values()));
      setGroups(Array.from(yGroups.values()));
      setTags(Array.from(yTags.values()));
    };

    syncUi();
    yNodes.observe(syncUi);
    yComments.observe(syncUi);
    yConnections.observe(syncUi);
    yGroups.observe(syncUi);
    yTags.observe(syncUi);
    return () => {
      yNodes.unobserve(syncUi);
      yComments.unobserve(syncUi);
      yConnections.unobserve(syncUi);
      yGroups.unobserve(syncUi);
      yTags.unobserve(syncUi);
    };
  }, [collab.synced, collab.sharedTypesRef]);

  // Inject data from window param
  useEffect(() => {
    if (collab.synced && osWindow.data?.url) {
      const yNodes = collab.sharedTypesRef.current.nodes;
      if (yNodes) {
        const existing = Array.from(yNodes.values()).find((n: any) => n.content === osWindow.data?.url);
        if (!existing) {
          const newId = crypto.randomUUID();
          yNodes.set(newId, { id: newId, type: 'image', x: 200, y: 200, width: 400, content: osWindow.data.url });
        }
      }
    }
  }, [osWindow.data?.url, collab.synced, collab.sharedTypesRef]);

  // Listen for browser clip events
  useEffect(() => {
    const handleClip = (e: CustomEvent) => {
      const { url, title, image } = e.detail || {};
      if (url || image) {
        const yNodes = collab.sharedTypesRef.current.nodes;
        const newId = crypto.randomUUID();
        const x = (osWindow.width / 2 - camera.x) / camera.z;
        const y = (osWindow.height / 2 - camera.y) / camera.z;
        if (image) {
          yNodes.set(newId, { id: newId, type: 'image', x, y, width: 350, content: image, label: title || 'Clipped from browser' });
        } else if (url) {
          const type = isImageUrl(url) ? 'image' : 'embed';
          yNodes.set(newId, { id: newId, type, x, y, content: url, label: title || 'Clipped from browser' });
        }
      }
    };
    window.addEventListener('os:clip-to-moodboard', handleClip as EventListener);
    return () => window.removeEventListener('os:clip-to-moodboard', handleClip as EventListener);
  }, [collab.synced, collab.sharedTypesRef, camera, osWindow.width, osWindow.height]);

  // Wheel zoom/pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCamera(prev => {
        let { x, y, z } = prev;
        if (e.ctrlKey || e.metaKey) {
          const zoomFactor = Math.pow(0.995, e.deltaY);
          const newZ = Math.min(Math.max(0.1, z * zoomFactor), 5);
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          x = mouseX - (mouseX - x) * (newZ / z);
          y = mouseY - (mouseY - y) * (newZ / z);
          z = newZ;
        } else {
          x -= e.deltaX;
          y -= e.deltaY;
        }
        return { x, y, z };
      });
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // ─── Yjs write helpers ──────────────────────────────────────────────────

  const _updateYNode = useCallback((newVals: Partial<BoardNode> & { id: string }) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(newVals.id) || {};
      yNodes.set(newVals.id, { ...existing, ...newVals });
    }
  }, [collab.sharedTypesRef]);

  const _updateYComment = useCallback((newVals: Partial<Comment> & { id: string }) => {
    const yComments = collab.sharedTypesRef.current.comments;
    if (yComments) {
      const existing = yComments.get(newVals.id) || {};
      yComments.set(newVals.id, { ...existing, ...newVals });
    }
  }, [collab.sharedTypesRef]);

  const _deleteYComment = useCallback((id: string) => {
    collab.sharedTypesRef.current.comments?.delete(id);
  }, [collab.sharedTypesRef]);

  const undo = collab.undo;
  const redo = collab.redo;

  // ─── Node actions ────────────────────────────────────────────────────────

  const centerCanvasX = useCallback(() => (osWindow.width / 2 - camera.x) / camera.z, [osWindow.width, camera.x, camera.z]);
  const centerCanvasY = useCallback(() => (osWindow.height / 2 - camera.y) / camera.z, [osWindow.height, camera.y, camera.z]);

  const addText = useCallback(() => {
    const newId = crypto.randomUUID();
    _updateYNode({ id: newId, type: 'text', x: centerCanvasX(), y: centerCanvasY(), content: 'New Text', width: 240, height: 150 });
  }, [_updateYNode, centerCanvasX, centerCanvasY]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('File too large. Max 50MB.'); return; }
    const fileId = crypto.randomUUID();
    await set(`blob_${fileId}`, file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const newId = crypto.randomUUID();
    _updateYNode({ id: newId, type, x: centerCanvasX(), y: centerCanvasY(), content: `local-blob:${fileId}` });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [_updateYNode, centerCanvasX, centerCanvasY]);

  const processUrl = useCallback((url: string) => {
    let type: BoardNode['type'] = 'embed';
    if (isImageUrl(url)) type = 'image';
    else if (url.includes('youtube.com/') || url.includes('youtu.be/') || url.includes('instagram.com/') || url.includes('pinterest.com/')) type = 'embed';
    const newId = crypto.randomUUID();
    _updateYNode({ id: newId, type, x: centerCanvasX(), y: centerCanvasY(), content: url });
  }, [_updateYNode, centerCanvasX, centerCanvasY]);

  const handleAddLink = useCallback(() => {
    const url = prompt('Enter a URL (YouTube, Instagram, Pinterest, Image, etc.):');
    if (url) processUrl(url);
  }, [processUrl]);

  const deleteNode = useCallback((id: string) => {
    collab.sharedTypesRef.current.nodes?.delete(id);
    // Also remove connections involving this node
    const yConns = collab.sharedTypesRef.current.connections;
    if (yConns) {
      Array.from(yConns.entries()).forEach((entry) => {
        const [cid, conn] = entry as [string, Connection];
        if (conn.fromId === id || conn.toId === id) yConns.delete(cid);
      });
    }
  }, [collab.sharedTypesRef]);

  const addConnection = useCallback((fromId: string, toId: string) => {
    const yConns = collab.sharedTypesRef.current.connections;
    if (yConns) {
      const newId = crypto.randomUUID();
      yConns.set(newId, { id: newId, fromId, toId, color: '#94a3b8' });
    }
    setConnectFromId(null);
    setMode('select');
  }, [collab.sharedTypesRef]);

  const deleteConnection = useCallback((id: string) => {
    collab.sharedTypesRef.current.connections?.delete(id);
  }, [collab.sharedTypesRef]);

  // ─── Group/Tag actions ──────────────────────────────────────────────────

  const createGroup = useCallback((name: string, color: string) => {
    const yGroups = collab.sharedTypesRef.current.groups;
    if (yGroups) {
      const newId = crypto.randomUUID();
      yGroups.set(newId, { id: newId, name, color });
    }
  }, [collab.sharedTypesRef]);

  const deleteGroup = useCallback((id: string) => {
    collab.sharedTypesRef.current.groups?.delete(id);
    // Remove group assignment from nodes
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      Array.from(yNodes.entries()).forEach((entry) => {
        const [nid, node] = entry as [string, BoardNode];
        if (node.groupId === id) yNodes.set(nid, { ...node, groupId: undefined });
      });
    }
  }, [collab.sharedTypesRef]);

  const createTag = useCallback((name: string, color: string) => {
    const yTags = collab.sharedTypesRef.current.tags;
    if (yTags) {
      const newId = crypto.randomUUID();
      yTags.set(newId, { id: newId, name, color });
    }
  }, [collab.sharedTypesRef]);

  const deleteTag = useCallback((id: string) => {
    collab.sharedTypesRef.current.tags?.delete(id);
    // Remove tag from nodes
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      Array.from(yNodes.entries()).forEach((entry) => {
        const [nid, node] = entry as [string, BoardNode];
        if (node.tags?.includes(id)) yNodes.set(nid, { ...node, tags: node.tags.filter((t: string) => t !== id) });
      });
    }
  }, [collab.sharedTypesRef]);

  // ─── Node mutation helpers ──────────────────────────────────────────────

  const updateNodePosition = useCallback((id: string, x: number, y: number) => {
    if (snapEnabled) {
      _updateYNode({ id, x: snapToGrid(x, SNAP_GRID_SIZE), y: snapToGrid(y, SNAP_GRID_SIZE) });
    } else {
      _updateYNode({ id, x, y });
    }
  }, [_updateYNode, snapEnabled]);

  const updateNodeContent = useCallback((id: string, content: string) => {
    _updateYNode({ id, content });
  }, [_updateYNode]);

  const updateNodeSize = useCallback((id: string, width: number, height: number) => {
    _updateYNode({ id, width, height });
  }, [_updateYNode]);

  const toggleNodeLock = useCallback((id: string) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(id) || {};
      _updateYNode({ id, locked: !existing.locked });
    }
  }, [_updateYNode, collab.sharedTypesRef]);

  const setNodeBackground = useCallback((id: string, color: string) => {
    _updateYNode({ id, backgroundColor: color });
  }, [_updateYNode]);

  const addNodeTag = useCallback((nodeId: string, tagId: string) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(nodeId) || {};
      const currentTags = existing.tags || [];
      if (!currentTags.includes(tagId)) {
        _updateYNode({ id: nodeId, tags: [...currentTags, tagId] });
      }
    }
  }, [_updateYNode, collab.sharedTypesRef]);

  const removeNodeTag = useCallback((nodeId: string, tagId: string) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(nodeId) || {};
      const currentTags = existing.tags || [];
      _updateYNode({ id: nodeId, tags: currentTags.filter((t: string) => t !== tagId) });
    }
  }, [_updateYNode, collab.sharedTypesRef]);

  const setNodeGroup = useCallback((nodeId: string, groupId: string) => {
    _updateYNode({ id: nodeId, groupId });
  }, [_updateYNode]);

  const removeNodeGroup = useCallback((nodeId: string) => {
    _updateYNode({ id: nodeId, groupId: undefined });
  }, [_updateYNode]);

  const addNodeReaction = useCallback((nodeId: string, emoji: string) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(nodeId) || {};
      const reactions = existing.reactions || {};
      const current = reactions[emoji] || [];
      const userId = 'local';
      if (!current.includes(userId)) {
        _updateYNode({ id: nodeId, reactions: { ...reactions, [emoji]: [...current, userId] } });
      } else {
        // Toggle off if already reacted
        _updateYNode({ id: nodeId, reactions: { ...reactions, [emoji]: current.filter((u: string) => u !== userId) } });
      }
    }
  }, [_updateYNode, collab.sharedTypesRef]);

  const addNodeComment = useCallback((nodeId: string, text: string) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(nodeId) || {};
      const currentComments = existing.comments || [];
      const newComment: NodeComment = { id: crypto.randomUUID(), author: 'Guest', text, createdAt: Date.now() };
      _updateYNode({ id: nodeId, comments: [...currentComments, newComment] });
    }
  }, [_updateYNode, collab.sharedTypesRef]);

  const setNodeLabel = useCallback((nodeId: string, label: string) => {
    _updateYNode({ id: nodeId, label });
  }, [_updateYNode]);

  const removeCampaignLink = useCallback((nodeId: string) => {
    _updateYNode({ id: nodeId, campaignLinkId: undefined });
  }, [_updateYNode]);

  // ─── Filter ──────────────────────────────────────────────────────────────

  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (activeFilter.tagId) {
      result = result.filter(n => n.tags?.includes(activeFilter.tagId!));
    }
    if (activeFilter.groupId) {
      result = result.filter(n => n.groupId === activeFilter.groupId);
    }
    return result;
  }, [nodes, activeFilter]);

  // ─── Auto-arrange ────────────────────────────────────────────────────────

  const autoArrange = useCallback(() => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (!yNodes) return;
    const allNodes = Array.from(yNodes.entries());
    const cols = Math.ceil(Math.sqrt(allNodes.length));
    const gapX = 280;
    const gapY = 250;
    allNodes.forEach((entry, i: number) => {
      const [nid, node] = entry as [string, BoardNode];
      const col = i % cols;
      const row = Math.floor(i / cols);
      yNodes.set(nid, { ...node, x: 100 + col * gapX, y: 100 + row * gapY });
    });
  }, [collab.sharedTypesRef]);

  // ─── Zoom controls ──────────────────────────────────────────────────────

  const zoomIn = useCallback(() => {
    setCamera(prev => {
      const newZ = Math.min(prev.z * 1.2, 5);
      const cx = osWindow.width / 2;
      const cy = osWindow.height / 2;
      return {
        x: cx - (cx - prev.x) * (newZ / prev.z),
        y: cy - (cy - prev.y) * (newZ / prev.z),
        z: newZ,
      };
    });
  }, [osWindow.width, osWindow.height]);

  const zoomOut = useCallback(() => {
    setCamera(prev => {
      const newZ = Math.max(prev.z / 1.2, 0.1);
      const cx = osWindow.width / 2;
      const cy = osWindow.height / 2;
      return {
        x: cx - (cx - prev.x) * (newZ / prev.z),
        y: cy - (cy - prev.y) * (newZ / prev.z),
        z: newZ,
      };
    });
  }, [osWindow.width, osWindow.height]);

  const fitToContent = useCallback(() => {
    if (nodes.length === 0) {
      setCamera({ x: 0, y: 0, z: 1 });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + (n.width || 200));
      maxY = Math.max(maxY, n.y + (n.height || 200));
    }
    const contentW = maxX - minX + 100;
    const contentH = maxY - minY + 100;
    const z = Math.min(osWindow.width / contentW, osWindow.height / contentH, 1);
    const cx = osWindow.width / 2;
    const cy = osWindow.height / 2;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setCamera({ x: cx - centerX * z, y: cy - centerY * z, z });
  }, [nodes, osWindow.width, osWindow.height]);

  // ─── Export ──────────────────────────────────────────────────────────────

  const exportJSON = useCallback(() => {
    const data = { nodes, comments, connections, groups, tags, exportedAt: Date.now(), projectId };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `moodboard-${projectId}.json`; a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [nodes, comments, connections, groups, tags, projectId]);

  const exportPNG = useCallback(async () => {
    const exportNodes = nodes.map(n => ({
      id: n.id, type: n.type, x: n.x, y: n.y, width: n.width, height: n.height,
      content: n.content, label: n.label, backgroundColor: n.backgroundColor,
      tags: n.tags, reactions: n.reactions,
    }));
    const { MoodboardExportService } = await import('@/lib/services/moodboard-export.service');
    await MoodboardExportService.exportPNG(exportNodes, { format: 'png', filename: `moodboard-${projectId}.png` });
    setShowExportMenu(false);
  }, [nodes, projectId]);

  const exportPrint = useCallback(() => {
    const exportNodes = nodes.map(n => ({
      id: n.id, type: n.type, x: n.x, y: n.y, width: n.width, height: n.height,
      content: n.content, label: n.label, backgroundColor: n.backgroundColor,
      tags: n.tags, reactions: n.reactions,
    }));
    const exportConns = connections.map(c => ({ fromId: c.fromId, toId: c.toId, label: c.label }));
    MoodboardExportService.exportPrint(exportNodes, exportConns, `Moodboard: ${projectId}`);
    setShowExportMenu(false);
  }, [nodes, connections, projectId]);

  // ─── Campaign linking ────────────────────────────────────────────────────

  const linkToCampaign = useCallback((nodeId: string, campaignPageId: string) => {
    _updateYNode({ id: nodeId, campaignLinkId: campaignPageId });
    setShowCampaignLink(null);
  }, [_updateYNode]);

  // ─── Pointer handlers ────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2 || mode === 'pan') {
      e.preventDefault();
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (mode === 'comment' && e.target === e.currentTarget) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - camera.x) / camera.z;
      const y = (e.clientY - rect.top - camera.y) / camera.z;
      _updateYComment({ id: crypto.randomUUID(), x, y, text: 'New comment...', author: 'Guest' });
      setMode('select');
    }
    if (mode === 'connect' && e.target === e.currentTarget) {
      setConnectFromId(null);
      setMode('select');
    }
  }, [mode, camera, _updateYComment]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      setCamera(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left - camera.x) / camera.z;
      const y = (e.clientY - rect.top - camera.y) / camera.z;
      collab.setLocalCursor(x, y);
    }
  }, [isPanning, camera, collab]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  // ─── Paste handler ──────────────────────────────────────────────────────

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async () => {
            const fileId = crypto.randomUUID();
            await set(`blob_${fileId}`, file);
            _updateYNode({ id: crypto.randomUUID(), type: 'image', x: centerCanvasX(), y: centerCanvasY(), content: `local-blob:${fileId}` });
          };
          reader.readAsArrayBuffer(file);
        }
        return;
      }
    }
    const text = e.clipboardData.getData('text');
    if (text) {
      if (/^https?:\/\//.test(text.trim())) {
        processUrl(text.trim());
      } else {
        _updateYNode({ id: crypto.randomUUID(), type: 'text', x: centerCanvasX(), y: centerCanvasY(), content: text });
      }
    }
  }, [_updateYNode, centerCanvasX, centerCanvasY, processUrl]);

  // ─── Presentation mode ──────────────────────────────────────────────────

  const presentableNodes = useMemo(() => nodes.filter(n => n.type === 'image' || n.type === 'embed' || (n.type === 'text' && n.content.length > 10)), [nodes]);

  if (!collab.synced) return null;

  // ─── Presentation mode overlay ──────────────────────────────────────────
  if (presentMode) {
    const node = presentableNodes[presentIndex];
    return (
      <div className="w-full h-full bg-[#111] flex flex-col items-center justify-center relative" onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') setPresentIndex(i => Math.min(i + 1, presentableNodes.length - 1));
        if (e.key === 'ArrowLeft') setPresentIndex(i => Math.max(i - 1, 0));
        if (e.key === 'Escape') setPresentMode(false);
      }} tabIndex={0}>
        <button onClick={() => setPresentMode(false)} className="absolute top-4 right-4 text-white/30 hover:text-white bg-white/10 p-2 rounded-full transition-colors z-50">
          <XIcon className="w-5 h-5" />
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs font-bold">
          {presentIndex + 1} / {presentableNodes.length} — Arrow keys to navigate, Esc to exit
        </div>
        {node ? (
          <div className="max-w-3xl max-h-[80vh] flex items-center justify-center">
            {node.type === 'image' && <BlobMedia content={node.content} type="image" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />}
            {node.type === 'embed' && (
              <iframe src={getEmbedDetails(node.content).url} className="w-[600px] h-[400px] border-none rounded-lg shadow-2xl" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" />
            )}
            {node.type === 'text' && (
              <div className="bg-white rounded-xl p-8 shadow-2xl max-w-xl text-black text-lg whitespace-pre-wrap">{node.content}</div>
            )}
            {node.label && <div className="text-white/60 text-sm mt-3 font-bold">{node.label}</div>}
          </div>
        ) : (
          <div className="text-white/30 text-lg">No items to present</div>
        )}
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-full bg-[#eee] overflow-hidden relative font-sans outline-none",
        isPanning ? "cursor-grabbing" : mode === 'pan' ? "cursor-grab" : mode === 'connect' ? "cursor-crosshair" : mode === 'comment' ? "cursor-crosshair" : "cursor-default",
      )}
      onPaste={handlePaste}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      }}
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={0}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20 origin-top-left"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)',
          backgroundSize: `${24 * camera.z}px ${24 * camera.z}px`,
          backgroundPosition: `${camera.x}px ${camera.y}px`,
        }}
      />

      {/* Connection lines (rendered below nodes in z-order) */}
      <ConnectionLines connections={connections} nodes={filteredNodes} camera={camera} />

      {/* Canvas with nodes */}
      <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})` }}>
        {filteredNodes.map(node => (
          <DraggableNode
            key={node.id}
            node={node}
            cameraScale={camera.z}
            groups={groups}
            tags={tags}
            onDelete={() => deleteNode(node.id)}
            onPositionChange={(x, y) => updateNodePosition(node.id, x, y)}
            onContentChange={(c) => updateNodeContent(node.id, c)}
            onSizeChange={(w, h) => updateNodeSize(node.id, w, h)}
            onToggleLock={() => toggleNodeLock(node.id)}
            onSetBackground={(color) => setNodeBackground(node.id, color)}
            onAddTag={(tagId) => addNodeTag(node.id, tagId)}
            onRemoveTag={(tagId) => removeNodeTag(node.id, tagId)}
            onSetGroup={(groupId) => setNodeGroup(node.id, groupId)}
            onRemoveGroup={() => removeNodeGroup(node.id)}
            onAddReaction={(emoji) => addNodeReaction(node.id, emoji)}
            onAddComment={(text) => addNodeComment(node.id, text)}
            onSetLabel={(label) => setNodeLabel(node.id, label)}
            onRemoveCampaignLink={() => removeCampaignLink(node.id)}
            connectFromId={connectFromId}
            onConnectTo={addConnection}
          />
        ))}

        {comments.map((comment) => (
          <div
            key={comment.id}
            className="absolute rounded bg-yellow-200 text-black shadow-md border border-yellow-400 p-2 text-sm w-48 font-sans cursor-text group"
            style={{ left: comment.x, top: comment.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button onClick={() => _deleteYComment(comment.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
            <div className="text-[10px] uppercase font-bold text-black/40 mb-1">{comment.author}</div>
            <textarea className="w-full bg-transparent border-none outline-none resize-none" value={comment.text} onChange={(e) => _updateYComment({ id: comment.id, text: e.target.value })} placeholder="Write comment..." rows={2} />
          </div>
        ))}

        {collab.remoteCursors.map((cursor) => (
          <CursorOverlay key={cursor.userId} state={{ cursor: { x: cursor.x, y: cursor.y }, user: { name: cursor.name, color: cursor.color } }} />
        ))}
      </div>

      {/* ─── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-3 py-2 rounded-full shadow-lg border border-black/10 z-50 flex items-center gap-1.5">
        <div className="px-2 py-1 flex flex-col justify-center text-[10px] rounded uppercase font-bold tracking-wider leading-tight mr-1 text-black/50">
          <span>{workspaceMode}</span>
          <span className="text-[8px] opacity-70">Context</span>
        </div>
        <div className="w-px h-6 bg-black/10" />

        <button onClick={undo} disabled={!collab.canUndo} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors disabled:opacity-30" title="Undo">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={redo} disabled={!collab.canRedo} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors disabled:opacity-30" title="Redo">
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-5 bg-black/10" />

        <button onClick={() => setMode('select')} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", mode === 'select' ? "bg-black text-white" : "text-black/60 hover:bg-slate-100")} title="Select">
          <MousePointer2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setMode('pan')} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", mode === 'pan' ? "bg-black text-white" : "text-black/60 hover:bg-slate-100")} title="Pan">
          <GripHorizontal className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setMode('comment')} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", mode === 'comment' ? "bg-black text-white" : "text-black/60 hover:bg-slate-100")} title="Comment">
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { setMode('connect'); setConnectFromId(null); }} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", mode === 'connect' ? "bg-black text-white" : "text-black/60 hover:bg-slate-100")} title="Connect">
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-5 bg-black/10" />

        <button onClick={addText} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Add Text">
          <Type className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Upload Media">
          <Upload className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleAddLink} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Add Link">
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-5 bg-black/10" />

        <button onClick={() => setSidebarOpen(!sidebarOpen)} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", sidebarOpen ? "bg-blue-500 text-white" : "text-black/60 hover:bg-slate-100")} title="Organize">
          <Group className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setSnapEnabled(!snapEnabled)} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", snapEnabled ? "bg-emerald-500 text-white" : "text-black/60 hover:bg-slate-100")} title="Snap to Grid">
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { setVoteMode(true); setCurrentVoteIndex(0); }} className="px-2 h-7 rounded flex items-center justify-center bg-rose-50 text-rose-500 font-bold text-xs hover:bg-rose-100 transition-colors gap-1" title="Moodboard Mill (Voting)">
          <Heart className="w-3 h-3" /> Mill
        </button>
        <div className="w-px h-5 bg-black/10" />

        <button onClick={() => setShowExportMenu(!showExportMenu)} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Export">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { if (presentableNodes.length > 0) setPresentMode(true); setPresentIndex(0); }} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Present" disabled={presentableNodes.length === 0}>
          <Presentation className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => openWindow('moodboard', 'New Moodboard', { projectId: crypto.randomUUID() })}
          className="w-7 h-7 rounded flex items-center justify-center text-black hover:bg-blue-100 transition-colors" title="New Board"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
      </div>

      {/* Export menu dropdown */}
      {showExportMenu && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-lg border border-black/10 py-1 z-50 w-48" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={exportJSON} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex items-center gap-2">
            <Download className="w-3 h-3" /> Export as JSON
          </button>
          <button onClick={exportPNG} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex items-center gap-2">
            <ImageIcon className="w-3 h-3" /> Export as PNG
          </button>
          <button onClick={exportPrint} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex items-center gap-2">
            <Presentation className="w-3 h-3" /> Print View
          </button>
        </div>
      )}

      {/* Connect mode indicator */}
      {mode === 'connect' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow z-50">
          {connectFromId ? 'Click a node to connect' : 'Click a node to start connection'}
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <MoodboardSidebar
          groups={groups}
          tags={tags}
          connections={connections}
          nodes={nodes}
          onCreateGroup={createGroup}
          onDeleteGroup={deleteGroup}
          onCreateTag={createTag}
          onDeleteTag={deleteTag}
          onDeleteConnection={deleteConnection}
          onFilterTag={(tagId) => setActiveFilter(prev => ({ ...prev, tagId }))}
          onFilterGroup={(groupId) => setActiveFilter(prev => ({ ...prev, groupId }))}
          activeFilter={activeFilter}
          onAutoArrange={autoArrange}
        />
      )}

      {/* Zoom controls (bottom-right, above mini-map) */}
      <div className="absolute bottom-[110px] right-4 z-40 bg-white/90 rounded-lg shadow-lg border border-black/10 flex flex-col items-center gap-0.5 p-1">
        <button onClick={zoomIn} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Zoom In">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="text-[10px] font-bold text-black/40 text-center">{Math.round(camera.z * 100)}%</div>
        <button onClick={zoomOut} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Zoom Out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-full h-px bg-black/5 my-0.5" />
        <button onClick={fitToContent} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Fit to Content">
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mini Map */}
      <MiniMap
        nodes={nodes}
        camera={camera}
        containerSize={{ w: osWindow.width, h: osWindow.height }}
        onNavigate={(x, y) => setCamera(prev => ({ ...prev, x, y }))}
      />

      {/* ─── Moodboard Mill Voting Overlay ───────────────────────────────── */}
      {voteMode && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8">
          <button onClick={() => setVoteMode(false)} className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2 mb-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" /> Moodboard Mill
            </h2>
            <p className="text-white/50 text-sm max-w-md">Client Voting Mode: Approve or reject items to generate a precise taste profile.</p>
          </div>
          {nodes.filter(n => n.type === 'image' || n.type === 'embed').length > 0 ? (
            currentVoteIndex < nodes.filter(n => n.type === 'image' || n.type === 'embed').length ? (
              <div className="relative w-full max-w-sm aspect-[3/4] bg-[#111] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col items-center justify-center group">
                <div className="absolute inset-0 p-4 flex items-center justify-center bg-black/50 pointer-events-none">
                  {(() => {
                    const voteNodes = nodes.filter(n => n.type === 'image' || n.type === 'embed');
                    const node = voteNodes[currentVoteIndex];
                    if (node.type === 'image') return <BlobMedia content={node.content} type="image" className="max-w-full max-h-full object-contain rounded" />;
                    return <div className="text-white/50 bg-black/50 p-4 rounded text-center">Video/Embed Item<br/><span className="text-xs break-all">{node.content}</span></div>;
                  })()}
                </div>
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-6">
                  <button onClick={() => setCurrentVoteIndex(c => c + 1)} className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-rose-500 hover:border-rose-500 transition-all shadow-xl">
                    <XIcon className="w-8 h-8" />
                  </button>
                  <button onClick={() => {
                    const voteNodes = nodes.filter(n => n.type === 'image' || n.type === 'embed');
                    if (voteNodes[currentVoteIndex]) addNodeReaction(voteNodes[currentVoteIndex].id, '❤️');
                    setCurrentVoteIndex(c => c + 1);
                  }} className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-all shadow-xl">
                    <Heart className="w-8 h-8 fill-current" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center bg-white/5 border border-white/10 p-8 rounded-2xl max-w-md w-full">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Voting Complete</h3>
                <p className="text-white/60 text-sm mb-6">Taste profile generated. Approved items have ❤️ reactions.</p>
                <button onClick={() => setVoteMode(false)} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg transition-colors">Return to Canvas</button>
              </div>
            )
          ) : (
            <div className="text-center text-white/50 bg-white/5 border border-white/10 p-8 rounded-2xl">Add images or media to start voting.</div>
          )}
        </div>
      )}

      {/* ─── Campaign Link Modal ──────────────────────────────────────────── */}
      {showCampaignLink && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center" onClick={() => setShowCampaignLink(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-500" /> Link to Campaign Lab
            </h3>
            <p className="text-xs text-black/50 mb-4">Enter a Campaign Lab page ID to link this item.</p>
            <input
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 mb-3"
              placeholder="Page ID or name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  linkToCampaign(showCampaignLink, e.currentTarget.value.trim());
                }
              }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowCampaignLink(null)} className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => {
                const input = document.querySelector('input[placeholder="Page ID or name..."]') as HTMLInputElement;
                if (input?.value.trim()) linkToCampaign(showCampaignLink, input.value.trim());
              }} className="px-3 py-1.5 text-xs bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors">Link</button>
            </div>
            <div className="mt-3 text-[10px] text-black/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Opens in Campaign Lab when clicked
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
