'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useOS, OSRole, OSUser, OSWindow } from '@/lib/os-context';
import { WindowFrame } from '@/components/window-frame';
import { CommandPalette } from '@/components/command-palette';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { PresenceIndicator } from '@/components/presence-indicator';
import { Terminal, Folder, Globe, Sparkles, Image as ImageIcon, Code2, Search, LayoutTemplate, Clock, Save, Cloud, RefreshCw, ShieldCheck, Power, Figma, Framer, HardDrive, Github, BookOpen, Zap, ZapOff, Briefcase, Brain, User, AlertCircle, Play, Plus, Users, Server, Archive, FileText, Video, Store, Shirt, Cpu, Camera, Code, Box } from 'lucide-react';
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

export const APPS = {
  'terminal': { component: TerminalBox, icon: Terminal, title: 'Terminal', roles: ['admin', 'technician'], isCore: true },
  'files': { component: FileManager, icon: Folder, title: 'Files', roles: ['admin', 'filmmaker', 'technician'], isCore: true },
  'browser': { component: MiniBrowser, icon: Globe, title: 'Browser', roles: ['admin', 'filmmaker', 'technician'], isCore: true },
  'moodboard': { component: Moodboard, icon: ImageIcon, title: 'Moodboard', roles: ['admin', 'filmmaker'], isCore: true },
  'assets': { component: AssetPipeline, icon: Archive, title: 'Asset Pipeline', roles: ['admin', 'filmmaker', 'technician'], isCore: false },
  'workspace': { component: CampaignLab, icon: BookOpen, title: 'Notes & Campaigns', roles: ['admin', 'designer', 'client', 'filmmaker', 'technician'], isCore: true },
  'code': { component: CodeEditor, icon: Code2, title: 'Code', roles: ['admin', 'technician'], isCore: true },
  'pdf': { component: PdfReader, icon: FileText, title: 'PDF Reader', roles: ['admin', 'filmmaker', 'technician'], isCore: false },
  'office': { component: ProductivitySuite, icon: Briefcase, title: 'Office Suite', roles: ['admin', 'filmmaker'], isCore: true },
  'calls': { component: CallsApp, icon: Video, title: 'Calls', roles: ['admin', 'filmmaker'], isCore: false },
  'sidegigs': { component: SideGigsApp, icon: Briefcase, title: 'Side-Gigs', roles: ['admin', 'filmmaker'], isCore: false },
  'proposals': { component: ProposalGenerator, icon: FileText, title: 'Proposals', roles: ['admin'], isCore: false },
  'marketplace': { component: Marketplace, icon: Store, title: 'Ecosystem', roles: ['admin'], isCore: true },
  'ai-gateway': { component: AIGateway, icon: Brain, title: 'AI Gateway', roles: ['admin', 'technician'], isCore: true },
  'history': { component: HistoryApp, icon: Clock, title: 'Event History', roles: ['admin', 'filmmaker', 'technician'], isCore: true },
  'admin': { component: AdminPanel, icon: ShieldCheck, title: 'Access Control', roles: ['admin'], isCore: true },
  'ziklag': { component: ZiklagTools, icon: Server, title: 'Ziklag Diagnostics', roles: ['admin', 'technician'], isCore: false },
  'clothing': { component: ClothingBrandPack, icon: Shirt, title: 'Clothing Brand', roles: ['admin'], isCore: false },
  'hardware': { component: HardwarePack, icon: Cpu, title: 'Hardware', roles: ['admin'], isCore: false },
  'developer': { component: DeveloperPack, icon: Code, title: 'DevOps', roles: ['admin', 'technician'], isCore: false },
  'photography': { component: PhotographyPack, icon: Camera, title: 'Photography', roles: ['admin', 'filmmaker'], isCore: false },
  'plugin': { component: PluginSandbox, icon: Box, title: 'Plugin Sandbox', roles: ['admin'], isCore: false },
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
  const { currentUser, setCurrentUser, logout, windows, snapshots, performanceMode, setPerformanceMode, workspaceMode, setWorkspaceMode, activeWorkspace, setActiveWorkspace, installedApps, recentApps, openWindow, minimizeWindow, focusWindow, applyWorkspaceLayout, loadProject, saveSnapshot, restoreSnapshot, wipeSession } = useOS();
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showActionCenter, setShowActionCenter] = useState(false);
  const [customApps, setCustomApps] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
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

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden flex flex-col font-sans select-none bg-black">
      <CommandPalette />
      
      {/* macOS Style Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop")' }} 
      />

      {/* OS Menu Bar */}
      <header className="h-7 flex items-center shrink-0 w-full bg-black/20 backdrop-blur-3xl border-b border-white/10 z-50 px-4 sticky top-0 text-[13px] font-medium text-white/90">
        <div className="flex items-center gap-6">
          <div className="font-bold text-white flex items-center gap-2 cursor-pointer">
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
            <button className="hover:text-white cursor-default">File</button>
            <button className="hover:text-white cursor-default">Edit</button>
            <button className="hover:text-white cursor-default">View</button>
            {isSuperUser && <button className="hover:text-white cursor-default" onClick={() => applyWorkspaceLayout('creative-split')}>Multi-View Workspace</button>}
            <button className="hover:text-white cursor-default" onClick={() => setShowSnapshots(!showSnapshots)}>Time Machine</button>
            
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
              className="text-white/90 cursor-pointer hover:text-white ml-2 focus:outline-none"
              onClick={() => setShowActionCenter(!showActionCenter)}
            >
              <OsClock />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area (Desktop) */}
      <main className="flex-1 relative z-10 w-full h-full overflow-hidden pointer-events-none">
        {/* Desktop Icons */}
        <div className="absolute top-4 right-4 flex flex-col gap-6 pointer-events-auto z-0">
          <div className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-[-12px] text-center">Projects</div>
          {Object.entries(PROJECTS).map(([id, project]) => {
             return (
               <button 
                 key={id} 
                 onClick={() => loadProject(id)}
                 className="flex flex-col items-center gap-1 group w-24 focus:outline-none"
               >
                 <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-lg">
                   <Folder className="w-8 h-8 text-blue-400 fill-blue-400" />
                 </div>
                 <div className="text-white text-xs font-medium text-center line-clamp-2 px-1 break-words drop-shadow-md group-focus:bg-blue-500/50 group-focus:px-2 group-focus:rounded flex items-center justify-center min-h-[32px]">
                   {project.title}
                 </div>
               </button>
             );
          })}
          <div className="w-12 h-px bg-white/10 mx-auto my-2" />
          <div className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-[-12px] text-center">Services</div>
          {Object.entries(SERVICES).map(([id, service]) => {
             const Icon = service.icon;
             return (
               <a 
                 key={id} 
                 href={service.url}
                 target="_blank"
                 rel="noopener noreferrer"
                 onClick={(e) => {
                   e.preventDefault();
                   openWindow('browser', `Web: ${service.title}`, { url: service.url });
                 }}
                 className="flex flex-col items-center gap-1 group w-24 outline-none border-none"
               >
                 <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-lg">
                   <Icon className={cn("w-8 h-8", service.color)} />
                 </div>
                 <div className="text-white text-xs font-medium text-center line-clamp-2 px-1 break-words drop-shadow-md group-focus:bg-blue-500/50 group-focus:px-2 group-focus:rounded flex items-center justify-center min-h-[32px]">
                   {service.title}
                 </div>
               </a>
             );
          })}
          {customApps.map((app) => {
             return (
               <a 
                 key={app.id} 
                 href={app.url}
                 target="_blank"
                 rel="noopener noreferrer"
                 onClick={(e) => {
                   e.preventDefault();
                   openWindow('browser', `Web: ${app.title}`, { url: app.url });
                 }}
                 className="flex flex-col items-center gap-1 group w-24 outline-none border-none"
               >
                 <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-lg relative">
                   {app.ownerId === currentUser.id && (
                     <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-black" title="Added by you"></div>
                   )}
                   <Globe className={cn("w-8 h-8", app.color || 'text-white')} />
                 </div>
                 <div className="text-white text-xs font-medium text-center line-clamp-2 px-1 break-words drop-shadow-md group-focus:bg-blue-500/50 group-focus:px-2 group-focus:rounded flex items-center justify-center min-h-[32px]">
                   {app.title}
                 </div>
               </a>
             );
          })}
          <button onClick={handleAddApp} className="flex flex-col items-center gap-1 group w-24 focus:outline-none">
             <div className="w-12 h-12 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 border-dashed flex items-center justify-center group-hover:bg-white/10 transition-colors">
               <Plus className="w-5 h-5 text-white/50 group-hover:text-white/80" />
             </div>
             <div className="text-white/50 text-[10px] font-medium text-center mt-1">Add App</div>
          </button>
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

      {/* macOS Style Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="flex items-end gap-3 px-3 py-2 bg-white/20 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-2xl pointer-events-auto">
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
                  )} />
                </button>
                {/* Active Indicator */}
                {isOpen && (
                  <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-white shadow-sm" />
                )}
                
                {/* Tooltip */}
                <div className="absolute -top-12 scale-0 group-hover:scale-100 transition-transform px-3 py-1 bg-black/60 backdrop-blur text-white text-xs font-medium rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50">
                  {config.title}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
