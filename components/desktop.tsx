'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useOS, OSRole, OSUser, OSWindow } from '@/lib/os-context';
import { WindowFrame } from '@/components/window-frame';
import { CommandPalette } from '@/components/command-palette';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { PresenceIndicator } from '@/components/presence-indicator';
import { Terminal, Folder, Globe, Sparkles, Image as ImageIcon, Code2, Search, LayoutTemplate, Clock, Save, Cloud, RefreshCw, ShieldCheck, Power, Figma, Framer, HardDrive, Github, BookOpen, Zap, ZapOff, Briefcase, Brain, User, AlertCircle, Play, Plus, Users, Server, Archive, FileText, Video, Store, Shirt, Cpu, Camera, Code, Box, Settings, Pipette, Layers, Grid, Sliders, Cpu as CpuIcon, Lock, StickyNote, Activity, FilePlus, Bot, Film, Compass, X } from 'lucide-react';
import { ControlCenter } from '@/components/control-center';
import { FS, LocalFile } from '@/lib/fs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { LoginScreen } from '@/components/login-screen';

const TerminalBox = dynamic(() => import('@/components/apps/terminal').then(mod => mod.TerminalBox), { ssr: false });
const FileManager = dynamic(() => import('@/components/apps/file-manager').then(mod => mod.FileManager), { ssr: false });
const MiniBrowser = dynamic(() => import('@/components/apps/mini-browser').then(mod => mod.MiniBrowser), { ssr: false });
const CampaignLab = dynamic(() => import('@/components/apps/campaign-lab').then(mod => mod.CampaignLab), { ssr: false });
const Moodboard = dynamic(() => import('@/components/apps/moodboard').then(mod => mod.Moodboard), { ssr: false });
const CodeEditor = dynamic(() => import('@/components/apps/code-editor').then(mod => mod.CodeEditor), { ssr: false });
const ProductivitySuite = dynamic(() => import('@/components/apps/productivity-suite').then(mod => mod.ProductivitySuite), { ssr: false });
const AIGateway = dynamic(() => import('@/components/apps/ai-gateway').then(mod => mod.AIGateway), { ssr: false });
const AdminPanel = dynamic(() => import('@/components/apps/admin-panel').then(mod => mod.AdminPanel), { ssr: false });
const ZiklagTools = dynamic(() => import('@/components/apps/ziklag-tools').then(mod => mod.ZiklagTools), { ssr: false });
const ClothingBrandPack = dynamic(() => import('@/components/apps/clothing-brand-pack').then(mod => mod.ClothingBrandPack), { ssr: false });
const HardwarePack = dynamic(() => import('@/components/apps/hardware-pack').then(mod => mod.HardwarePack), { ssr: false });
const DeveloperPack = dynamic(() => import('@/components/apps/developer-pack').then(mod => mod.DeveloperPack), { ssr: false });
const PhotographyPack = dynamic(() => import('@/components/apps/photography-pack').then(mod => mod.PhotographyPack), { ssr: false });

const AssetPipeline = dynamic(() => import('@/components/apps/asset-pipeline').then(mod => mod.AssetPipeline), { ssr: false });
const PdfReader = dynamic(() => import('@/components/apps/pdf-reader').then(mod => mod.PdfReader), { ssr: false });
const HistoryApp = dynamic(() => import('@/components/apps/history').then(mod => mod.HistoryApp), { ssr: false });
const CallsApp = dynamic(() => import('@/components/apps/calls').then(mod => mod.CallsApp), { ssr: false });
const Marketplace = dynamic(() => import('@/components/apps/marketplace').then(mod => mod.Marketplace), { ssr: false });
const SideGigsApp = dynamic(() => import('@/components/apps/side-gigs').then(mod => mod.SideGigsApp), { ssr: false });
const ProposalGenerator = dynamic(() => import('@/components/apps/proposal-generator').then(mod => mod.ProposalGenerator), { ssr: false });
const PluginSandbox = dynamic(() => import('@/components/apps/plugin-sandbox').then(mod => mod.PluginSandbox), { ssr: false });
const SettingsApp = dynamic(() => import('@/components/apps/settings').then(mod => mod.SettingsApp), { ssr: false });
const ColorPickerApp = dynamic(() => import('@/components/apps/color-picker').then(mod => mod.ColorPickerApp), { ssr: false });
const ScreenRecorderApp = dynamic(() => import('@/components/apps/screen-recorder').then(mod => mod.ScreenRecorderApp), { ssr: false });
const HardwareManagerApp = dynamic(() => import('@/components/apps/hardware-manager').then(mod => mod.HardwareManagerApp), { ssr: false });
const ConfigManagerApp = dynamic(() => import('@/components/apps/config-manager').then(mod => mod.ConfigManagerApp), { ssr: false });
const AppStoreApp = dynamic(() => import('@/components/apps/app-store').then(mod => mod.AppStoreApp), { ssr: false });
const BrowserApp = dynamic(() => import('@/components/apps/browser').then(mod => mod.BrowserApp), { ssr: false });
const MediaPlayerApp = dynamic(() => import('@/components/apps/media-player').then(mod => mod.MediaPlayerApp), { ssr: false });
const AssistantApp = dynamic(() => import('@/components/apps/assistant').then(mod => mod.AssistantApp), { ssr: false });

