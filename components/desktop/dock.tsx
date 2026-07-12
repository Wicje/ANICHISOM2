'use client';

import React from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Grid, Layers, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { getAllPlugins, isPluginActive } from '@/lib/plugin-registry';

interface DockProps {
  showLaunchpad: boolean;
  setShowLaunchpad: (v: boolean | ((p: boolean) => boolean)) => void;
  showMissionControl: boolean;
  setShowMissionControl: (v: boolean | ((p: boolean) => boolean)) => void;
}

export function Dock({ showLaunchpad, setShowLaunchpad, showMissionControl, setShowMissionControl }: DockProps) {
  const { currentUser } = useAuthStore();
  const windows = useWindowStore((s) => s.windows);
  const openWindow = useWindowStore((s) => s.openWindow);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const highestZIndex = useWindowStore((s) => s.highestZIndex);
  const { activeWorkspace, installedApps, recentApps } = useWorkspaceStore();

  if (!currentUser) return null;

  const allowedApps = APP_MANIFEST.filter(app =>
    app.roles.includes(currentUser.role) && (app.isCore || installedApps.includes(app.id) || isPluginActive(app.id))
  );

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[260] pointer-events-none">
      <nav role="toolbar" aria-label="Application dock" className="flex items-end gap-3 px-3 py-2 glass-panel rounded-3xl shadow-2xl pointer-events-auto contain-layout">
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

        {allowedApps.filter(app => {
          return app.isCore || installedApps.includes(app.id);
        }).map(app => {
          const activeWindows = windows.filter(w => w.workspace === activeWorkspace || w.workspace === undefined);
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
                    openWindow(app.id);
                  }
                }}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 transform origin-bottom hover:scale-125 hover:mx-2"
                style={{
                  background: isOpen ? 'var(--os-active)' : 'var(--os-hover)',
                }}
              >
                <app.icon className="w-7 h-7" style={{ color: 'var(--os-text)' }} aria-hidden="true" />
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
