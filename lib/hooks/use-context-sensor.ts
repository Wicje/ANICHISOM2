'use client';

import { useEffect, useRef } from 'react';
import { useWindowStore } from '@/lib/stores/window.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useBrowserStore } from '@/lib/stores/browser.store';
import { writeDomain } from '@/lib/context-layer';
import { sanitizeForPrivacy, WorkContext } from '@/lib/context-kernel/graph';
import { useContextPrivacyStore } from '@/lib/stores/context-privacy.store';

const CHECKPOINT_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Continua Background Context Sensor
 * Captures non-intrusive metadata checkpoints of active workspace state.
 */
export function useContextSensor() {
  const windows = useWindowStore((s) => s.windows);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const tabs = useBrowserStore((s) => s.tabs);

  const lastCheckpointRef = useRef<string>('');

  useEffect(() => {
    const runCheckpoint = async () => {
      // Read the tier from the store (hydrates from localStorage on first use)
      useContextPrivacyStore.getState().hydrate();
      const privacyMode = useContextPrivacyStore.getState().mode;

      if (privacyMode === 'private_session') {
        return;
      }

      // Find top visible window
      const visibleWindows = windows.filter((w) => !w.isMinimized);
      const topWindow = visibleWindows.sort((a, b) => b.zIndex - a.zIndex)[0];

      const rawContext: WorkContext = {
        id: `ctx_${workspaceId || 'default'}`,
        projectId: workspaceId || 'continua-workspace',
        projectName: 'Continua Workspace',
        updatedAt: new Date().toISOString(),
        deviceId:
          typeof window !== 'undefined'
            ? localStorage.getItem('continuaos_device_id') || 'web-client'
            : 'web-client',
        // Git state is omitted until the native daemon supplies real data —
        // never fabricate repo/branch metadata in checkpoints.
        editor: {
          activeFile: topWindow?.title || 'src/components/Workspace.tsx',
          cursorLine: 421,
          cursorColumn: 12,
          openFiles: windows.map((w) => w.title),
          ideName: 'Continua Monaco',
          openApps: visibleWindows
            .sort((a, b) => b.zIndex - a.zIndex)
            .slice(0, 12)
            .map((w) => ({ appId: w.appId, title: w.title })),
        },
        browserTabs: tabs.map((t) => ({
          id: t.id,
          title: t.title,
          url: t.url,
          category: t.url.includes('github')
            ? 'repo'
            : t.url.includes('figma')
            ? 'design'
            : 'research',
          lastActive: new Date().toISOString(),
        })),
        tasks: [],
      };

      const sanitized = sanitizeForPrivacy(rawContext, privacyMode);
      if (!sanitized) return;

      const serialized = JSON.stringify(sanitized);
      if (serialized === lastCheckpointRef.current) {
        // No change since last checkpoint
        return;
      }

      lastCheckpointRef.current = serialized;

      try {
        await writeDomain('context_graph', sanitized);
      } catch (err) {
        console.warn('[useContextSensor] Checkpoint sync notice:', err);
      }
    };

    const interval = setInterval(runCheckpoint, CHECKPOINT_INTERVAL_MS);
    const timeout = setTimeout(runCheckpoint, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [windows, activeWorkspace, workspaceId, tabs]);
}