export const APPS = {
  'terminal': { component: TerminalBox, icon: Terminal, title: 'Terminal', roles: ['admin', 'technician'], isCore: true },
  'files': { component: FileManager, icon: Folder, title: 'Files', roles: ['admin', 'filmmaker', 'technician'], isCore: true },
  'moodboard': { component: Moodboard, icon: ImageIcon, title: 'Moodboard', roles: ['admin', 'filmmaker'], isCore: true },
  'assets': { component: AssetPipeline, icon: Archive, title: 'Asset Pipeline', roles: ['admin', 'filmmaker', 'technician'], isCore: false },
  'workspace': { component: CampaignLab, icon: BookOpen, title: 'Notes & Campaigns', roles: ['admin', 'designer', 'client', 'filmmaker', 'technician'], isCore: true },
  'code': { component: CodeEditor, icon: Code2, title: 'Code', roles: ['admin', 'technician'], isCore: true },
  'pdf': { component: PdfReader, icon: FileText, title: 'PDF Reader', roles: ['admin', 'filmmaker', 'technician'], isCore: false },
  'office': { component: ProductivitySuite, icon: Briefcase, title: 'Office Suite', roles: ['admin', 'filmmaker'], isCore: true },
  'calls': { component: CallsApp, icon: Video, title: 'Calls', roles: ['admin', 'filmmaker'], isCore: false },
  'sidegigs': { component: SideGigsApp, icon: Briefcase, title: 'Side-Gigs', roles: ['admin', 'filmmaker'], isCore: false },
  'proposals': { component: ProposalGenerator, icon: FileText, title: 'Proposals', roles: ['admin'], isCore: false },
  'history': { component: HistoryApp, icon: Clock, title: 'Event History', roles: ['admin', 'filmmaker', 'technician'], isCore: true },
  'admin': { component: AdminPanel, icon: ShieldCheck, title: 'Access Control', roles: ['admin'], isCore: true },
  'ziklag': { component: ZiklagTools, icon: Server, title: 'Ziklag Diagnostics', roles: ['admin', 'technician'], isCore: false },
  'clothing': { component: ClothingBrandPack, icon: Shirt, title: 'Clothing Brand', roles: ['admin'], isCore: false },
  'developer': { component: DeveloperPack, icon: Code, title: 'DevOps', roles: ['admin', 'technician'], isCore: false },
  'photography': { component: PhotographyPack, icon: Camera, title: 'Photography', roles: ['admin', 'filmmaker'], isCore: false },
  'plugin': { component: PluginSandbox, icon: Box, title: 'Plugin Sandbox', roles: ['admin'], isCore: false },
  'settings': { component: SettingsApp, icon: Settings, title: 'Settings', roles: ['admin', 'filmmaker', 'technician', 'designer', 'client', 'user'], isCore: true },
  'colorpicker': { component: ColorPickerApp, icon: Pipette, title: 'Color Utility', roles: ['admin', 'designer', 'filmmaker'], isCore: false },
  'screen-recorder': { component: ScreenRecorderApp, icon: Video, title: 'Screen Record', roles: ['admin', 'filmmaker', 'technician', 'designer'], isCore: false },
  'hardware': { component: HardwareManagerApp, icon: CpuIcon, title: 'Hardware', roles: ['admin', 'technician'], isCore: false },
  'config': { component: ConfigManagerApp, icon: Sliders, title: 'OS Config', roles: ['admin', 'technician'], isCore: false },
  'store': { component: AppStoreApp, icon: Store, title: 'App Hub', roles: ['admin', 'filmmaker', 'technician', 'designer', 'client', 'user'], isCore: true },
  'browser': { component: BrowserApp, icon: Compass, title: 'Browser', roles: ['admin', 'user', 'designer', 'filmmaker', 'technician'], isCore: false },
  'assistant': { component: AIGateway, icon: Bot, title: 'System AI', roles: ['admin', 'user', 'designer', 'filmmaker', 'technician', 'client'], isCore: true },
};

const PROJECTS = {
  'nike-campaign': { title: 'Nike Campaign', type: 'project' },
  'tesla-redesign': { title: 'Tesla Redesign', type: 'project' },
  'portfolio-v3': { title: 'Portfolio OS', type: 'project' }
};

const SERVICES = {
  'figma': { title: 'Figma', icon: Figma, url: 'https://www.figma.com/login', color: 'text-pink-400' },
  'framer': { title: 'Framer', icon: Framer, url: 'https://www.framer.com/login', color: 'text-blue-400' },
  'notion': { title: 'Notion', icon: BookOpen, url: 'https://www.notion.so/login', color: 'text-slate-200' },
  'github': { title: 'GitHub', icon: Github, url: 'https://github.com/login', color: 'text-white' },
  'drive': { title: 'Google Drive', icon: HardDrive, url: 'https://drive.google.com/drive/my-drive', color: 'text-emerald-400' },
};

function OsClock() {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;
  return <>{format(time, 'EEE MMM d  h:mm a')}</>;
}

