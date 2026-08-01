'use client';

import React, { useMemo } from 'react';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Grid, Layers, Folder, Globe } from 'lucide-react';
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

  const [mouseX, setMouseX] = React.useState<number | null>(null);
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);

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

  const getMagneticTransform = (index: number) => {
    if (mouseX === null || !itemRefs.current[index]) {
      return { scale: 1, translateX: 0, translateY: 0 };
    }
    const rect = itemRefs.current[index]?.getBoundingClientRect();
    if (!rect) return { scale: 1, translateX: 0, translateY: 0 };

    const itemCenterX = rect.left + rect.width / 2;
    const distance = Math.abs(mouseX - itemCenterX);

    // AriseUI Gaussian magnetic curve
    const maxScale = 0.35; // 1.35x max magnification
    const distanceSigma = 90; // Proximity threshold in px
    const scale = 1 + maxScale * Math.exp(-Math.pow(distance, 2) / (2 * Math.pow(distanceSigma, 2)));

    // Magnetic pull toward cursor X axis
    const maxTranslate = 8;
    const translateX = Math.min(Math.max((mouseX - itemCenterX) * 0.15 * Math.exp(-Math.pow(distance, 2) / (2 * Math.pow(120, 2))), -maxTranslate), maxTranslate);
    const translateY = (scale - 1) * -14; // Lift upward as it magnifies

    return { scale, translateX, translateY };
  };

  if (!currentUser) return null;

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-[260] w-[90vw] max-w-6xl h-24 flex flex-col items-center justify-end pointer-events-none group/dock">
      <nav 
        role="toolbar" 
        aria-label="Application dock" 
        onMouseMove={(e) => setMouseX(e.clientX)}
        onMouseLeave={() => setMouseX(null)}
        className={cn(
          "flex items-end gap-3 px-4 py-3 glass-panel rounded-3xl shadow-2xl pointer-events-auto contain-layout relative mb-3 transition-all duration-200 ease-out border border-white/15 bg-neutral-950/75 backdrop-blur-2xl",
          isAnyWindowMaximized ? "translate-y-28 group-hover/dock:translate-y-0" : "translate-y-0"
        )}
      >
        {/* Green accent line at top of dock */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[2px] rounded-full bg-[var(--os-primary)] opacity-80" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-[var(--os-bg)] animate-pulse" />
        )}

        {/* Launchpad */}
        {(() => {
          const { scale, translateX, translateY } = getMagneticTransform(0);
          return (
            <div 
              ref={(el) => { itemRefs.current[0] = el; }} 
              className="relative group flex flex-col items-center justify-end transition-transform duration-100 ease-out"
              style={{
                transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                transformOrigin: 'bottom center',
              }}
            >
              <button
                aria-label="Launchpad"
                onClick={() => setShowLaunchpad(prev => {
                  if (!prev) setShowMissionControl(false);
                  return !prev;
                })}
                className="flex flex-col items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-2xl transition-colors duration-200 p-2.5 shadow-xl bg-white/5 hover:bg-white/15 border border-white/10"
              >
                <Grid className="w-9 h-9 text-white/90" aria-hidden="true" />
              </button>
              <div role="tooltip" className="absolute -top-14 scale-0 group-hover:scale-100 transition-transform px-3 py-1.5 glass-panel text-xs font-semibold rounded-xl shadow-xl pointer-events-none whitespace-nowrap z-50 text-white">Launchpad</div>
            </div>
          );
        })()}

        {/* Mission Control */}
        {(() => {
          const { scale, translateX, translateY } = getMagneticTransform(1);
          return (
            <div 
              ref={(el) => { itemRefs.current[1] = el; }} 
              className="relative group flex flex-col items-center justify-end transition-transform duration-100 ease-out"
              style={{
                transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                transformOrigin: 'bottom center',
              }}
            >
              <button
                aria-label="Mission Control"
                onClick={() => setShowMissionControl(prev => {
                  if (!prev) setShowLaunchpad(false);
                  return !prev;
                })}
                className="flex flex-col items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-2xl transition-colors duration-200 p-2.5 shadow-xl bg-white/5 hover:bg-white/15 border border-white/10"
              >
                <Layers className="w-9 h-9 text-white/90" aria-hidden="true" />
              </button>
              <div role="tooltip" className="absolute -top-14 scale-0 group-hover:scale-100 transition-transform px-3 py-1.5 glass-panel text-xs font-semibold rounded-xl shadow-xl pointer-events-none whitespace-nowrap z-50 text-white">Mission Control</div>
            </div>
          );
        })()}

        <div className="w-px h-12 mx-1 bg-white/15" />

        {/* Dock Apps */}
        {dockApps.map((app, idx) => {
          const itemIndex = idx + 2; // Offset for Launchpad & Mission Control
          const { scale, translateX, translateY } = getMagneticTransform(itemIndex);
          const isOpen = activeWindows.some(w => w.appId === app.id);
          const isFocused = activeWindows.some(w => w.appId === app.id && !w.isMinimized && w.zIndex >= highestZIndex);

          return (
            <div 
              key={app.id} 
              ref={(el) => { itemRefs.current[itemIndex] = el; }}
              className="relative group flex flex-col items-center justify-end transition-transform duration-100 ease-out"
              style={{
                transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                transformOrigin: 'bottom center',
              }}
            >
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
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-2xl transition-colors duration-200 p-2 shadow-xl border border-white/10",
                  isOpen ? "bg-white/15 border-cyan-400/40" : "bg-white/5 hover:bg-white/15"
                )}
              >
                <AppIcon icon={app.icon} iconImage={app.iconImage} className="w-10 h-10 sm:w-11 sm:h-11 drop-shadow-xl" aria-hidden="true" />
              </button>
              {isOpen && (
                <span aria-hidden="true" className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#10F4A0] shadow-sm shadow-[#10F4A0]/50" />
              )}
              <div role="tooltip" className="absolute -top-14 scale-0 group-hover:scale-100 transition-transform px-3 py-1.5 glass-panel text-xs font-semibold rounded-xl shadow-xl pointer-events-none whitespace-nowrap z-50 text-white">{app.title}</div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
