'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { usePrivacyStore } from '@/lib/stores/privacy.store';
import { APP_MANIFEST, resolveAppComponent } from '@/lib/app-manifest';
import { subscribe, getAllPlugins, loadInstallStates, registerBuiltinPlugins, persistInstallStates, isPluginActive, PluginManifest } from '@/lib/plugin-registry';
import { WindowFrame } from '@/components/window-frame';
import { CommandPalette } from '@/components/command-palette';
import { FS, LocalFile } from '@/lib/fs';

import { Toaster, toast } from 'sonner';
import { Skeleton, CardSkeleton, PageSkeleton, BootSplash } from '@/components/ui/skeleton';
import { AnimatePresence, motion } from 'motion/react';
import { MenuBar } from './menu-bar';
import { Dock } from './dock';
import { WindowSwitcher } from './window-switcher';
import { DesktopIcons } from './desktop-icons';
import { WidgetsLayer, Widget } from './widgets';
import { LoginScreen } from '@/components/login-screen';
import FeedbackWidget from '@/components/apps/feedback-widget';
import { useOnboardingStore } from '@/lib/stores/onboarding.store';
import { useNotificationStore } from '@/lib/stores/notification.store';

const Launchpad = React.lazy(() => import('./launchpad').then(m => ({ default: m.Launchpad })));
const MissionControl = React.lazy(() => import('./mission-control').then(m => ({ default: m.MissionControl })));
const ControlCenter = React.lazy(() => import('./control-center').then(m => ({ default: m.ControlCenter })));
const LockScreen = React.lazy(() => import('./lock-screen').then(m => ({ default: m.LockScreen })));
const ContextMenu = React.lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenu })));
const SnapshotsMenu = React.lazy(() => import('./snapshots-menu').then(m => ({ default: m.SnapshotsMenu })));
const NotchNook = React.lazy(() => import('@/components/dock/notch-nook').then(m => ({ default: m.NotchNook })));
const WidgetStack = React.lazy(() => import('@/components/notifications/widget-stack').then(m => ({ default: m.WidgetStack })));
const OnboardingWizard = React.lazy(() => import('@/components/apps/onboarding-wizard'));
type ContextMenuItem = import('./context-menu').ContextMenuItem;

function AppLoadingSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--os-surface)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--os-primary)', borderTopColor: 'transparent' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--os-text-muted)' }}>Loading...</span>
      </div>
    </div>
  );
}

function AppCrashFallback({ appId, onRetry }: { appId: string; onRetry: () => void }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--os-surface)' }}>
      <div className="flex flex-col items-center gap-3 text-center max-w-xs">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
          <span className="text-red-500 text-lg font-bold">!</span>
        </div>
        <span className="text-sm font-medium" style={{ color: 'var(--os-text)' }}>App crashed</span>
        <span className="text-xs" style={{ color: 'var(--os-text-muted)' }}>{appId}</span>
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{ background: 'var(--os-hover)', color: 'var(--os-text)' }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

