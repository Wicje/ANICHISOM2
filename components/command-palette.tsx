'use client';

import React, { useState, useEffect, useTransition, useMemo, useRef, useCallback } from 'react';
import { useOS } from '@/lib/os-context';
import { Terminal, Folder, Globe, Sparkles, Image as ImageIcon, Search, Archive, Clipboard, AppWindow, File, Music, Layout, Sun, Moon, Maximize2, Minimize2, Trash2, Settings, Volume2, VolumeX, Eye, Camera, Calculator, ArrowRight, Check, Copy } from 'lucide-react';
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
import { slashSkills } from '@/lib/skills/slash-skills';
import { WEB_APP_CATALOG } from '@/lib/web-app-catalog';
import { cn } from '@/lib/utils';

function evaluateMathExpression(query: string): { expression: string; result: string } | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return null;

  // Percentage expressions like "15% of 850" or "20% 500"
  const percentMatch = trimmed.match(/^([\d.]+)\s*%\s*(?:of)?\s*([\d.]+)$/i);
  if (percentMatch) {
    const p = parseFloat(percentMatch[1]!);
    const total = parseFloat(percentMatch[2]!);
    if (!isNaN(p) && !isNaN(total)) {
      const res = (p / 100) * total;
      return { expression: `${p}% of ${total}`, result: String(Number(res.toFixed(6))) };
    }
  }

  let sanitized = trimmed.toLowerCase()
    .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
    .replace(/sin\(([^)]+)\)/g, 'Math.sin(($1) * Math.PI / 180)')
    .replace(/cos\(([^)]+)\)/g, 'Math.cos(($1) * Math.PI / 180)')
    .replace(/tan\(([^)]+)\)/g, 'Math.tan(($1) * Math.PI / 180)')
    .replace(/log\(([^)]+)\)/g, 'Math.log10($1)')
    .replace(/ln\(([^)]+)\)/g, 'Math.log($1)')
    .replace(/abs\(([^)]+)\)/g, 'Math.abs($1)')
    .replace(/\^/g, '**')
    .replace(/pi\b/g, 'Math.PI')
    .replace(/e\b/g, 'Math.E');

  if (!/^[0-9+\-*/().,% MathPIEsqrtancosltgb*]+$/.test(sanitized)) {
    return null;
  }
  if (!/[+\-*/^%*]|Math\./.test(sanitized)) {
    return null;
  }

  try {
    const fn = new Function(`return (${sanitized});`);
    const val = fn();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return {
        expression: trimmed,
        result: String(Number(val.toFixed(8)).toString()),
      };
    }
  } catch {
    return null;
  }
  return null;
}

