'use client';

import React, { useState, useEffect, useTransition, useMemo, useRef, useCallback } from 'react';
import { useOS } from '@/lib/os-context';
import { Terminal, Folder, Globe, Sparkles, Image as ImageIcon, Search, Archive, Clipboard, AppWindow, File, Music, Layout, Sun, Moon, Maximize2, Minimize2, Trash2, Settings, Volume2, VolumeX, Eye, Camera } from 'lucide-react';
import { APP_MANIFEST as APPS } from '@/lib/app-manifest';
import { AppIconInline } from '@/components/ui/app-icon';
import { FS, LocalFile } from '@/lib/fs';
import { useFileStore } from '@/lib/stores/file.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWindowStore } from '@/lib/stores/window.store';
import { useNotificationStore } from '@/lib/stores/notification.store';
import { useFocusStore } from '@/lib/stores/focus.store';
import { useScreenshotStore } from '@/lib/stores/screenshot.store';
import { useClipboardUIStore } from '@/lib/stores/clipboard.store';
import { useMemoryStore } from '@/lib/stores/memory.store';
import { useAIStore } from '@/lib/stores/ai.store';
import { cn } from '@/lib/utils';

export function CommandPalette() {
  const { openWindow, windows, focusWindow, installedApps, currentUser } = useOS();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [clipboardText, setClipboardText] = useState('');
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        setSelectedIndex(0);
        setQuery('');
        navigator.clipboard.readText().then(text => {
           if (text && text.length < 100) setClipboardText(text);
        }).catch(() => {});
         
        FS.readDir('').then(files => {
           setLocalFiles(files);
        }).catch(() => {});
        setAiResponse(null);
     }
  }, [isOpen]);

  const allowedApps = useMemo(() => {
    const roleFiltered = APPS.filter((entry) => 
      entry.roles.includes(currentUser?.role || 'user')
    );
    const installedIds = new Set(installedApps);
    const installedOnly = APPS.filter((entry) => 
      installedIds.has(entry.id) && !roleFiltered.some(r => r.id === entry.id)
    );
    return [...roleFiltered, ...installedOnly];
  }, [currentUser?.role, installedApps]);

  const commands: { id: string; name: string; type: string; icon: any; iconImage?: string; action: () => void; hideOnEmpty?: boolean }[] = useMemo(() => {
    const cmds: { id: string; name: string; type: string; icon: any; iconImage?: string; action: () => void; hideOnEmpty?: boolean }[] = [];

    const colorMode = useThemeStore.getState().colorMode;
    const muted = useThemeStore.getState().muted;

    // System commands
    cmds.push({
      id: 'toggle-dark',
      name: colorMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      type: 'System',
      icon: colorMode === 'dark' ? Sun : Moon,
      action: () => useThemeStore.getState().setColorMode(colorMode === 'dark' ? 'light' : 'dark'),
    });

    cmds.push({
      id: 'minimize-all',
      name: 'Minimize All Windows',
      type: 'System',
      icon: Minimize2,
      action: () => {
        const wins = useWindowStore.getState().windows;
        wins.forEach(w => useWindowStore.getState().minimizeWindow(w.id));
      },
    });

    cmds.push({
      id: 'close-all',
      name: 'Close All Windows',
      type: 'System',
      icon: Trash2,
      action: () => {
        const wins = useWindowStore.getState().windows;
        wins.forEach(w => useWindowStore.getState().closeWindow(w.id));
      },
    });

    cmds.push({
      id: 'toggle-audio',
      name: muted ? 'Unmute System Audio' : 'Mute System Audio',
      type: 'System',
      icon: muted ? Volume2 : VolumeX,
      action: () => useThemeStore.getState().setMuted(!muted),
    });

    cmds.push({
      id: 'open-settings',
      name: 'Open Settings',
      type: 'System',
      icon: Settings,
      action: () => openWindow('settings'),
    });

    cmds.push({
      id: 'toggle-notifications',
      name: 'Toggle Notification Center',
      type: 'System',
      icon: Bell,
      action: () => window.dispatchEvent(new CustomEvent('os:toggle-notification-center')),
    });

    cmds.push({
      id: 'clear-notifications',
      name: 'Clear All Notifications',
      type: 'System',
      icon: Trash2,
      action: () => useNotificationStore.getState().clearAll(),
    });

    cmds.push({
      id: 'toggle-focus',
      name: useFocusStore.getState().enabled ? 'Exit Focus Mode' : 'Enter Focus Mode',
      type: 'System',
      icon: Eye,
      action: () => useFocusStore.getState().toggle(),
    });

    cmds.push({
      id: 'screenshot',
      name: 'Take Screenshot',
      type: 'System',
      icon: Camera,
      action: () => useScreenshotStore.getState().start(),
    });

    cmds.push({
      id: 'clipboard-history',
      name: 'Open Clipboard History',
      type: 'System',
      icon: Clipboard,
      action: () => useClipboardUIStore.getState().toggle(),
    });

    // Applications
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

    // Open Windows
    windows.forEach(win => {
       cmds.push({
          id: `win-${win.id}`,
          name: `Switch to ${win.title}`,
          type: 'Open Window',
          icon: AppWindow,
          action: () => focusWindow(win.id)
       });
    });

    // Local Files
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

    if (query.trim()) {
      cmds.push({ 
        id: 'search', 
        name: `Search Google for "${query}"`, 
        type: 'Web Search',
        icon: Search, 
        action: () => {
          useMemoryStore.getState().logEvent('search', `Web search: ${query}`);
          openWindow('browser', 'Google Search', { url: `https://www.google.com/search?q=${encodeURIComponent(query)}&igu=1`});
        }, 
        hideOnEmpty: true 
      });

      // Local AI Query Command
      if (useAIStore.getState().ready) {
        cmds.push({
          id: 'ai-ask',
          name: `Ask Edge AI: "${query}"`,
          type: 'AI Assistant',
          icon: Sparkles,
          action: () => {
            useMemoryStore.getState().logEvent('search', `AI Query: ${query}`);
            setIsAiLoading(true);
            setAiResponse('Thinking...');
            // Stop closing palette
            useAIStore.getState().query(query).then(res => {
              setAiResponse(res);
              setIsAiLoading(false);
            });
          },
          hideOnEmpty: true
        });
      }
    }

    return cmds;
  }, [allowedApps, windows, localFiles, clipboardText, query, openWindow, focusWindow]);

  const filtered = useMemo(() => commands.filter(c => {
    if (c.hideOnEmpty && !query) return false;
    if (c.id === 'search' || c.id === 'ai-ask') return true;
    return c.name.toLowerCase().includes(query.toLowerCase());
  }), [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      const cmd = filtered[selectedIndex];
      cmd?.action();
      if (cmd?.id !== 'ai-ask') {
        setIsOpen(false);
        setQuery('');
      }
    }
  }, [filtered, selectedIndex]);

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
            ref={inputRef}
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
            onKeyDown={handleKeyDown}
          />
          <div className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--os-text-muted)', border: '1px solid var(--os-border)' }}>Esc</div>
        </div>
        
        <div ref={listRef} className="p-2 max-h-[300px] overflow-y-auto">
          {aiResponse ? (
            <div className="p-4 bg-black/10 m-2 rounded-xl text-sm" style={{ color: 'var(--os-text)' }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--os-primary)' }}>
                <Sparkles className={cn("w-4 h-4", isAiLoading && "animate-spin")} />
                <span className="font-bold">Edge AI</span>
              </div>
              <div className="whitespace-pre-wrap">{aiResponse}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center font-mono text-sm" style={{ color: 'var(--os-text-muted)' }}>No commands found.</div>
          ) : (
            filtered.map((cmd, i) => {
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    if (cmd.id !== 'ai-ask') {
                      setIsOpen(false);
                      setQuery('');
                    }
                  }}
                  className="w-full flex items-center px-4 py-3 rounded-xl transition-colors text-left group"
                  style={{
                    background: isSelected ? 'var(--os-hover)' : 'transparent',
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <AppIconInline icon={cmd.icon} iconImage={cmd.iconImage} size={20} className="mr-4 text-[var(--os-primary)]" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium" style={{ color: 'var(--os-text)' }}>{cmd.name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--os-text-muted)' }}>{cmd.type}</span>
                  </div>
                  {isSelected && <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--os-text-muted)' }}>↵ Return</span>}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Bell({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
}
