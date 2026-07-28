'use client';

import React, { useMemo } from 'react';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Grid, Layers, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/lib/stores/notification.store';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { AppIcon } from '@/components/ui/app-icon';
import { getAllPlugins, isPluginActive } from '@/lib/plugin-registry';

const PINNED_APPS = ['terminal', 'files', 'browser', 'code', 'settings', 'store'];

interface DockProps {
  showLaunchpad: boolean;
  setShowLaunchpad: (v: boolean | ((p: boolean) => boolean)) => void;
  showMissionControl: boolean;
  setShowMissionControl: (v: boolean | ((p: boolean) => boolean)) => void;
}

export function Dock({ showLaunchpad, setShowLaunchpad, showMissionControl, setShowMissionControl }: DockProps) {
  const { currentUser } = useAuthStore();
  const { openWindow, focusWindow, minimizeWindow } = useWindowActions();
  const windows = useWindowStore((s) => s.windows);
  const highestZIndex = useWindowStore((s) => s.highestZIndex);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const unreadCount = useNotificationStore((s) => s.notifications.filter(n => !n.read).length);

  const activeWindows = useMemo(
    () => windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined),
    [windows, activeWorkspace]
  );

  // Dock shows: pinned apps + currently open apps (deduplicated)
  const dockApps = useMemo(() => {
    const openAppIds = new Set(activeWindows.map(w => w.appId));
    
    // Standard pinned apps
    const pinned = PINNED_APPS
      .map(id => APP_MANIFEST.find(app => app.id === id))
      .filter(Boolean) as typeof APP_MANIFEST;
      
    // Format custom apps to match APP_MANIFEST type
    const customAppsFormatted = useWorkspaceStore.getState().customWebApps.map(app => ({
      id: app.id,
      title: app.title,
      iconImage: app.iconImage,
      icon: Globe,
      roles: ['user', 'admin'],
      description: `Installed Web App: ${app.url}`,
      url: app.url // attach URL for onClick
    }));

    const combinedManifest = [...APP_MANIFEST, ...customAppsFormatted];
    
    // Open apps that are not in the pinned list
    const openNotPinned = combinedManifest.filter(app => openAppIds.has(app.id) && !PINNED_APPS.includes(app.id));
    
    return [...pinned, ...openNotPinned];
  }, [activeWindows]);

  const isAnyWindowMaximized = useMemo(
    () => activeWindows.some((w) => w.isMaximized && !w.isMinimized),
    [activeWindows]
  );

  if (!currentUser) return null;

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-[260] w-[80vw] h-20 flex flex-col items-center justify-end pointer-events-none group/dock">
      <nav 
        role="toolbar" 
        aria-label="Application dock" 
        className={cn(
          "flex items-end gap-3 px-3 py-2 glass-panel rounded-3xl shadow-2xl pointer-events-auto contain-layout relative mb-3 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]",
          isAnyWindowMaximized ? "translate-y-24 group-hover/dock:translate-y-0" : "translate-y-0"
        )}
      >
        {/* Green accent line at top of dock */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[2px] rounded-full bg-[var(--os-primary)] opacity-60" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[var(--os-bg)]" />
        )}
        <div className="relative group flex flex-col items-center justify-end">
          <button
            aria-label="Launchpad"
            onClick={() => setShowLaunchpad(prev => {
              if (!prev) setShowMissionControl(false);
              return !prev;
            })}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 transform origin-bottom hover:scale-125 hover:mx-2"
            style={{ background: 'var(--os-hover)' }}
          >
            <Grid className="w-7 h-7" style={{ color: 'var(--os-text)' }} aria-hidden="true" />
          </button>
          <div role="tooltip" className="absolute -top-12 scale-0 group-hover:scale-100 transition-transform px-3 py-1 glass-panel text-xs font-medium rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50" style={{ color: 'var(--os-text)' }}>Launchpad</div>
        </div>
        <div className="relative group flex flex-col items-center justify-end">
          <button
            aria-label="Mission Control"
            onClick={() => setShowMissionControl(prev => {
              if (!prev) setShowLaunchpad(false);
              return !prev;
            })}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 transform origin-bottom hover:scale-125 hover:mx-2"
            style={{ background: 'var(--os-hover)' }}
          >
            <Layers className="w-7 h-7" style={{ color: 'var(--os-text)' }} aria-hidden="true" />
          </button>
          <div role="tooltip" className="absolute -top-12 scale-0 group-hover:scale-100 transition-transform px-3 py-1 glass-panel text-xs font-medium rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50" style={{ color: 'var(--os-text)' }}>Mission Control</div>
        </div>
        <div className="w-px h-10 mx-1" style={{ background: 'var(--os-border)' }}></div>

        {dockApps.map(app => {
          const isOpen = activeWindows.some(w => w.appId === app.id);
          const isFocused = activeWindows.some(w => w.appId === app.id && !w.isMinimized && w.zIndex >= highestZIndex);

          return (
            <div key={app.id} className="relative group flex flex-col items-center justify-end">
              <button
                aria-label={app.title}
                onClick={() => {
                  const existingWindow = activeWindows.find(w => w.appId === app.id);
                  if (existingWindow) {
                    if (existingWindow.isMinimized || !isFocused) {
                      focusWindow(existingWindow.id);
                    } else {
                      minimizeWindow(existingWindow.id);
                    }
                  } else {
                    if ((app as any).url) {
                      openWindow('web-app', app.title, { url: (app as any).url });
                    } else {
                      openWindow(app.id);
                    }
                  }
                }}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 transform origin-bottom hover:scale-125 hover:mx-2"
                style={{
                  background: isOpen ? 'var(--os-active)' : 'var(--os-hover)',
                }}
              >
                <AppIcon icon={app.icon} iconImage={app.iconImage} className="w-7 h-7" aria-hidden="true" />
              </button>
              {isOpen && (
                <span aria-hidden="true" className="absolute -bottom-1.5 w-1 h-1 rounded-full shadow-sm" style={{ background: 'var(--os-text)' }} />
              )}
              <div role="tooltip" className="absolute -top-12 scale-0 group-hover:scale-100 transition-transform px-3 py-1 glass-panel text-xs font-medium rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50" style={{ color: 'var(--os-text)' }}>
                {app.title}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