function evaluateUnitConversion(query: string): { from: string; to: string; result: string } | null {
  const trimmed = query.trim().toLowerCase();
  const match = trimmed.match(/^([\d.]+)\s*([a-zA-Z$€£¥]+)\s*(?:in|to|=)\s*([a-zA-Z$€£¥]+)$/i);
  if (!match) return null;

  const val = parseFloat(match[1]!);
  const from = match[2]!.toLowerCase();
  const to = match[3]!.toLowerCase();
  if (isNaN(val)) return null;

  // Temperature
  if ((from === 'f' || from === 'fahrenheit') && (to === 'c' || to === 'celsius')) {
    const c = ((val - 32) * 5) / 9;
    return { from: `${val}°F`, to: 'Celsius', result: `${c.toFixed(2)}°C` };
  }
  if ((from === 'c' || from === 'celsius') && (to === 'f' || to === 'fahrenheit')) {
    const f = (val * 9) / 5 + 32;
    return { from: `${val}°C`, to: 'Fahrenheit', result: `${f.toFixed(2)}°F` };
  }

  // Length
  const lengthToMeters: Record<string, number> = {
    m: 1, meter: 1, meters: 1,
    km: 1000, kilometer: 1000, kilometers: 1000,
    cm: 0.01, centimeter: 0.01,
    mm: 0.001, millimeter: 0.001,
    mi: 1609.344, mile: 1609.344, miles: 1609.344,
    yd: 0.9144, yard: 0.9144, yards: 0.9144,
    ft: 0.3048, foot: 0.3048, feet: 0.3048,
    in: 0.0254, inch: 0.0254, inches: 0.0254,
  };
  if (lengthToMeters[from] && lengthToMeters[to]) {
    const inMeters = val * lengthToMeters[from]!;
    const converted = inMeters / lengthToMeters[to]!;
    return { from: `${val} ${from}`, to, result: `${Number(converted.toFixed(4))} ${to}` };
  }

  // Mass / Weight
  const massToGrams: Record<string, number> = {
    g: 1, gram: 1, grams: 1,
    kg: 1000, kilogram: 1000, kilograms: 1000,
    mg: 0.001, milligram: 0.001,
    lb: 453.59237, lbs: 453.59237, pound: 453.59237, pounds: 453.59237,
    oz: 28.349523, ounce: 28.349523, ounces: 28.349523,
  };
  if (massToGrams[from] && massToGrams[to]) {
    const inGrams = val * massToGrams[from]!;
    const converted = inGrams / massToGrams[to]!;
    return { from: `${val} ${from}`, to, result: `${Number(converted.toFixed(4))} ${to}` };
  }

  // Digital Storage
  const storageToBytes: Record<string, number> = {
    b: 1, byte: 1, bytes: 1,
    kb: 1024, kilobyte: 1024,
    mb: 1024 * 1024, megabyte: 1024 * 1024,
    gb: 1024 * 1024 * 1024, gigabyte: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024, terabyte: 1024 * 1024 * 1024 * 1024,
  };
  if (storageToBytes[from] && storageToBytes[to]) {
    const inBytes = val * storageToBytes[from]!;
    const converted = inBytes / storageToBytes[to]!;
    return { from: `${val} ${from.toUpperCase()}`, to: to.toUpperCase(), result: `${Number(converted.toFixed(4))} ${to.toUpperCase()}` };
  }

  // Currency conversion approximation
  const ratesToUSD: Record<string, number> = {
    usd: 1, '$': 1,
    eur: 1.08, '€': 1.08,
    gbp: 1.28, '£': 1.28,
    jpy: 0.0068, '¥': 0.0068,
    cad: 0.74, aud: 0.65, chf: 1.13, cny: 0.14,
  };
  if (ratesToUSD[from] && ratesToUSD[to]) {
    const inUSD = val * ratesToUSD[from]!;
    const converted = inUSD / ratesToUSD[to]!;
    return { from: `${val} ${from.toUpperCase()}`, to: to.toUpperCase(), result: `${converted.toFixed(2)} ${to.toUpperCase()}` };
  }

  return null;
}

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

    // Athena Slash Skills Substrate
    slashSkills.list().forEach((skill) => {
      cmds.push({
        id: `skill-${skill.name}`,
        name: `/${skill.name} — ${skill.description}`,
        type: 'Skill',
        icon: Sparkles,
        action: async () => {
          setIsAiLoading(true);
          setAiResponse(null);
          try {
            const out = await slashSkills.execute(`/${skill.name}`);
            setAiResponse(out);
          } catch (e: any) {
            setAiResponse(`Skill execution error: ${e.message}`);
          } finally {
            setIsAiLoading(false);
          }
        },
      });
    });

     // Native Applications
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

     // Third-Party Web Apps (35 Curated Apps)
     WEB_APP_CATALOG.forEach((webApp) => {
        cmds.push({
           id: `webapp-${webApp.id}`,
           name: `Open ${webApp.name}`,
           type: 'Web App',
           icon: webApp.icon,
           iconImage: webApp.iconImage,
           action: () => openWindow('web-app', webApp.name, { url: webApp.url, appId: webApp.id, title: webApp.name, iconImage: webApp.iconImage })
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
      if (query.trim().startsWith('/')) {
        cmds.unshift({
          id: 'slash-exec',
          name: `Execute Slash Skill: "${query.trim()}"`,
          type: 'Slash Skill',
          icon: Sparkles,
          action: async () => {
            setIsAiLoading(true);
            setAiResponse('Executing slash skill...');
            try {
              const out = await slashSkills.execute(query.trim());
              setAiResponse(out);
            } catch (err: any) {
              setAiResponse(`Execution error: ${err.message || err}`);
            } finally {
              setIsAiLoading(false);
            }
          },
          hideOnEmpty: true,
        });
      }

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

    // Live Math / Calculator Evaluation (macOS Spotlight Parity)
    const mathResult = evaluateMathExpression(query);
    if (mathResult) {
      cmds.unshift({
        id: 'math-calc',
        name: `${mathResult.expression} = ${mathResult.result}`,
        type: 'Calculation',
        icon: Calculator,
        action: async () => {
          try {
            await navigator.clipboard.writeText(mathResult.result);
            window.dispatchEvent(new CustomEvent('os:notify', {
              detail: { title: 'Result Copied', description: `Copied "${mathResult.result}" to clipboard`, type: 'success' }
            }));
          } catch {}
        },
        hideOnEmpty: true,
      });
    }

    // Live Unit & Currency Conversion (macOS Spotlight Parity)
    const unitResult = evaluateUnitConversion(query);
    if (unitResult) {
      cmds.unshift({
        id: 'unit-conv',
        name: `${unitResult.from} = ${unitResult.result}`,
        type: 'Conversion',
        icon: Calculator,
        action: async () => {
          try {
            await navigator.clipboard.writeText(unitResult.result);
            window.dispatchEvent(new CustomEvent('os:notify', {
              detail: { title: 'Conversion Copied', description: `Copied "${unitResult.result}" to clipboard`, type: 'success' }
            }));
          } catch {}
        },
        hideOnEmpty: true,
      });
    }

    return cmds;
  }, [allowedApps, windows, localFiles, clipboardText, query, openWindow, focusWindow]);

  const filtered = useMemo(() => commands.filter(c => {
    if (c.hideOnEmpty && !query) return false;
    if (c.id === 'search' || c.id === 'ai-ask' || c.id === 'slash-exec' || c.id === 'math-calc' || c.id === 'unit-conv') return true;
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
      if (cmd?.id !== 'ai-ask' && cmd?.id !== 'slash-exec') {
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
