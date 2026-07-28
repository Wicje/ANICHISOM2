'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useOS } from '@/lib/os-context';
import { usePluginStore } from '@/lib/stores/plugin.store';
import { PluginService } from '@/lib/services/plugin.service';

export function HeadlessDaemon({ pluginId, pluginUrl }: { pluginId: string, pluginUrl: string }) {
  const { emitEvent, currentUser, openWindow, workspaceId } = useOS();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  const pluginOrigin = (() => {
    try {
      if (typeof window === 'undefined') return '';
      return new URL(pluginUrl, window.location.href).origin;
    } catch {
      return '';
    }
  })();

  const isRpcAllowed = useCallback((method: string): boolean => {
    return PluginService.isRpcMethodAllowed(pluginId, method);
  }, [pluginId]);

  const handleRPC = useCallback(async (method: string, args: any[], requestId: string | undefined) => {
    let result: any;
    let error: string | undefined;

    if (!isRpcAllowed(method)) {
      error = `Permission denied: daemon does not have the required permission for ${method}`;
    } else {
      try {
        switch (method) {
          case 'workspace.getCurrentWorkspace':
            result = workspaceId || 'default';
            break;
          case 'files.openFile':
            openWindow('files', 'Files', { fileId: args[0] });
            result = true;
            break;
          case 'events.emit':
            emitEvent({
              workspaceId: workspaceId || 'global',
              type: 'project_updated',
              entityId: `daemon-${pluginId}`,
              userId: currentUser?.id || 'unknown',
              comment: `[Daemon Event] ${args[0]}: ${JSON.stringify(args[1])}`,
            });
            result = true;
            break;
          case 'ui.showNotification':
            emitEvent({
              workspaceId: workspaceId || 'global',
              type: 'project_updated',
              entityId: `daemon-${pluginId}`,
              userId: currentUser?.id || 'unknown',
              comment: `[${args[0]}] ${args[1]}`,
            });
            result = true;
            break;
          case 'ui.openWindow':
            openWindow(args[0], args[1] || 'Daemon Window', args[2]);
            result = true;
            break;
          case 'auth.getCurrentUser':
            result = {
              id: currentUser?.id || 'unknown',
              name: currentUser?.name || 'User',
              role: currentUser?.role || 'user',
            };
            break;
          case 'auth.hasPermission':
            result = usePluginStore.getState().isPermissionGranted(pluginId, args[0]);
            break;
          default:
            error = `Unknown Daemon RPC method: ${method}`;
        }
      } catch (e: any) {
        error = e.message || 'RPC handler error';
      }
    }

    if (requestId && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        error
          ? { type: 'PLUGIN_RPC_ERROR', id: requestId, error }
          : { type: 'PLUGIN_RPC_RESULT', id: requestId, result },
        pluginOrigin,
      );
    }
  }, [currentUser, openWindow, emitEvent, workspaceId, pluginOrigin, isRpcAllowed, pluginId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      if (!pluginOrigin || event.origin !== pluginOrigin) return;

      const { type, payload, method, args, id } = event.data || {};

      switch (type) {
        case 'OS_READY':
          setIsReady(true);
          iframeRef.current.contentWindow?.postMessage({
            type: 'INIT_CONTEXT',
            payload: {
              userId: currentUser?.id,
              userName: currentUser?.name,
              theme: 'dark',
              pluginId,
              isDaemon: true,
            },
          }, pluginOrigin);
          break;

        case 'PLUGIN_RPC':
          handleRPC(method, args || [], id);
          break;

        case 'NOTIFY':
          if (isRpcAllowed('notifications:send')) {
            emitEvent({
              workspaceId: workspaceId || 'global',
              type: 'project_updated',
              entityId: `daemon-${pluginId}`,
              userId: currentUser?.id || 'unknown',
              comment: `[Daemon]: ${payload?.message || ''}`,
            });
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser, openWindow, emitEvent, workspaceId, handleRPC, pluginOrigin, pluginId, isRpcAllowed]);

  if (!pluginUrl) return null;

  return (
    <iframe
      ref={iframeRef}
      src={pluginUrl}
      style={{ display: 'none' }}
      sandbox="allow-scripts"
      title={`Daemon ${pluginId}`}
    />
  );
}
