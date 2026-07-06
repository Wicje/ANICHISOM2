'use client';

import React, { useState, useEffect } from 'react';
import { useOS } from '@/lib/os-context';
import { Terminal, Folder, Globe, Sparkles, Image as ImageIcon, Search, Archive, Clipboard, AppWindow, File } from 'lucide-react';
import { APPS } from '@/components/desktop';
import { FS } from '@/lib/fs';

export function CommandPalette() {
  const { openWindow, windows, focusWindow, installedApps, currentUser } = useOS();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [clipboardText, setClipboardText] = useState('');
  const [localFiles, setLocalFiles] = useState<{name: string, id: string}[]>([]);

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

  useEffect(() => {
     if (isOpen) {
        navigator.clipboard.readText().then(text => {
           if (text && text.length < 100) setClipboardText(text);
        }).catch(() => {});
        
        FS.readDir('').then(files => {
           setLocalFiles(files);
        }).catch(() => {});
     }
  }, [isOpen]);

  if (!isOpen) return null;

  // Dynamically pull all allowed apps from the system
  const allowedApps = Object.entries(APPS).filter(([appId, config]) => 
    config.roles.includes(currentUser?.role || 'user') && (config.isCore || installedApps.includes(appId))
  );

  const commands = [];

  // Add all apps to search
  allowedApps.forEach(([appId, config]) => {
     commands.push({
        id: `app-${appId}`,
        name: `Open ${config.title}`,
        type: 'Application',
        icon: config.icon,
        action: () => openWindow(appId)
     });
  });

  // Add currently open windows (to switch to them)
  windows.forEach(win => {
     commands.push({
        id: `win-${win.id}`,
        name: `Switch to ${win.title}`,
        type: 'Open Window',
        icon: AppWindow,
        action: () => focusWindow(win.id)
     });
  });

  // Add Local Files
  localFiles.forEach(file => {
     commands.push({
        id: `file-${file.id}`,
        name: file.name,
        type: 'Local File',
        icon: File,
        action: () => openWindow('code', `Editing: ${file.name}`, { filename: file.name })
     });
  });

  // Add Clipboard Search
  if (clipboardText) {
     commands.push({
        id: 'clipboard',
        name: `Search Clipboard: "${clipboardText}"`,
        type: 'Clipboard',
        icon: Clipboard,
        action: () => openWindow('browser', 'Google Search', { url: `https://www.google.com/search?q=${encodeURIComponent(clipboardText)}&igu=1`})
     });
  }

  // Add general Search fallback
  commands.push({ 
    id: 'search', 
    name: `Search Google for "${query}"`, 
    type: 'Web Search',
    icon: Search, 
    action: () => openWindow('browser', 'Google Search', { url: `https://www.google.com/search?q=${encodeURIComponent(query)}&igu=1`}), 
    hideOnEmpty: true 
  });

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
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors text-left group ${i === 0 ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <Icon className="w-5 h-5 mr-4 text-neon-blue" />
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">{cmd.name}</span>
                    <span className="text-white/40 text-[10px]">{cmd.type}</span>
                  </div>
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
