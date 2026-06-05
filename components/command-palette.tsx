'use client';

import React, { useState, useEffect } from 'react';
import { useOS } from '@/lib/os-context';
import { Terminal, Folder, Globe, Sparkles, Image as ImageIcon, Search, Archive } from 'lucide-react';

export function CommandPalette() {
  const { openWindow } = useOS();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    const handleCustomEvent = () => setIsOpen(true);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('os:open-spotlight', handleCustomEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('os:open-spotlight', handleCustomEvent);
    };
  }, []);

  if (!isOpen) return null;

  const commands = [
    { id: 'terminal', name: 'Open Terminal', icon: Terminal, action: () => openWindow('terminal') },
    { id: 'files', name: 'Open File Manager', icon: Folder, action: () => openWindow('files') },
    { id: 'browser', name: 'Open Research Browser', icon: Globe, action: () => openWindow('browser') },
    { id: 'search', name: `Search Google for "${query}"`, icon: Search, action: () => openWindow('browser', 'Google Search', { url: `https://www.google.com/search?q=${encodeURIComponent(query)}&igu=1`}), hideOnEmpty: true },
    { id: 'campaign', name: 'Open Campaign Lab', icon: Sparkles, action: () => openWindow('campaign') },
    { id: 'moodboard', name: 'Open Moodboard', icon: ImageIcon, action: () => openWindow('moodboard') },
    { id: 'assets', name: 'Open Asset Pipeline', icon: Archive, action: () => openWindow('assets') },
  ];

  // We want to always show the Search Google option if query is not empty
  let filtered = commands.filter(c => {
    if (c.hideOnEmpty && !query) return false;
    if (c.id === 'search' && query) return true;
    return c.name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm"
      onPointerDown={() => setIsOpen(false)}
    >
      <div 
        className="w-[500px] max-w-[90vw] bg-[#111] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,240,255,0.1)] overflow-hidden"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/5">
          <Search className="w-5 h-5 text-white/50 mr-3" />
          <input 
            type="text" 
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-lg text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length > 0) {
                filtered[0].action();
                setIsOpen(false);
                setQuery('');
              }
            }}
          />
          <div className="text-[10px] uppercase font-mono text-white/30 border border-white/10 px-1.5 py-0.5 rounded">Esc</div>
        </div>
        
        <div className="p-2 max-h-[300px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-white/40 font-mono text-sm">No commands found.</div>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors text-left ${i === 0 ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <Icon className="w-5 h-5 mr-4 text-neon-blue" />
                  <span className="text-white text-sm font-medium">{cmd.name}</span>
                  {i === 0 && <span className="ml-auto text-[10px] text-white/40 font-mono">↵ Return</span>}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
