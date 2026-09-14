'use client';

import { useState } from 'react';
import { Trash2, Plus, Filter, ArrowRight, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoardGroup, BoardTag, Connection, BoardNode } from './types';
import { GROUP_COLORS, TAG_COLORS } from './types';

export function MoodboardSidebar({
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
              if (name) onCreateGroup(name, GROUP_COLORS[groups.length % GROUP_COLORS.length]!);
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
              if (name) onCreateTag(name, TAG_COLORS[tags.length % TAG_COLORS.length]!);
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
