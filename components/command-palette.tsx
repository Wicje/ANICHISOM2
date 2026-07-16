'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useOS } from '@/lib/os-context';
import { Terminal, Folder, Globe, Sparkles, Image as ImageIcon, Search, Archive, Clipboard, AppWindow, File, Music, Layout } from 'lucide-react';
import { APP_MANIFEST as APPS } from '@/lib/app-manifest';
import { AppIconInline } from '@/components/ui/app-icon';
import { FS, LocalFile } from '@/lib/fs';
import { useFileStore } from '@/lib/stores/file.store';

export function CommandPalette() {
  const { openWindow, windows, focusWindow, installedApps, currentUser } = useOS();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [clipboardText, setClipboardText] = useState('');
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [isPending, startTransition] = useTransition();

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

  const allowedApps = useMemo(() => APPS.filter((entry) => 
    entry.roles.includes(currentUser?.role || 'user')
  ), [currentUser?.role]);

  const commands: { id: string; name: string; type: string; icon: any; iconImage?: string; action: () => void; hideOnEmpty?: boolean }[] = useMemo(() => {
    const cmds: { id: string; name: string; type: string; icon: any; iconImage?: string; action: () => void; hideOnEmpty?: boolean }[] = [];

    allowedApps.forEach((entry) => {
       cmds.push({
          id: `app-${entry.id}`,
          name: `Open ${entry.title}`,
          type: 'Application',
          icon: entry.icon,
          iconImage: entry.iconImage,
          action: () => openWindow(entry.id)
       });
    });

    windows.forEach(win => {
       cmds.push({
          id: `win-${win.id}`,
          name: `Switch to ${win.title}`,
          type: 'Open Window',
          icon: AppWindow,
          action: () => focusWindow(win.id)
       });
    });

    localFiles.forEach(file => {
       const appId = useFileStore.getState().resolveSmartRoute(file.mimeType || '', file.name) || 'code';
       cmds.push({
          id: `file-${file.id}`,
          name: file.name,
          type: 'Local File',
          icon: File,
          action: () => openWindow(appId, file.name, { fileId: file.id, content: file.content })
       });
    });

    cmds.push({
      id: 'notch-nook',
      name: 'Toggle Notch Nook',
      type: 'System',
      icon: Music,
      action: () => window.dispatchEvent(new Event('os:toggle-notch-nook')),
    });

    cmds.push({
      id: 'widget-stack',
      name: 'Toggle Widget Stack',
      type: 'System',
      icon: Layout,
      action: () => window.dispatchEvent(new Event('os:toggle-widget-stack')),
    });

    if (clipboardText) {
       cmds.push({
          id: 'clipboard',
          name: `Search Clipboard: "${clipboardText}"`,
          type: 'Clipboard',
          icon: Clipboard,
          action: () => openWindow('browser', 'Google Search', { url: `https://www.google.com/search?q=${encodeURIComponent(clipboardText)}&igu=1`})
       });
    }

    cmds.push({ 
      id: 'search', 
      name: `Search Google for "${query}"`, 
      type: 'Web Search',
      icon: Search, 
      action: () => openWindow('browser', 'Google Search', { url: `https://www.google.com/search?q=${encodeURIComponent(query)}&igu=1`}), 
      hideOnEmpty: true 
    });

    return cmds;
  }, [allowedApps, windows, localFiles, clipboardText, query, openWindow, focusWindow]);

  const filtered = useMemo(() => commands.filter(c => {
    if (c.hideOnEmpty && !query) return false;
    if (c.id === 'search' && query) return true;
    return c.name.toLowerCase().includes(query.toLowerCase());
  }), [commands, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.15)' }}
      onPointerDown={() => setIsOpen(false)}
    >
      <div 
        className="w-[500px] max-w-[90vw] glass-panel-active rounded-2xl overflow-hidden"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3" style={{ borderBottom: '1px solid var(--os-border)' }}>
          <Search className="w-5 h-5 mr-3" style={{ color: 'var(--os-text-muted)' }} />
          <input 
            type="text" 
            autoFocus
            value={query}
            onChange={e => {
              const val = e.target.value;
              startTransition(() => setQuery(val));
            }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-lg"
            style={{ color: 'var(--os-text)' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length > 0) {
                filtered[0]!.action();
                setIsOpen(false);
                setQuery('');
              }
            }}
          />
          <div className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--os-text-muted)', border: '1px solid var(--os-border)' }}>Esc</div>
        </div>
        
        <div className="p-2 max-h-[300px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center font-mono text-sm" style={{ color: 'var(--os-text-muted)' }}>No commands found.</div>
          ) : (
            filtered.map((cmd, i) => {
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center px-4 py-3 rounded-xl transition-colors text-left group"
                  style={{
                    background: i === 0 ? 'var(--os-hover)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (i !== 0) e.currentTarget.style.background = 'var(--os-hover)'; }}
                  onMouseLeave={(e) => { if (i !== 0) e.currentTarget.style.background = 'transparent'; }}
                >
                  <AppIconInline icon={cmd.icon} iconImage={cmd.iconImage} size={20} className="mr-4 text-[var(--os-primary)]" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium" style={{ color: 'var(--os-text)' }}>{cmd.name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--os-text-muted)' }}>{cmd.type}</span>
                  </div>
                  {i === 0 && <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--os-text-muted)' }}>↵ Return</span>}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
