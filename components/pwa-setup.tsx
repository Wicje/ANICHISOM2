'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useBrowserStore } from '@/lib/stores/browser.store';
import { useFileStore } from '@/lib/stores/file.store';
import { OfflineStateService } from '@/lib/services/offline-state.service';
import { BackgroundSyncService } from '@/lib/services/background-sync.service';

export function PWASetup() {
  // ─── Register Service Worker ─────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Check for SW updates periodically
        const checkUpdate = () => reg.update();
        const interval = setInterval(checkUpdate, 60 * 60 * 1000); // hourly

        // Listen for SW waiting (new version available)
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // New SW activated — reload to pick up new assets
              window.location.reload();
            }
          });
        });

        return () => clearInterval(interval);
      })
      .catch(() => {
        // SW registration failed — app still works without PWA
      });
  }, []);

  // ─── Restore Offline State ───────────────────────────────
  useEffect(() => {
    const restoreState = async () => {
      const snapshot = await OfflineStateService.loadSnapshot();
      if (!snapshot) return;

      // Restore Zustand stores from snapshot
      try {
        if (snapshot.auth.currentUser) {
          useAuthStore.setState({ currentUser: snapshot.auth.currentUser });
        }
        if (snapshot.theme) {
          useThemeStore.setState({
            wallpaper: snapshot.theme.wallpaper,
            themeColor: snapshot.theme.themeColor,
            fontFamily: snapshot.theme.fontFamily,
            screenShader: snapshot.theme.screenShader,
            performanceMode: snapshot.theme.performanceMode as any,
          });
        }
        if (snapshot.workspace) {
          useWorkspaceStore.setState({
            workspaceMode: snapshot.workspace.workspaceMode as any,
            workspaceId: snapshot.workspace.workspaceId || undefined,
            installedApps: snapshot.workspace.installedApps,
            recentApps: snapshot.workspace.recentApps,
          });
        }
        if (snapshot.browser) {
          useBrowserStore.setState({
            pinnedApps: snapshot.browser.pinnedApps,
            tabs: snapshot.browser.tabs,
          });
        }
        if (snapshot.file) {
          useFileStore.setState({
            currentSource: snapshot.file.currentSource as any,
            currentPath: snapshot.file.currentPath,
            connectedSources: snapshot.file.connectedSources as any,
          });
        }
      } catch {
        // Partial restore is fine — some stores may have changed shape
      }
    };

    restoreState();
  }, []);

  // ─── Save State Periodically + Before Unload ─────────────
  useEffect(() => {
    const getSnapshot = () => ({
      auth: { currentUser: useAuthStore.getState().currentUser },
      theme: {
        wallpaper: useThemeStore.getState().wallpaper,
        themeColor: useThemeStore.getState().themeColor,
        fontFamily: useThemeStore.getState().fontFamily,
        screenShader: useThemeStore.getState().screenShader,
        performanceMode: useThemeStore.getState().performanceMode,
      },
      workspace: {
        workspaceMode: useWorkspaceStore.getState().workspaceMode,
        workspaceId: useWorkspaceStore.getState().workspaceId,
        installedApps: useWorkspaceStore.getState().installedApps,
        recentApps: useWorkspaceStore.getState().recentApps,
      },
      browser: {
        pinnedApps: useBrowserStore.getState().pinnedApps,
        tabs: useBrowserStore.getState().tabs,
      },
      campaign: { boards: [] },
      file: {
        currentSource: useFileStore.getState().currentSource,
        currentPath: useFileStore.getState().currentPath,
        connectedSources: useFileStore.getState().connectedSources,
      },
    });

    // Save state periodically (every 30 seconds)
    const interval = setInterval(() => {
      OfflineStateService.saveSnapshot(getSnapshot());
    }, 30000);

    // Save on page unload
    const unregister = OfflineStateService.registerBeforeUnload(getSnapshot);

    return () => {
      clearInterval(interval);
      unregister();
    };
  }, []);

  // ─── Background Sync ─────────────────────────────────────
  useEffect(() => {
    const unregisterConnectivity = BackgroundSyncService.registerConnectivityListeners();
    return unregisterConnectivity;
  }, []);

  return null;
}
