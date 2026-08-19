'use client';

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useBrowserStore } from '@/lib/stores/browser.store';
import { useFileStore } from '@/lib/stores/file.store';
import { OfflineStateService } from '@/lib/services/offline-state.service';
import { BackgroundSyncService } from '@/lib/services/background-sync.service';
import { readDomain } from '@/lib/context-layer';
import { initVitals } from '@/lib/vitals';

export function PWASetup() {
  // ─── Initialize Web Vitals ──────────────────────────────
  useEffect(() => {
    initVitals();
  }, []);

  // ─── Register Service Worker (deferred to idle) ─────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const registerSW = () => {
      // True if the page is already controlled by a SW. A first-time install
      // (no controller yet) is NOT an "update" — hard-reloading then would
      // interrupt the boot sequence and any open native file picker for no
      // benefit (the new SW already claims clients via self.skipWaiting()).
      const hadController = !!navigator.serviceWorker.controller;

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
                // Never reload for the first install — only for genuine
                // updates of an already-controlled page.
                if (!hadController) return;
                // Defer so the current render isn't interrupted, and skip if
                // the tab is hidden or a native file picker is open.
                setTimeout(() => {
                  if (document.visibilityState === 'hidden') return;
                  window.location.reload();
                }, 1500);
              }
            });
          });

          return () => clearInterval(interval);
        })
        .catch(() => {
          // SW registration failed — app still works without PWA
        });
    };

    // Defer SW registration to idle time to avoid blocking initial render
    if ('requestIdleCallback' in window) {
      requestIdleCallback(registerSW, { timeout: 5000 });
    } else {
      registerSW();
    }
  }, []);

  // ─── Restore Offline State ───────────────────────────────
  useEffect(() => {
    const restoreState = async () => {
      const snapshot = await OfflineStateService.loadSnapshot();
      if (!snapshot) return;

      // Restore Zustand stores from snapshot
      try {
        // The context-layer domains are the freshest source of truth (written
        // on every change). Skip snapshot-restoring those stores when the
        // domain already has data, so a 30s-stale snapshot can't clobber a
        // just-saved avatar/wallpaper after a reload.
        const [authDomain, themeDomain] = await Promise.all([
          readDomain<Record<string, unknown>>('auth'),
          readDomain<Record<string, unknown>>('theme'),
        ]);
        const hasAuthDomain = !!authDomain && Object.keys(authDomain).length > 0;
        const hasThemeDomain = !!themeDomain && Object.keys(themeDomain).length > 0;

        if (snapshot.auth.currentUser && !hasAuthDomain) {
          useAuthStore.setState({ currentUser: snapshot.auth.currentUser });
        }
        if (snapshot.theme && !hasThemeDomain) {
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

    // Save state periodically (every 30 seconds, but only if changed)
    let lastSaved = '';
    const interval = setInterval(() => {
      const snapshot = getSnapshot();
      const serialized = JSON.stringify(snapshot);
      if (serialized !== lastSaved) {
        lastSaved = serialized;
        // Defer to idle time to avoid blocking UI
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => OfflineStateService.saveSnapshot(snapshot), { timeout: 5000 });
        } else {
          OfflineStateService.saveSnapshot(snapshot);
        }
      }
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
