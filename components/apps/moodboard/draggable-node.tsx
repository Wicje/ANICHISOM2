'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, useDragControls } from 'motion/react';
import {
  GripHorizontal, Trash2, Lock, Unlock, MessageSquare, Tag, Group, Minus,
  ExternalLink, Send, X as XIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoardNode, BoardGroup, BoardTag } from './types';
import { REACTION_EMOJIS, NODE_COLORS } from './types';
import { getEmbedDetails } from './helpers';
import { BlobMedia } from './blob-media';
import { isTauri } from '@/lib/platform';

export function DraggableNode({
  node, cameraScale, groups, tags, onDelete, onPositionChange, onContentChange,
  onSizeChange, onToggleLock, onSetBackground, onAddTag, onRemoveTag,
  onSetGroup, onRemoveGroup, onAddReaction, onAddComment, onSetLabel,
  onRemoveCampaignLink, onSetCampaignLink, connectFromId, onConnectTo,
}: {
  node: BoardNode; cameraScale: number; groups: BoardGroup[]; tags: BoardTag[];
  onDelete: () => void; onPositionChange: (x: number, y: number) => void;
  onContentChange: (c: string) => void; onSizeChange: (w: number, h: number) => void;
  onToggleLock: () => void; onSetBackground: (color: string) => void;
  onAddTag: (tagId: string) => void; onRemoveTag: (tagId: string) => void;
  onSetGroup: (groupId: string) => void; onRemoveGroup: () => void;
  onAddReaction: (emoji: string) => void; onAddComment: (text: string) => void;
  onSetLabel: (label: string) => void; onRemoveCampaignLink: () => void;
  onSetCampaignLink: () => void;
  connectFromId: string | null; onConnectTo: (fromId: string, toId: string) => void;
}) {
  const dragControls = useDragControls();
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState('');
  const [commentText, setCommentText] = useState('');
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
          {isTauri() ? (
            React.createElement('webview', {
              src: getEmbedDetails(node.content).url,
              className: 'w-full h-full border-none rounded pointer-events-auto',
              onPointerDown: (e: React.PointerEvent) => e.stopPropagation()
            })
          ) : (
            <iframe
              src={getEmbedDetails(node.content).url}
              className="w-full h-full border-none rounded pointer-events-auto"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              onPointerDown={(e) => e.stopPropagation()}
            />
          )}
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
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && commentText.trim()) {
                  onAddComment(commentText.trim());
                  setCommentText('');
                }
              }}
            />
            <button
              onClick={() => {
                if (commentText.trim()) {
                  onAddComment(commentText.trim());
                  setCommentText('');
                }
              }}
              className="w-6 h-6 rounded flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600"
            >
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
          {node.campaignLinkId ? (
            <button onClick={() => { onRemoveCampaignLink(); setShowContextMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 flex items-center gap-2">
              <ExternalLink className="w-3 h-3" /> Unlink Campaign
            </button>
          ) : (
            <button onClick={() => { onSetCampaignLink(); setShowContextMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 flex items-center gap-2">
              <ExternalLink className="w-3 h-3" /> Link to Campaign
            </button>
          )}
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
