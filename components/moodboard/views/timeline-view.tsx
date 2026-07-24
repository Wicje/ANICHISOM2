'use client';

import React, { useState, useMemo } from 'react';
import { Clock, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoardNode, BoardGroup, BoardTag, Connection, Comment } from '@/components/apps/moodboard/types';
import { NODE_COLORS } from '@/components/apps/moodboard/types';
import type { OSWindow } from '@/lib/os-context';

interface TimelineViewProps {
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

function getDateLabel(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MoodboardTimelineView(props: TimelineViewProps) {
  const { nodes, deleteNode, updateNodeContent } = props;
  const [hoveredEntry, setHoveredEntry] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'text' | 'image'>('all');

  const sortedNodes = useMemo(() => {
    let filtered = [...nodes];
    if (filter === 'text') filtered = filtered.filter(n => n.type === 'text');
    if (filter === 'image') filtered = filtered.filter(n => n.type === 'image' || n.type === 'video');
    return filtered.sort((a, b) => (b as any).createdAt - (a as any).createdAt || 0);
  }, [nodes, filter]);

  const groupedByDate = useMemo(() => {
    const groups: { label: string; items: BoardNode[] }[] = [];
    let lastLabel = '';

    for (const node of sortedNodes) {
      const ts = (node as any).createdAt || Date.now();
      const label = getDateLabel(ts);
      if (label !== lastLabel) {
        groups.push({ label, items: [node] });
        lastLabel = label;
      } else {
        groups[groups.length - 1]!.items.push(node);
      }
    }
    return groups;
  }, [sortedNodes]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-black/5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-800">Timeline</h2>
          <span className="text-[10px] text-gray-400">{nodes.length} items</span>
        </div>
        <div className="flex items-center bg-gray-200/60 rounded-lg p-0.5">
          {(['all', 'text', 'image'] as const).map(tab => (
            <button key={tab} onClick={() => setFilter(tab)}
              className={cn("px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors capitalize",
                filter === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-300" />

          {groupedByDate.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No items yet. Add content to your moodboard.</div>
          ) : (
            groupedByDate.map((group, gi) => (
              <div key={gi} className="mb-6">
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3 -ml-6 pl-6">
                  <div className="w-[15px] h-[15px] rounded-full border-2 border-gray-400 bg-white flex items-center justify-center z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{group.label}</span>
                </div>

                {/* Items */}
                {group.items.map(node => (
                  <div
                    key={node.id}
                    className={cn(
                      "relative flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg transition-colors group",
                      hoveredEntry === node.id ? "bg-gray-100" : ""
                    )}
                    onMouseEnter={() => setHoveredEntry(node.id)}
                    onMouseLeave={() => setHoveredEntry(null)}
                  >
                    <div className="w-[15px] h-[15px] rounded-full border-2 border-gray-300 bg-white flex items-center justify-center z-10 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">
                          {node.type}
                        </span>
                        <span className={cn("text-sm truncate", node.backgroundColor ? "font-medium text-gray-900" : "text-gray-600")}>
                          {node.content?.substring(0, 60) || 'Untitled'}
                        </span>
                      </div>
                      {node.label && <div className="text-[10px] text-gray-400 mt-0.5">{node.label}</div>}
                    </div>

                    {node.backgroundColor && (
                      <div className="w-6 h-6 rounded border border-gray-200 shrink-0" style={{ background: node.backgroundColor }} />
                    )}

                    {hoveredEntry === node.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => deleteNode(node.id)} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
