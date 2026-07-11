'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { APP_MANIFEST, resolveAppComponent, getManifestEntry } from '@/lib/app-manifest';
import { WindowFrame } from '@/components/window-frame';
import { subscribe, getAllPlugins, loadInstallStates, registerBuiltinPlugins, persistInstallStates } from '@/lib/plugin-registry';

const MemoizedWindow = React.memo(
  ({ win, AppComponent }: { win: any; AppComponent: React.ComponentType<any> }) => {
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
  const { currentUser } = useAuthStore();
  const { windows } = useWindowStore();
  const { wallpaper, themeColor, fontFamily, screenShader } = useThemeStore();
  const { recentApps, addRecentApp } = useWorkspaceStore();
  const openWindow = useWindowStore((s) => s.openWindow);
  const [registryVersion, setRegistryVersion] = useState(0);
  const [componentCache, setComponentCache] = useState<Map<string, React.ComponentType<any>>>(new Map());

  useEffect(() => {
    loadInstallStates();
    registerBuiltinPlugins(Object.keys(APP_MANIFEST.reduce((acc, app) => ({ ...acc, [app.id]: true }), {})));
  }, []);

  useEffect(() => {
    const unsub = subscribe(() => {
      setRegistryVersion((v) => v + 1);
      persistInstallStates();
    });
    return unsub;
  }, []);

  // Resolve components for open windows
  useEffect(() => {
    const uncached = windows
      .map((w) => w.appId)
      .filter((id) => !componentCache.has(id));

    if (uncached.length === 0) return;

    const load = async () => {
      const newEntries = new Map(componentCache);
      for (const appId of uncached) {
        if (newEntries.has(appId)) continue;
        const component = await resolveAppComponent(appId);
        if (component) newEntries.set(appId, component);
      }
      setComponentCache(newEntries);
    };
    load();
  }, [windows, componentCache]);

  const visibleWindows = useMemo(
    () => windows.filter((w) => !w.isMinimized),
    [windows]
  );

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: wallpaper,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily,
      }}
    >
      {screenShader !== 'none' && (
        <div className={`absolute inset-0 pointer-events-none z-50 ${screenShader}`} />
      )}

      {visibleWindows.map((win) => {
        const AppComponent = componentCache.get(win.appId);
        if (!AppComponent) return null;
        return <MemoizedWindow key={win.id} win={win} AppComponent={AppComponent} />;
      })}

      {/* Desktop icons / dock would go here — delegated to DesktopShell */}
    </div>
  );
}
