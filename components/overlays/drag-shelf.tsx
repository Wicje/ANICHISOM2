'use client';

import React, { useState, useEffect } from 'react';
import { Layers, X, Copy, Trash2, Check, FileText, Link, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';

interface ShelfItem {
  id: string;
  type: 'text' | 'link' | 'file';
  content: string;
  timestamp: number;
}

export function DragShelf() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ShelfItem[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        audioSystem.playClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const addItem = () => {
    if (!inputVal.trim()) return;
    const newItem: ShelfItem = {
      id: 'shelf-' + Date.now(),
      type: inputVal.startsWith('http') ? 'link' : 'text',
      content: inputVal.trim(),
      timestamp: Date.now(),
    };
    setItems(prev => [newItem, ...prev]);
    setInputVal('');
    audioSystem.playClick();
  };

  const copyItem = (item: ShelfItem) => {
    navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    audioSystem.playClick();
    setTimeout(() => setCopiedId(null), 1500);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    audioSystem.playClick();
  };

  return (
    <div className="fixed right-4 top-16 z-[9400] w-80 select-none animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-slate-950/90 border border-white/20 shadow-2xl rounded-2xl p-4 backdrop-blur-3xl text-white flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#10F4A0]" />
            <span className="text-xs font-bold tracking-wide">Universal Drag Shelf</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Park snippet or URL... (Cmd+Shift+D)"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
            className="flex-1 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/30 outline-none focus:border-[#10F4A0]"
          />
          <button onClick={addItem} className="px-3 py-1 rounded-lg bg-[#10F4A0]/20 text-[#10F4A0] font-bold text-xs border border-[#10F4A0]/40 hover:bg-[#10F4A0]/30">
            Park
          </button>
        </div>

        {/* Item List */}
        <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
          {items.length === 0 ? (
            <div className="text-[11px] text-white/30 text-center py-6">
              Shelf empty. Press Cmd+Shift+D to toggle anytime.
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {item.type === 'link' ? <Link className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-[#10F4A0] shrink-0" />}
                  <span className="truncate text-white/80 font-mono text-[11px]">{item.content}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => copyItem(item)} className="p-1 text-white/40 hover:text-white" title="Copy">
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-[#10F4A0]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => removeItem(item.id)} className="p-1 text-white/40 hover:text-rose-400" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