function OsSyncStatus() {
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Simulate periodic cloud syncing
    let timeout: NodeJS.Timeout;
    const syncTimer = setInterval(() => {
      setIsSyncing(true);
      timeout = setTimeout(() => setIsSyncing(false), 2000);
    }, 15000);
    return () => {
      clearInterval(syncTimer);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return isSyncing ? (
    <div className="flex items-center gap-1.5 text-blue-400">
      <RefreshCw className="w-3 h-3 animate-spin" />
      <span className="hidden sm:inline text-xs">Syncing to Cloud...</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-white/50 hover:text-white/80 cursor-default transition-colors">
      <Cloud className="w-4 h-4" />
      <span className="hidden sm:inline text-xs">Synced</span>
    </div>
  );
}

import { collection, onSnapshot, addDoc, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DesktopWindowProps {
  win: OSWindow;
  AppComponent: React.ComponentType<any>;
}

const DesktopWindow = React.memo(
  function DesktopWindow({ win, AppComponent }: DesktopWindowProps) {
    return (
      <WindowFrame osWindow={win}>
        <AppComponent window={win} />
      </WindowFrame>
    );
  },
  (prev, next) => {
    return (
      prev.win.id === next.win.id &&
      prev.win.title === next.win.title &&
      prev.win.isMaximized === next.win.isMaximized &&
      prev.win.isMinimized === next.win.isMinimized &&
      prev.win.zIndex === next.win.zIndex &&
      prev.win.x === next.win.x &&
      prev.win.y === next.win.y &&
      prev.win.width === next.win.width &&
      prev.win.height === next.win.height &&
      prev.win.workspace === next.win.workspace &&
      prev.win.data?.fileId === next.win.data?.fileId
    );
  }
);

export function Desktop() {
  const { currentUser, setCurrentUser, logout, windows, snapshots, performanceMode, setPerformanceMode, workspaceMode, setWorkspaceMode, activeWorkspace, setActiveWorkspace, installedApps, recentApps, openWindow, closeWindow, minimizeWindow, focusWindow, applyWorkspaceLayout, loadProject, saveSnapshot, restoreSnapshot, wipeSession, wallpaper, themeColor, fontFamily, screenShader } = useOS();
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showActionCenter, setShowActionCenter] = useState(false);
  const [customApps, setCustomApps] = useState<any[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [switcherIndex, setSwitcherIndex] = useState(0);
  const [showLaunchpad, setShowLaunchpad] = useState(false);
  const [showMissionControl, setShowMissionControl] = useState(false);
  const [showControlCenter, setShowControlCenter] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: { label: string, onClick: () => void, icon?: any }[] } | null>(null);
  const [widgets, setWidgets] = useState<{ id: string, type: 'notes' | 'cpu', x: number, y: number, content?: string }[]>([
    { id: 'w1', type: 'notes', x: 40, y: 80, content: 'Finish the new brand guidelines by Friday.' }
  ]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [desktopFiles, setDesktopFiles] = useState<LocalFile[]>([]);

  const refreshDesktop = async () => {
    try {
      let files = await FS.readDir('Desktop');
      if (files.length === 0) {
        await FS.write('Desktop/Welcome to Ziklag OS.txt', `Welcome to Ziklag OS!

This is a local-first web operating system designed for managing multiple ventures seamlessly.

Quick Start:
1. Double click files in the File Manager to open them.
2. Drag and drop local files from your computer into the OS window to import them.
3. Use the App Hub to install ecosystem packs like Ziklag Diagnostics or Clothing Brand.
4. Try System AI in the dock for natural language control.

Enjoy your workspace!`);
        await FS.write('Documents/Project Brief.txt', `Project Brief: Nike Campaign 2026

Goal: Relaunch the Nike Force 40th anniversary interactive landing page.
Deliverables:
- Campaign landing page live preview
- Design specs and moodboards
- Budget proposals

Status: In Review`);
        await FS.write('Downloads/Minified Specs.json', JSON.stringify({
          projectName: "ANICHISOM OS",
          version: "2.0.0",
          codename: "Ziklag",
          environment: "Production"
        }, null, 2));
        
        files = await FS.readDir('Desktop');
      }
      setDesktopFiles(files || []);
    } catch (e) {
      console.warn("Failed to read desktop files", e);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    refreshDesktop();
    const q = query(collection(db, 'apps'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const apps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomApps(apps);
    });
    
    // --- MCP Bridge Listener ---
    let mcpSocket: any = null;
    import('socket.io-client').then(({ io }) => {
      mcpSocket = io({ path: '/api/socketio' });
      mcpSocket.on('mcp-request', async (req: any) => {
        try {
          if (req.method === 'openWindow') {
            openWindow(req.params.appId, req.params.title, req.params.data);
            mcpSocket.emit('mcp-response', { id: req.id, success: true });
          } else if (req.method === 'readFS') {
            const { FS } = await import('@/lib/fs');
            const file = await FS.read(req.params.path);
            mcpSocket.emit('mcp-response', { id: req.id, success: true, result: file?.content || '' });
          } else if (req.method === 'writeFS') {
            const { FS } = await import('@/lib/fs');
            await FS.write(req.params.path, req.params.content);
            mcpSocket.emit('mcp-response', { id: req.id, success: true });
          }
        } catch (err: any) {
          mcpSocket.emit('mcp-response', { id: req.id, success: false, error: err.message });
        }
      });
    });

    return () => {
       unsub();
       if (mcpSocket) mcpSocket.disconnect();
    };
  }, [currentUser]);

  // Handle custom app additions via events
  useEffect(() => {
    const onAddApp = () => handleAddApp();
    const onOpenWindow = (e: any) => {
      if (e.detail) {
        openWindow(e.detail.appId, e.detail.title, e.detail.data);
      }
    };
    window.addEventListener('os:add-custom-app', onAddApp);
    window.addEventListener('os:open-window', onOpenWindow);
    return () => {
       window.removeEventListener('os:add-custom-app', onAddApp);
       window.removeEventListener('os:open-window', onOpenWindow);
    };
  }, [currentUser, openWindow]);

  // Window Switcher (Ctrl+Tab) Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        setShowSwitcher(true);
        setSwitcherIndex((prev) => {
          const activeW = windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined);
          if (activeW.length === 0) return 0;
          return (prev + 1) % activeW.length;
        });
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Tab') {
        // If they release Ctrl, execute the switch
        if (!e.ctrlKey) {
          setShowSwitcher(false);
          setSwitcherIndex((currentIdx) => {
            const activeW = windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined);
            if (activeW.length > 0 && currentIdx < activeW.length) {
              focusWindow(activeW[currentIdx].id);
            }
            return 0; // reset
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [windows, activeWorkspace, focusWindow]);

  // Global Config & Keybinds Logic
  useEffect(() => {
    let currentKeybinds: Record<string, string> = {
      'alt+t': 'open:terminal',
      'alt+f': 'open:files',
      'alt+b': 'open:browser',
      'alt+c': 'open:code',
      'ctrl+space': 'action:launchpad',
      'ctrl+w': 'action:close-active-window',
      'ctrl+m': 'action:minimize-active-window',
    };
    
    import('@/lib/fs').then(({ FS }) => {
      FS.read('.config/anichisom.json').then(file => {
        if (file && file.content) {
           try {
             currentKeybinds = JSON.parse(file.content).keybinds || currentKeybinds;
           } catch (e) {}
        }
      });
    });

    const handleConfigUpdate = (e: any) => {
       currentKeybinds = e.detail?.keybinds || currentKeybinds;
    };
    window.addEventListener('os:config-updated', handleConfigUpdate);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const keys = [];
      if (e.ctrlKey) keys.push('ctrl');
      if (e.altKey) keys.push('alt');
      if (e.shiftKey) keys.push('shift');
      if (e.metaKey) keys.push('meta');
      
      const key = e.key.toLowerCase();
      if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
         keys.push(key === ' ' ? 'space' : key);
      }
      
      const combo = keys.join('+');
      
      if (currentKeybinds[combo]) {
         e.preventDefault();
         const action = currentKeybinds[combo];
         if (action.startsWith('open:')) {
            openWindow(action.replace('open:', ''));
         } else if (action === 'action:launchpad') {
            setShowLaunchpad(prev => !prev);
         } else if (action === 'action:close-active-window') {
            const activeW = windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined);
            const focused = activeW.find(w => !w.isMinimized && w.zIndex >= Math.max(...activeW.map(win => win.zIndex)));
            if (focused) closeWindow(focused.id);
         } else if (action === 'action:minimize-active-window') {
            const activeW = windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined);
            const focused = activeW.find(w => !w.isMinimized && w.zIndex >= Math.max(...activeW.map(win => win.zIndex)));
            if (focused) minimizeWindow(focused.id);
         }
      }

      // Escape closes context menu
      if (e.key === 'Escape' && contextMenu) {
        closeContextMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
       window.removeEventListener('os:config-updated', handleConfigUpdate);
       window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openWindow, windows, activeWorkspace, closeWindow, minimizeWindow, contextMenu]);

  // Idle Timer for Lock Screen
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetIdle = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsLocked(true), 5 * 60 * 1000); // 5 mins
    };
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    resetIdle();
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      clearTimeout(timeout);
    };
  }, []);

  const handleGlobalContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'New Folder', icon: Folder, onClick: () => console.log('New Folder') },
        { label: 'Change Wallpaper', icon: ImageIcon, onClick: () => openWindow('settings') },
        { label: 'Add Sticky Note', icon: StickyNote, onClick: () => setWidgets(prev => [...prev, { id: Date.now().toString(), type: 'notes', x: e.clientX, y: e.clientY, content: '' }]) },
        { label: 'Add CPU Monitor', icon: Activity, onClick: () => setWidgets(prev => [...prev, { id: Date.now().toString(), type: 'cpu', x: e.clientX, y: e.clientY }]) },
      ]
    });
  };

  const closeContextMenu = () => {
    if (contextMenu) setContextMenu(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      try {
        await FS.write(`Desktop/${file.name}`, file, file.type);
        alert(`File ${file.name} saved to Desktop via OS File System.`);
        refreshDesktop();
      } catch (err) {
        console.error('File drop failed', err);
      }
    }
  };

  const handleAddApp = async () => {
    const title = prompt("Enter App Name:");
    const url = prompt("Enter App URL:");
    if (!title || !url) return;
    try {
      await addDoc(collection(db, 'apps'), {
        title, url, icon: 'Globe', ownerId: currentUser?.id, color: 'text-white'
      });
    } catch (e: any) {
      alert("Failed to add app: " + e.message);
    }
  };

  if (!currentUser) {
    return <LoginScreen />;
  }

  const allowedApps = Object.entries(APPS).filter(([appId, config]) => 
    config.roles.includes(currentUser.role) && (config.isCore || installedApps.includes(appId))
  );
  const isSuperUser = currentUser.role === 'admin';

  if (isLocked) {
    return (
      <div className="fixed inset-0 w-full h-full bg-black flex flex-col items-center justify-center z-[9999] text-white font-sans overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110" style={{ backgroundImage: `url("${wallpaper}")` }} />
        <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
          <div className="text-8xl font-light tracking-tighter">{format(new Date(), 'HH:mm')}</div>
          <div className="text-xl font-medium text-white/70">{format(new Date(), 'EEEE, MMMM do')}</div>
          
          <div className="mt-12 flex flex-col items-center gap-4">
             {currentUser.avatarUrl ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={currentUser.avatarUrl} alt="avatar" className="w-20 h-20 rounded-full border-2 border-white/20 shadow-2xl" />
             ) : (
               <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 shadow-2xl"><User className="w-10 h-10 text-white/50" /></div>
             )}
             <div className="font-medium text-lg">{currentUser.name}</div>
             <button onClick={() => setIsLocked(false)} className="mt-4 px-8 py-2.5 bg-white/10 hover:bg-white/25 border border-white/20 rounded-full font-medium transition-colors backdrop-blur-md flex items-center gap-2">
               <Lock className="w-4 h-4" /> Unlock
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 w-full h-full overflow-hidden flex flex-col font-sans select-none bg-black" 
      style={{ fontFamily }}
      onClick={closeContextMenu}
      onContextMenu={handleGlobalContextMenu}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={handleDrop}
    >
      <style>{`
        :root {
          --color-neon-blue: ${themeColor};
        }
        ${screenShader === 'contrast' ? 'body { filter: contrast(1.25) saturate(1.2); }' : ''}
      `}</style>
      
      {/* Screen Shaders Overlays */}
      {screenShader === 'crt' && <div className="pointer-events-none absolute inset-0 z-[200] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay"></div>}
      {screenShader === 'warm' && <div className="pointer-events-none absolute inset-0 z-[200] bg-orange-500/10 mix-blend-multiply"></div>}
      {screenShader === 'matrix' && <div className="pointer-events-none absolute inset-0 z-[200] bg-green-500/10 mix-blend-color"></div>}

      <CommandPalette />
      
      {/* macOS Style Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{ backgroundImage: `url("${wallpaper}")` }} 
      />

      {/* OS Menu Bar */}
      <header role="menubar" aria-label="OS menu bar" className="h-7 flex items-center shrink-0 w-full bg-black/20 backdrop-blur-3xl border-b border-white/10 z-[260] px-4 sticky top-0 text-[13px] font-medium text-white/90">
        <div className="flex items-center gap-6">
          <div className="font-bold text-white flex items-center gap-2 cursor-pointer hover:scale-110 transition-transform" onClick={() => setShowLaunchpad(!showLaunchpad)}>
            
          </div>
          <div className="font-bold flex items-center cursor-default uppercase tracking-wider text-xs bg-white/20 px-2 py-0.5 rounded gap-2">
            {currentUser.avatarUrl && (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={currentUser.avatarUrl} alt="avatar" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" loading="lazy" />
            )}
            {currentUser.name}
          </div>
          <div className="hidden sm:flex gap-4">
            {/* OS Native Menus */}
            <div className="group relative">
               <button role="menuitem" className="hover:bg-white/20 px-2 py-0.5 rounded transition-colors cursor-default">File</button>
               <div role="menu" className="absolute top-full left-0 mt-1 scale-0 group-hover:scale-100 transition-transform origin-top-left bg-black/80 backdrop-blur-xl border border-white/10 text-white text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]">
                  <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Saved State', message: 'OS State saved to IndexedDB.' }}))}>Save Desktop State</button>
                  <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('os:open-spotlight'))}>New File (Spotlight)</button>
                  <div className="h-px bg-white/10 my-1"></div>
                  <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-rose-500 hover:text-white transition-colors" onClick={() => wipeSession()}>Wipe Local Data</button>
               </div>
            </div>
            <div className="group relative">
               <button role="menuitem" className="hover:bg-white/20 px-2 py-0.5 rounded transition-colors cursor-default">Edit</button>
               <div role="menu" className="absolute top-full left-0 mt-1 scale-0 group-hover:scale-100 transition-transform origin-top-left bg-black/80 backdrop-blur-xl border border-white/10 text-white text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]">
                  <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors text-white/50">Undo (Cmd+Z)</button>
                  <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors text-white/50">Redo (Cmd+Shift+Z)</button>
                  <div className="h-px bg-white/10 my-1"></div>
                  <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors" onClick={() => setShowLaunchpad(true)}>Edit OS Apps</button>
               </div>
            </div>
            <div className="group relative">
               <button role="menuitem" className="hover:bg-white/20 px-2 py-0.5 rounded transition-colors cursor-default">View</button>
               <div role="menu" className="absolute top-full left-0 mt-1 scale-0 group-hover:scale-100 transition-transform origin-top-left bg-black/80 backdrop-blur-xl border border-white/10 text-white text-xs font-medium rounded-lg shadow-2xl py-1 min-w-[160px] z-[300]">
                  <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between" onClick={() => applyWorkspaceLayout('creative-split')}>Multi-View Workspace</button>
                  <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors" onClick={() => setShowMissionControl(true)}>Mission Control</button>
                  <button role="menuitem" className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white transition-colors" onClick={() => setShowSnapshots(!showSnapshots)}>Time Machine</button>
               </div>
            </div>
            
            {/* Phase 2A: Workspace Selector */}
            <div className="border-l border-white/20 pl-4">
              <WorkspaceSelector />
            </div>
            
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/20">
              {[0, 1, 2].map(ws => (
                <button 
                  key={ws}
                  onClick={() => setActiveWorkspace(ws)}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs transition-colors",
                    activeWorkspace === ws ? "bg-white/20 text-white" : "text-white/60 hover:text-white/90 hover:bg-white/10"
                  )}
                >
                  Desktop {ws + 1}
                </button>
              ))}
            </div>

            {/* Spotlight Search Toggle */}
            <div className="flex items-center ml-4 pl-4 border-l border-white/20">
              <button 
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                className="flex items-center gap-2 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Search (Cmd+K)"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-xs opacity-50 font-mono">⌘K</span>
              </button>
            </div>

            {/* Workspace Context Toggle (Private vs Agency) */}
            <div className="flex items-center gap-1 ml-4 pl-4 border-l border-white/20 bg-black/20 rounded-md p-0.5 border border-white/10 shadow-inner">
               <button 
                 onClick={() => setWorkspaceMode('private')}
                 className={cn(
                   "px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all",
                   workspaceMode === 'private' ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white/90"
                 )}
               >
                 Private
               </button>
               <button 
                 onClick={() => setWorkspaceMode('agency')}
                 className={cn(
                   "px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5",
                   workspaceMode === 'agency' ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" : "text-white/50 hover:text-white/90"
                 )}
               >
                 <Users className="w-3.5 h-3.5" />
                 Agency
               </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          {/* Phase 2A: Presence Indicator */}
          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <PresenceIndicator />
          </div>
          <div className="flex items-center gap-4 border-r border-white/10 pr-4">
            <button 
              onClick={() => setPerformanceMode(performanceMode === 'heavy' ? 'light' : 'heavy')}
              className={cn(
                "flex items-center gap-1.5 transition-colors cursor-pointer text-xs group px-2 py-1 rounded",
                performanceMode === 'light' ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20" : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
              title={performanceMode === 'light' ? "Light Mode Active (Performance Optimized)" : "Heavy Mode Active (Rich Visuals)"}
            >
              {performanceMode === 'light' ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline font-medium tracking-wide">
                {performanceMode === 'light' ? 'Light' : 'Heavy'}
              </span>
            </button>
            <OsSyncStatus />
            <div className="group relative flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400/80 hover:text-emerald-400 cursor-pointer transition-colors" />
              <div className="absolute top-full right-0 mt-2 scale-0 group-hover:scale-100 transition-transform px-3 py-2 bg-black/80 backdrop-blur-xl border border-white/10 text-white text-xs font-medium rounded shadow-xl whitespace-nowrap z-[100]">
                 <div className="font-bold text-emerald-400 mb-1">Sandboxed Environment</div>
                 <div className="text-white/60">Apps are isolated & secure.</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
               className="cursor-pointer hover:text-white text-white/80 transition-colors focus:outline-none" 
               onClick={() => window.dispatchEvent(new CustomEvent('os:open-spotlight'))}
               title="Global Search (Cmd/Ctrl + K)"
            >
               <Search className="w-4 h-4" />
            </button>
            <div className="group relative flex items-center justify-center">
              <Power onClick={() => logout()} className="w-4 h-4 text-rose-500/80 hover:text-rose-500 cursor-pointer transition-colors" />
              <div className="absolute top-full right-0 mt-2 scale-0 group-hover:scale-100 transition-transform px-3 py-2 bg-rose-500/20 backdrop-blur-xl border border-rose-500/30 text-white text-xs font-medium rounded shadow-xl whitespace-nowrap z-[100]">
                 Sign Out
              </div>
            </div>
            <button 
              className="text-white/90 cursor-pointer hover:text-white ml-2 focus:outline-none flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors"
              onClick={() => setShowControlCenter(!showControlCenter)}
            >
              <Sliders className="w-3.5 h-3.5" />
              <OsClock />
            </button>
          </div>
        </div>
      </header>

      {showControlCenter && <ControlCenter onClose={() => setShowControlCenter(false)} />}

      {/* Main Workspace Area (Desktop) */}
      <main className="flex-1 relative z-10 w-full h-full overflow-hidden pointer-events-none">
        
        {/* Desktop Icons */}
        <div className="absolute inset-0 p-6 flex flex-col flex-wrap gap-6 items-start content-start z-0 pointer-events-auto">
          {desktopFiles.map((file, i) => {
            const isMedia = file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/');
            const isImage = file.mimeType?.startsWith('image/');
            return (
              <div 
                key={i}
                className="w-20 flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-white/10 cursor-pointer group transition-colors"
                onDoubleClick={() => {
                   if (isMedia) {
                     openWindow('media-player', 'Media Player', { fileUrl: file.content || file.id, mimeType: file.mimeType });
                   } else if (isImage) {
                     openWindow('code', 'Editor', { fileId: file.id });
                   } else {
                     openWindow('code', 'Editor', { fileId: file.id });
                   }
                }}
              >
                {isImage && file.content ? (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img src={file.content} alt={file.name} className="w-12 h-12 object-cover rounded shadow-lg" />
                ) : isMedia ? (
                   <Film className="w-12 h-12 text-rose-400 drop-shadow-md" />
                ) : (
                   <FileText className="w-12 h-12 text-white/80 drop-shadow-md" />
                )}
                <span className="text-xs text-center font-medium text-white drop-shadow-md px-1 bg-black/30 rounded leading-tight line-clamp-2">
                  {file.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* Desktop Widgets Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none">
           {widgets.map(widget => (
             <div 
               key={widget.id} 
               className="absolute pointer-events-auto"
               style={{ left: widget.x, top: widget.y }}
               onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); setWidgets(prev => prev.filter(w => w.id !== widget.id)); }}
             >
               {widget.type === 'notes' && (
                 <div className="w-64 h-64 bg-amber-200/90 backdrop-blur-md shadow-2xl rounded-sm p-4 rotate-1 hover:rotate-0 transition-transform cursor-move flex flex-col group">
                   <div className="text-amber-900/40 text-xs font-bold uppercase mb-2 flex justify-between">
                      Sticky Note
                      <button onClick={() => setWidgets(prev => prev.filter(w => w.id !== widget.id))} className="opacity-0 group-hover:opacity-100 hover:text-rose-500"><X className="w-3 h-3" /></button>
                   </div>
                   <textarea 
                     className="flex-1 bg-transparent border-none outline-none resize-none text-amber-900 font-medium text-sm leading-relaxed"
                     defaultValue={widget.content}
                     placeholder="Write a note..."
                     onPointerDown={e => e.stopPropagation()}
                   />
                 </div>
               )}
               {widget.type === 'cpu' && (
                 <div className="w-64 bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl p-4 flex flex-col gap-4 group">
                    <div className="flex justify-between items-center text-white/50">
                       <div className="text-xs font-bold uppercase flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /> System Stats</div>
                       <button onClick={() => setWidgets(prev => prev.filter(w => w.id !== widget.id))} className="opacity-0 group-hover:opacity-100 hover:text-rose-500"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center justify-between text-xs font-medium text-white"><span>CPU Usage</span> <span>12%</span></div>
                       <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="w-[12%] h-full bg-emerald-400 rounded-full" /></div>
                    </div>
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center justify-between text-xs font-medium text-white"><span>RAM Usage</span> <span>4.2 GB</span></div>
                       <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="w-[60%] h-full bg-blue-400 rounded-full" /></div>
                    </div>
                 </div>
               )}
             </div>
           ))}
        </div>

        {/* Snapshots Menu */}
        {showSnapshots && (
          <div className="absolute top-2 left-64 w-64 bg-black/60 shadow-2xl border border-white/10 rounded-xl backdrop-blur-3xl pointer-events-auto z-[60] overflow-hidden">
            <div className="p-3 border-b border-white/10 flex justify-between items-center">
               <div className="text-white text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neon-blue" />
                  Time Machine
               </div>
               <button onClick={() => saveSnapshot(`Save ${format(new Date(), 'h:mm a')}`)} className="text-white/60 hover:text-white flex items-center gap-1 text-xs">
                 <Save className="w-3 h-3" /> Save current
               </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {snapshots.length === 0 ? (
                <div className="p-4 text-white/50 text-xs text-center italic">No snapshots saved.</div>
              ) : (
                <div className="flex flex-col">
                  {snapshots.map(snap => (
                    <button 
                      key={snap.id} 
                      onClick={() => {
                        restoreSnapshot(snap.id);
                        setShowSnapshots(false);
                      }}
                      className="px-4 py-3 hover:bg-white/10 text-left transition-colors border-b border-white/5 last:border-0"
                    >
                      <div className="text-white text-sm truncate">{snap.name}</div>
                      <div className="text-white/40 text-[10px] mt-0.5">{format(new Date(snap.timestamp), 'MMM d, yyyy h:mm a')}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Render all open windows */}
        {windows
          .filter(win => win.workspace === activeWorkspace || win.workspace === undefined)
          .map(win => {
            const AppConfig = APPS[win.appId as keyof typeof APPS];
            if (!AppConfig) return null;

            return (
              <DesktopWindow 
                key={win.id} 
                win={win} 
                AppComponent={AppConfig.component} 
              />
            );
          })}

        {/* Action Center */}
        {showActionCenter && (
          <div className="absolute top-0 right-0 h-full w-80 bg-black/60 backdrop-blur-3xl shadow-2xl border-l border-white/10 z-[60] flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-right">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
               <h3 className="text-white font-medium text-sm">Action Center</h3>
               <button onClick={() => setShowActionCenter(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            
            <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
               {/* Quick Toggles */}
               <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => setPerformanceMode(performanceMode === 'heavy' ? 'light' : 'heavy')}
                    className={cn(
                      "p-3 rounded-xl flex flex-col items-start gap-2 transition-colors",
                      performanceMode === 'heavy' ? "bg-amber-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                 >
                    <Zap className="w-5 h-5" />
                    <span className="text-xs font-medium">Heavy Mode</span>
                 </button>
                 <button 
                    onClick={() => {
                       setShowActionCenter(false);
                       openWindow('ai-gateway', 'AI Gateway Settings');
                    }}
                    className="p-3 rounded-xl bg-emerald-500 text-white flex flex-col items-start gap-2 hover:bg-emerald-400 transition-colors"
                 >
                    <Brain className="w-5 h-5" />
                    <span className="text-xs font-medium">AI Gateway</span>
                 </button>
                 <button className="p-3 rounded-xl bg-white/10 text-white flex flex-col items-start gap-2 opacity-50 cursor-not-allowed">
                    <Cloud className="w-5 h-5" />
                    <span className="text-xs font-medium">Cloud Sync</span>
                 </button>
                 <button className="p-3 rounded-xl bg-white/10 text-white flex flex-col items-start gap-2 opacity-50 cursor-not-allowed">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-xs font-medium">Sandbox</span>
                 </button>
               </div>

               {/* Notifications */}
               <div>
                 <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">Notifications</div>
                 <div className="flex flex-col gap-2">
                   <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                     <div className="text-white text-sm font-medium mb-1">AI Compilation Complete</div>
                     <div className="text-white/60 text-xs">Moodboard layout has been regenerated.</div>
                     <div className="text-white/40 text-[10px] mt-2">Just now</div>
                   </div>
                   <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                     <div className="text-white text-sm font-medium mb-1">File Saved</div>
                     <div className="text-white/60 text-xs">system_architecture.pdf was saved to Documents.</div>
                     <div className="text-white/40 text-[10px] mt-2">2m ago</div>
                   </div>
                 </div>
               </div>
               
            </div>
          </div>
        )}
      </main>

      {/* Window Switcher Overlay */}
      {showSwitcher && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
          <div className="bg-black/80 border border-white/20 p-8 rounded-3xl shadow-2xl flex gap-6 items-center flex-wrap max-w-4xl justify-center">
            {windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined).map((win, idx) => {
               const AppConfig = APPS[win.appId as keyof typeof APPS];
               const Icon = AppConfig?.icon || Folder;
               return (
                 <div key={win.id} className={cn("flex flex-col items-center gap-4 p-5 rounded-2xl transition-all duration-200", switcherIndex === idx ? "bg-white/20 scale-110 shadow-xl" : "opacity-50 hover:opacity-80")}>
                    <Icon className="w-14 h-14 text-white" />
                    <span className="text-white text-sm font-medium tracking-wide">{win.title}</span>
                 </div>
               );
            })}
            {windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined).length === 0 && (
               <div className="text-white/50 text-sm">No open windows</div>
            )}
          </div>
        </div>
      )}

      {/* Launchpad Overlay */}
      {showLaunchpad && (
        <div className="absolute inset-0 z-[250] bg-black/60 backdrop-blur-2xl pointer-events-auto flex flex-col items-center pt-24 pb-12 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-xl mb-16 px-4">
             <input 
                type="text" 
                placeholder="Search applications..." 
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white text-lg font-medium focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all text-center placeholder:text-white/30 shadow-2xl" 
                autoFocus
             />
          </div>
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-x-4 gap-y-12 max-w-6xl mx-auto mt-24 px-8">
            {Object.entries(APPS).map(([appId, config]) => {
              if (!config.roles.includes(currentUser.role) && !isSuperUser) return null;
              if (!config.isCore && !installedApps.includes(appId)) return null;
              const Icon = config.icon;
               return (
                 <button 
                   key={appId}
                   onClick={() => {
                     openWindow(appId);
                     setShowLaunchpad(false);
                   }}
                   className="flex flex-col items-center gap-3 group outline-none w-24"
                 >
                   <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center group-hover:bg-white/25 transition-all duration-300 group-hover:scale-110 shadow-lg border border-white/10 group-focus:ring-2 ring-white/50">
                     <Icon className="w-10 h-10 text-white" />
                   </div>
                   <span className="text-white text-sm font-medium drop-shadow-md text-center line-clamp-1 w-full px-1">{config.title}</span>
                 </button>
               );
            })}
          </div>
        </div>
      )}

      {/* Mission Control Overlay */}
      {showMissionControl && (
        <div className="absolute inset-0 z-[240] bg-black/40 backdrop-blur-xl pointer-events-auto flex flex-col animate-in fade-in duration-200">
          {/* Top Desktop Bar */}
          <div className="h-48 bg-black/40 border-b border-white/10 flex items-center justify-center gap-10 px-8 py-6">
            {[0, 1, 2].map(wsIndex => (
               <button 
                 key={wsIndex}
                 onClick={() => {
                    setActiveWorkspace(wsIndex);
                    setShowMissionControl(false);
                 }}
                 className={cn(
                   "relative w-64 h-full rounded-2xl border-2 overflow-hidden transition-all duration-300 group shadow-2xl",
                   activeWorkspace === wsIndex ? "border-blue-500 scale-105 shadow-[0_0_30px_rgba(59,130,246,0.3)]" : "border-white/20 hover:border-white/50 hover:scale-105"
                 )}
               >
                 <div className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url("${wallpaper}")` }} />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                 <div className="absolute bottom-3 left-0 right-0 text-center font-bold text-white text-sm shadow-sm">
                   Desktop {wsIndex + 1}
                 </div>
               </button>
            ))}
          </div>
          
          {/* Windows Overview */}
          <div className="flex-1 p-12 flex flex-wrap content-start gap-8 justify-center overflow-y-auto">
             {windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined).map(win => {
                const AppConfig = APPS[win.appId as keyof typeof APPS];
                const Icon = AppConfig?.icon || Folder;
                return (
                  <button
                    key={win.id}
                    onClick={() => {
                       focusWindow(win.id);
                       setShowMissionControl(false);
                    }}
                    className="relative w-72 h-48 bg-black/40 border border-white/20 rounded-2xl overflow-hidden hover:scale-105 hover:border-blue-400 transition-all duration-300 shadow-2xl flex flex-col group backdrop-blur-md"
                  >
                     <div className="h-10 bg-white/10 border-b border-white/10 flex items-center px-4 gap-3">
                        <Icon className="w-4 h-4 text-white" />
                        <span className="text-white text-sm font-medium truncate">{win.title}</span>
                     </div>
                     <div className="flex-1 flex items-center justify-center group-hover:bg-white/5 transition-colors">
                        <Icon className="w-20 h-20 text-white/20 group-hover:text-white/40 transition-colors" />
                     </div>
                  </button>
                )
             })}
             {windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined).length === 0 && (
                <div className="w-full text-center text-white/50 mt-32 text-2xl font-medium tracking-tight">No open windows on Desktop {activeWorkspace + 1}</div>
             )}
          </div>
        </div>
      )}

      {/* macOS Style Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[260] pointer-events-none">
        <nav role="toolbar" aria-label="Application dock" className="flex items-end gap-3 px-3 py-2 bg-white/20 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-2xl pointer-events-auto">
          {/* Launchpad & Mission Control Buttons */}
          <div className="relative group flex flex-col items-center justify-end">
            <button
              aria-label="Launchpad"
              onClick={() => setShowLaunchpad(prev => {
                 if (!prev) setShowMissionControl(false);
                 return !prev;
              })}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 transform origin-bottom hover:scale-125 hover:mx-2 bg-white/80 hover:bg-white"
            >
              <Grid className="w-7 h-7 text-black" aria-hidden="true" />
            </button>
            <div role="tooltip" className="absolute -top-12 scale-0 group-hover:scale-100 transition-transform px-3 py-1 bg-black/60 backdrop-blur text-white text-xs font-medium rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50">Launchpad</div>
          </div>
          <div className="relative group flex flex-col items-center justify-end">
            <button
              aria-label="Mission Control"
              onClick={() => setShowMissionControl(prev => {
                 if (!prev) setShowLaunchpad(false);
                 return !prev;
              })}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 transform origin-bottom hover:scale-125 hover:mx-2 bg-white/80 hover:bg-white"
            >
              <Layers className="w-7 h-7 text-black" aria-hidden="true" />
            </button>
            <div role="tooltip" className="absolute -top-12 scale-0 group-hover:scale-100 transition-transform px-3 py-1 bg-black/60 backdrop-blur text-white text-xs font-medium rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50">Mission Control</div>
          </div>
          <div className="w-px h-10 bg-white/20 mx-1"></div>

          {allowedApps.filter(([appId, config]) => {
             const activeWindows = windows.filter(win => win.workspace === activeWorkspace || win.workspace === undefined);
             const isOpen = activeWindows.some(w => w.appId === appId);
             return config.isCore || isOpen || recentApps.includes(appId);
          }).map(([appId, config]) => {
            const Icon = config.icon;
            const activeWindows = windows.filter(win => win.workspace === activeWorkspace || win.workspace === undefined);
            const isOpen = activeWindows.some(w => w.appId === appId);
            const isFocused = activeWindows.some(w => w.appId === appId && !w.isMinimized && w.zIndex >= Math.max(...activeWindows.map(win => win.zIndex)));

            return (
              <div key={appId} className="relative group flex flex-col items-center justify-end">
                <button
                  aria-label={config.title}
                  onClick={() => {
                    const existingWindow = activeWindows.find(w => w.appId === appId);
                    if (existingWindow) {
                      if (existingWindow.isMinimized || !isFocused) {
                        focusWindow(existingWindow.id);
                      } else {
                        minimizeWindow(existingWindow.id);
                      }
                    } else {
                      openWindow(appId);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 transform origin-bottom hover:scale-125 hover:mx-2",
                    isOpen ? "bg-white/90" : "bg-white/80 hover:bg-white"
                  )}
                >
                  <Icon className={cn(
                    "w-7 h-7 transition-colors duration-300",
                    "text-black"
                  )} aria-hidden="true" />
                </button>
                {/* Active Indicator */}
                {isOpen && (
                  <span aria-hidden="true" className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-white shadow-sm" />
                )}

                {/* Tooltip */}
                <div role="tooltip" className="absolute -top-12 scale-0 group-hover:scale-100 transition-transform px-3 py-1 bg-black/60 backdrop-blur text-white text-xs font-medium rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50">
                  {config.title}
                </div>
              </div>
            )
          })}
        </nav>
      </div>
      {/* Global Context Menu */}
      {contextMenu && (
        <div
          role="menu"
          aria-label="Desktop context menu"
          className="absolute z-[9999] bg-black/70 backdrop-blur-3xl border border-white/20 shadow-2xl rounded-xl py-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              className="w-full text-left px-4 py-2 text-sm text-white/90 hover:bg-blue-500 hover:text-white flex items-center gap-3 transition-colors"
              onClick={() => { item.onClick(); closeContextMenu(); }}
            >
              {item.icon && <item.icon className="w-4 h-4 opacity-70" aria-hidden="true" />}
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Drag Drop Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-[9000] bg-blue-500/10 backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-3xl flex items-center justify-center pointer-events-none">
           <div className="bg-blue-500 text-white font-bold text-xl px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
              <FilePlus className="w-8 h-8" />
              Drop files to save to OS Desktop
           </div>
        </div>
      )}
    </div>
  );
}