class WindowErrorBoundary extends React.Component<
  { children: React.ReactNode; appId: string; onRetry: () => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[App:${this.props.appId}] crashed:`, error, info.componentStack);
    // Auto-retry once after a short delay
    if (this.state.retryCount < 1) {
      setTimeout(() => {
        this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
      }, 500);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.retryCount < 1) {
        return (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--os-surface)' }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--os-primary)', borderTopColor: 'transparent' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--os-text-muted)' }}>Reloading...</span>
            </div>
          </div>
        );
      }
      return <AppCrashFallback appId={this.props.appId} onRetry={() => {
        this.setState({ hasError: false, error: null, retryCount: 0 });
        this.props.onRetry();
      }} />;
    }
    return this.props.children;
  }
}

const MemoizedWindow = React.memo(
  ({ win, AppComponent, onRetry }: { win: any; AppComponent: React.ComponentType<any>; onRetry: () => void }) => {
    return (
      <WindowFrame osWindow={win}>
        <WindowErrorBoundary appId={win.appId} onRetry={onRetry}>
          <AppComponent window={win} />
        </WindowErrorBoundary>
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
      prev.win.data?.fileId === next.win.data?.fileId &&
      prev.AppComponent === next.AppComponent
    );
  }
);

export { APP_MANIFEST as APPS } from '@/lib/app-manifest';

export function Desktop() {
  const { currentUser, logout, wipeSession, checkSession, sessionChecked } = useAuthStore();
  const windows = useWindowStore((s) => s.windows);
  const openWindow = useWindowStore((s) => s.openWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const highestZIndex = useWindowStore((s) => s.highestZIndex);
  const applyWorkspaceLayout = useWindowStore((s) => s.applyWorkspaceLayout);
  // Granular theme selectors — only re-render Desktop when these specific values change
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const themeColor = useThemeStore((s) => s.themeColor);
  const fontFamily = useThemeStore((s) => s.fontFamily);
  const screenShader = useThemeStore((s) => s.screenShader);
  const performanceMode = useThemeStore((s) => s.performanceMode);
  const setPerformanceMode = useThemeStore((s) => s.setPerformanceMode);
  const colorMode = useThemeStore((s) => s.colorMode);
  const setColorMode = useThemeStore((s) => s.setColorMode);
  const hydrateColorMode = useThemeStore((s) => s.hydrateColorMode);
  // Granular workspace selectors
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const installedApps = useWorkspaceStore((s) => s.installedApps);
  const recentApps = useWorkspaceStore((s) => s.recentApps);
  const getAppPrivacy = usePrivacyStore((s) => s.getAppPrivacy);
  const { onboarding } = useOnboardingStore();

  const [isLocked, setIsLocked] = useState(false);
  const [showLaunchpad, setShowLaunchpad] = useState(false);
  const [showMissionControl, setShowMissionControl] = useState(false);
  const [showControlCenter, setShowControlCenter] = useState(false);
  const [showNotchNook, setShowNotchNook] = useState(false);
  const [showWidgetStack, setShowWidgetStack] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [switcherIndex, setSwitcherIndex] = useState(0);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: 'w1', type: 'notes', x: 40, y: 80, content: 'Finish the new brand guidelines by Friday.' }
  ]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [registryVersion, setRegistryVersion] = useState(0);
  const componentCacheRef = useRef<Map<string, React.ComponentType<any>>>(new Map());
  const failedImportsRef = useRef<Set<string>>(new Set());
  const [componentCacheVersion, setComponentCacheVersion] = useState(0);
  const [booting, setBooting] = useState(true);

  // Initialize plugin registry + check Supabase session
  useEffect(() => {
    loadInstallStates();
    const allAppIds = APP_MANIFEST.map(a => a.id);
    registerBuiltinPlugins(allAppIds);
    (useOnboardingStore as any).hydrate?.();
    hydrateColorMode();
    checkSession();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Sync colorMode to document.documentElement
  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorMode === 'dark');
  }, [colorMode]);

  // Sync performanceMode to body class for CSS-level performance optimizations
  useEffect(() => {
    document.body.classList.toggle('performance-light', performanceMode === 'light');
  }, [performanceMode]);

  // Wire os:notify custom events → in-app toasts
  useEffect(() => {
    const handleNotify = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const title = detail?.title || 'Notification';
      const description = detail?.description;
      const type = detail?.type || 'info';
      const addNotification = useNotificationStore.getState().addNotification;
      addNotification(title, type, description);
      if (type === 'error') {
        toast.error(title, { description });
      } else if (type === 'success') {
        toast.success(title, { description });
      } else if (type === 'warning') {
        toast.warning(title, { description });
      } else {
        toast.info(title, { description });
      }
    };
    window.addEventListener('os:notify', handleNotify);
    return () => window.removeEventListener('os:notify', handleNotify);
  }, []);

  useEffect(() => {
    const unsub = subscribe(() => {
      setRegistryVersion(v => v + 1);
      persistInstallStates();
    });
    return unsub;
  }, []);

  // Resolve components for open windows (uses ref to avoid stale closure / re-trigger loop)
  useEffect(() => {
    const uncached = windows
      .map(w => w.appId)
      .filter(id => !componentCacheRef.current.has(id) && !failedImportsRef.current.has(id));

    if (uncached.length === 0) return;

    const load = async () => {
      let changed = false;
      for (const appId of uncached) {
        if (componentCacheRef.current.has(appId)) continue;
        try {
          const component = await resolveAppComponent(appId);
          if (component) {
            componentCacheRef.current.set(appId, component);
            changed = true;
          } else {
            failedImportsRef.current.add(appId);
          }
        } catch (err) {
          console.error(`[Desktop] Failed to load app "${appId}":`, err);
          // Auto-retry once after a short delay for transient failures
          if (!failedImportsRef.current.has(`retry:${appId}`)) {
            failedImportsRef.current.add(`retry:${appId}`);
            setTimeout(() => {
              failedImportsRef.current.delete(`retry:${appId}`);
              setComponentCacheVersion(v => v + 1);
            }, 1000);
          } else {
            failedImportsRef.current.add(appId);
          }
        }
      }
      if (changed) setComponentCacheVersion(v => v + 1);
    };
    load();
  }, [windows]);

  // Build merged apps (manifest + plugins)
  const mergedApps = useMemo(() => {
    const merged: Record<string, { id: string; title: string; icon: React.ComponentType<any>; category: string; isCore: boolean; roles: string[] }> = {};

    APP_MANIFEST.forEach(app => {
      merged[app.id] = app;
    });

    getAllPlugins().forEach(plugin => {
      if (!merged[plugin.id]) {
        merged[plugin.id] = {
          id: plugin.id,
          title: plugin.name,
          icon: plugin.component || (() => null),
          category: plugin.category,
          isCore: plugin.isCore || false,
          roles: plugin.roles || ['admin'],
        };
      } else {
        merged[plugin.id] = { ...merged[plugin.id]!, title: plugin.name };
      }
    });

    return merged;
  }, [registryVersion]);

  // Visible windows with privacy filtering
  const visibleWindows = useMemo(() => {
    return windows.filter(w => {
      if (w.isMinimized) return false;
      if (w.workspace !== activeWorkspace && w.workspace !== undefined) return false;
      const privacy = getAppPrivacy(w.appId);
      if (privacy.level === 'restricted' && currentUser) {
        const isOwner = w.data?.ownerUserId === currentUser.id || w.data?.ownerUserId === undefined;
        if (!isOwner && privacy.allowedUserIds && !privacy.allowedUserIds.includes(currentUser.id)) {
          return false;
        }
      }
      return true;
    });
  }, [windows, activeWorkspace, getAppPrivacy, currentUser]);

  // Keyboard shortcuts — use refs for values that change often to avoid re-registering listeners
  const windowsRef = useRef(windows);
  windowsRef.current = windows;
  const activeWorkspaceRef = useRef(activeWorkspace);
  activeWorkspaceRef.current = activeWorkspace;
  const highestZIndexRef = useRef(highestZIndex);
  highestZIndexRef.current = highestZIndex;

  useEffect(() => {
    let currentKeybinds: Record<string, string> = {
      'alt+t': 'open:terminal',
      'alt+f': 'open:files',
      'alt+b': 'open:browser',
      'alt+c': 'open:code',
      'ctrl+space': 'action:launchpad',
      'ctrl+w': 'action:close-active-window',
      'ctrl+m': 'action:minimize-active-window',
      'alt+n': 'action:notch-nook',
      'alt+w': 'action:widget-stack',
    };

    import('@/lib/fs').then(({ FS }) => {
      FS.read('.config/anichisom.json').then(file => {
        if (file && file.content) {
          try {
            currentKeybinds = JSON.parse(file.content).keybinds || currentKeybinds;
          } catch (e) { /* ignore */ }
        }
      });
    });

    const handleConfigUpdate = (e: any) => {
      currentKeybinds = e.detail?.keybinds || currentKeybinds;
    };
    window.addEventListener('os:config-updated', handleConfigUpdate);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const curWindows = windowsRef.current;
      const curWorkspace = activeWorkspaceRef.current;
      const curZIndex = highestZIndexRef.current;

      // Ctrl+Tab window switcher
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        setShowSwitcher(true);
        setSwitcherIndex(prev => {
          const activeW = curWindows.filter(w => w.workspace === curWorkspace || w.workspace === undefined);
          if (activeW.length === 0) return 0;
          return (prev + 1) % activeW.length;
        });
        return;
      }

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
          const activeW = curWindows.filter(w => w.workspace === curWorkspace || w.workspace === undefined);
          const focused = activeW.find(w => !w.isMinimized && w.zIndex >= curZIndex);
          if (focused) closeWindow(focused.id);
        } else if (action === 'action:minimize-active-window') {
          const activeW = curWindows.filter(w => w.workspace === curWorkspace || w.workspace === undefined);
          const focused = activeW.find(w => !w.isMinimized && w.zIndex >= curZIndex);
          if (focused) minimizeWindow(focused.id);
        } else if (action === 'action:notch-nook') {
          setShowNotchNook(prev => !prev);
        } else if (action === 'action:widget-stack') {
          setShowWidgetStack(prev => !prev);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Tab') {
        if (!e.ctrlKey) {
          setShowSwitcher(false);
          setSwitcherIndex(currentIdx => {
            const curWindows = windowsRef.current;
            const curWorkspace = activeWorkspaceRef.current;
            const activeW = curWindows.filter(w => w.workspace === curWorkspace || w.workspace === undefined);
            if (activeW.length > 0 && currentIdx < activeW.length) {
              focusWindow(activeW[currentIdx]!.id);
            }
            return 0;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const handleNotchNookToggle = () => setShowNotchNook(prev => !prev);
    const handleWidgetStackToggle = () => setShowWidgetStack(prev => !prev);
    window.addEventListener('os:toggle-notch-nook', handleNotchNookToggle);
    window.addEventListener('os:toggle-widget-stack', handleWidgetStackToggle);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('os:config-updated', handleConfigUpdate);
      window.removeEventListener('os:toggle-notch-nook', handleNotchNookToggle);
      window.removeEventListener('os:toggle-widget-stack', handleWidgetStackToggle);
    };
  }, [openWindow, closeWindow, minimizeWindow, focusWindow]);

  // Idle timer for lock screen (5 min)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetIdle = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsLocked(true), 5 * 60 * 1000);
    };
    const throttledReset = (() => {
      let lastCall = 0;
      return () => {
        const now = Date.now();
        if (now - lastCall > 1000) {
          lastCall = now;
          resetIdle();
        }
      };
    })();
    window.addEventListener('mousemove', throttledReset);
    window.addEventListener('keydown', throttledReset);
    resetIdle();
    return () => {
      window.removeEventListener('mousemove', throttledReset);
      window.removeEventListener('keydown', throttledReset);
      clearTimeout(timeout);
    };
  }, []);

  // MCP Bridge
  useEffect(() => {
    if (!currentUser) return;
    let mcpSocket: any = null;
    import('socket.io-client').then(async ({ io }) => {
      try {
        const tokenRes = await fetch('/api/auth/socket-token');
        if (!tokenRes.ok) return;
        const { token } = await tokenRes.json();
        mcpSocket = io({ path: '/api/socketio', auth: { token } });
        mcpSocket.on('connect_error', (err: any) => {
          console.warn('[MCP] WS auth failed:', err.message);
        });
        mcpSocket.on('mcp-request', async (req: any) => {
          try {
            if (req.method === 'openWindow') {
              openWindow(req.params.appId, req.params.title, req.params.data);
              mcpSocket.emit('mcp-response', { id: req.id, success: true });
            } else if (req.method === 'readFS') {
              const file = await FS.read(req.params.path);
              mcpSocket.emit('mcp-response', { id: req.id, success: true, result: file?.content || '' });
            } else if (req.method === 'writeFS') {
              await FS.write(req.params.path, req.params.content);
              mcpSocket.emit('mcp-response', { id: req.id, success: true });
            }
          } catch (err: any) {
            mcpSocket.emit('mcp-response', { id: req.id, success: false, error: err.message });
          }
        });
      } catch (wsErr) {
        console.warn('[MCP] Failed to get WS auth token:', wsErr);
      }
    });
    return () => {
      if (mcpSocket) mcpSocket.disconnect();
    };
  }, [currentUser, openWindow]);

  // Context menu
  const handleGlobalContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'New Folder', icon: Folder, onClick: () => console.log('New Folder') },
        { label: 'Change Wallpaper', onClick: () => openWindow('settings') },
        { label: 'Add Sticky Note', icon: StickyNote, onClick: () => setWidgets(prev => [...prev, { id: Date.now().toString(), type: 'notes', x: e.clientX, y: e.clientY, content: '' }]) },
        { label: 'Add CPU Monitor', icon: Activity, onClick: () => setWidgets(prev => [...prev, { id: Date.now().toString(), type: 'cpu', x: e.clientX, y: e.clientY }]) },
      ]
    });
  }, [openWindow]);

  // Drag-drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]!;
      try {
        await FS.write(`Desktop/${file.name}`, file, file.type);
        alert(`File ${file.name} saved to Desktop via OS File System.`);
      } catch (err) {
        console.error('File drop failed', err);
      }
    }
  }, []);

  // Install onboarding-selected apps once user is authenticated
  const onboardingAppsInstalledRef = React.useRef(false);

  useEffect(() => {
    if (onboarding.completed && currentUser && !onboardingAppsInstalledRef.current) {
      onboardingAppsInstalledRef.current = true;
      const appsToInstall = onboarding.selectedApps;
      if (appsToInstall.length > 0) {
        appsToInstall.forEach((appId) => {
          useWorkspaceStore.getState().installApp(appId);
        });
        setTimeout(() => {
          const firstApp = appsToInstall[0];
          if (firstApp) {
            useWindowStore.getState().openWindow(firstApp, undefined, undefined, useWorkspaceStore.getState().activeWorkspace);
          }
        }, 300);
      }
    }
  }, [onboarding.completed, currentUser, onboarding.selectedApps]);

  if (booting || !sessionChecked) {
    return (
      <AnimatePresence>
        <motion.div
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BootSplash />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!currentUser) {
    return (
      <div className="fixed inset-0 w-full h-full overflow-hidden flex flex-col font-sans select-none">
        {!onboarding.completed && <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--os-text-muted)' }} /></div>}><OnboardingWizard /></Suspense>}
        {onboarding.completed && <LoginScreen />}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden flex flex-col font-sans select-none"
      style={{ fontFamily }}
      onClick={() => setContextMenu(null)}
      onContextMenu={handleGlobalContextMenu}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={handleDrop}
    >
      {isLocked && <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--os-text-muted)' }} /></div>}><LockScreen onUnlock={() => setIsLocked(false)} /></Suspense>}

      <style>{`
        :root { --color-neon-blue: ${themeColor}; }
        ${screenShader === 'contrast' ? 'body { filter: contrast(1.25) saturate(1.2); }' : ''}
      `}</style>

      {screenShader === 'crt' && <div className="pointer-events-none absolute inset-0 z-[200] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay"></div>}
      {screenShader === 'warm' && <div className="pointer-events-none absolute inset-0 z-[200] bg-orange-500/10 mix-blend-multiply"></div>}
      {screenShader === 'matrix' && <div className="pointer-events-none absolute inset-0 z-[200] bg-green-500/10 mix-blend-color"></div>}

      <CommandPalette />

      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{ backgroundImage: `url("${wallpaper}")` }}
      />

      <MenuBar
        showLaunchpad={showLaunchpad}
        setShowLaunchpad={setShowLaunchpad}
        showControlCenter={showControlCenter}
        setShowControlCenter={setShowControlCenter}
        setShowMissionControl={setShowMissionControl}
        showSnapshots={showSnapshots}
        setShowSnapshots={setShowSnapshots}
        applyWorkspaceLayout={applyWorkspaceLayout}
        performanceMode={performanceMode}
        setPerformanceMode={setPerformanceMode}
        logout={logout}
        wipeSession={wipeSession}
      />

      {showControlCenter && <Suspense fallback={<PageSkeleton />}><ControlCenter onClose={() => setShowControlCenter(false)} /></Suspense>}

      <main className="flex-1 relative z-10 w-full h-full overflow-hidden pointer-events-none">
        <DesktopIcons />
        <WidgetsLayer widgets={widgets} setWidgets={setWidgets} />

        {showSnapshots && <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--os-text-muted)' }} /></div>}><SnapshotsMenu onClose={() => setShowSnapshots(false)} /></Suspense>}

        {visibleWindows.map(win => {
          const AppComponent = componentCacheRef.current.get(win.appId);
          if (!AppComponent) {
            if (failedImportsRef.current.has(win.appId)) {
              return (
                <WindowFrame key={`failed-${win.id}`} osWindow={win}>
                  <AppCrashFallback
                    appId={win.appId}
                    onRetry={() => {
                      failedImportsRef.current.delete(win.appId);
                      componentCacheRef.current.delete(win.appId);
                      setComponentCacheVersion(v => v + 1);
                    }}
                  />
                </WindowFrame>
              );
            }
            return <AppLoadingSkeleton key={`loading-${win.id}`} />;
          }
          return (
            <MemoizedWindow
              key={win.id}
              win={win}
              AppComponent={AppComponent}
              onRetry={() => {
                componentCacheRef.current.delete(win.appId);
                setComponentCacheVersion(v => v + 1);
              }}
            />
          );
        })}
      </main>

      {showSwitcher && <WindowSwitcher switcherIndex={switcherIndex} />}
      {showLaunchpad && <Suspense fallback={<CardSkeleton />}><Launchpad onClose={() => setShowLaunchpad(false)} /></Suspense>}
      {showMissionControl && <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--os-text-muted)' }} /></div>}><MissionControl onClose={() => setShowMissionControl(false)} /></Suspense>}
      {showNotchNook && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[300]">
          <Suspense fallback={<div className="flex items-center justify-center p-4"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--os-text-muted)' }} /></div>}><NotchNook /></Suspense>
        </div>
      )}
      {showWidgetStack && (
        <div className="absolute top-12 right-4 z-[300]">
          <Suspense fallback={<div className="flex items-center justify-center p-4"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--os-text-muted)' }} /></div>}><WidgetStack /></Suspense>
        </div>
      )}

      <Dock
        showLaunchpad={showLaunchpad}
        setShowLaunchpad={setShowLaunchpad}
        showMissionControl={showMissionControl}
        setShowMissionControl={setShowMissionControl}
      />

      {contextMenu && (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--os-text-muted)' }} /></div>}>
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={() => setContextMenu(null)}
          />
        </Suspense>
      )}

      {isDraggingFile && (
        <div className="absolute inset-0 z-[9000] bg-blue-500/10 backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-3xl flex items-center justify-center pointer-events-none">
          <div className="bg-blue-500 text-white font-bold text-xl px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            Drop files to save to OS Desktop
          </div>
        </div>
      )}

      {!onboarding.completed && <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--os-text-muted)' }} /></div>}><OnboardingWizard /></Suspense>}
      {onboarding.completed && <FeedbackWidget />}

      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          className: 'backdrop-blur-xl border border-[var(--os-border)]',
          style: {
            background: 'var(--os-glass-bg)',
            color: 'var(--os-text)',
            borderColor: 'var(--os-border)',
          },
        }}
      />
    </div>
  );
}

function Folder({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>;
}

function StickyNote({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><polyline points="14 3 14 8 21 8"/></svg>;
}

function Activity({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>;
}
