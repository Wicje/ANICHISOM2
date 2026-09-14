'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { ShieldAlert, ShieldCheck, ShieldOff } from 'lucide-react';
import { usePluginStore } from '@/lib/stores/plugin.store';
import { PluginService } from '@/lib/services/plugin.service';

export function PluginSandbox({ window: osWindow }: { window: OSWindow }) {
  const { emitEvent, currentUser, openWindow, workspaceId } = useOS();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [deniedCount, setDeniedCount] = useState(0);

  const pluginUrl = osWindow.data?.pluginUrl;
  const pluginId = osWindow.data?.pluginId as string | undefined;
  const pluginOrigin = (() => {
    try {
      if (typeof window === 'undefined') return '';
      return new URL(pluginUrl, window.location.href).origin;
    } catch {
      return '';
    }
  })();

  const isRpcAllowed = useCallback((method: string): boolean => {
    if (!pluginId) return true; // No plugin ID = sandbox test mode, allow all
    return PluginService.isRpcMethodAllowed(pluginId, method);
  }, [pluginId]);

  // ─── RPC method handlers ──────────────────────────────────────────────

  const handleRPC = useCallback(async (method: string, args: any[], requestId: string | undefined) => {
    let result: any;
    let error: string | undefined;

    // Permission gate — check before executing
    if (!isRpcAllowed(method)) {
      error = `Permission denied: plugin does not have the required permission for ${method}`;
      setDeniedCount(c => c + 1);
    } else {
      try {
        switch (method) {
          // ── Workspace ──
          case 'workspace.getCurrentWorkspace':
            result = workspaceId || 'default';
            break;
          case 'workspace.getWorkspaceMembers':
            result = [];
            break;

          // ── Files ──
          case 'files.listFiles':
            result = [];
            break;
          case 'files.openFile':
            openWindow('files', 'Files', { fileId: args[0] });
            result = true;
            break;
          case 'files.saveFile':
            result = true;
            break;

          // ── Events ──
          case 'events.emit':
            emitEvent({
              workspaceId: workspaceId || 'global',
              type: 'project_updated',
              entityId: `plugin-${osWindow.id}`,
              userId: currentUser?.id || 'unknown',
              comment: `[Plugin Event] ${args[0]}: ${JSON.stringify(args[1])}`,
            });
            result = true;
            break;
          case 'events.subscribe':
            result = true;
            break;

          // ── Presence ──
          case 'presence.getOnlineUsers':
            result = [];
            break;
          case 'presence.setActivity':
            result = true;
            break;

          // ── Calls ──
          case 'calls.startCall':
            openWindow('power-browser', 'Call', { contextId: args[0] });
            result = true;
            break;
          case 'calls.joinCall':
            openWindow('power-browser', 'Call', { roomId: args[0] });
            result = true;
            break;

          // ── UI ──
          case 'ui.showNotification':
            emitEvent({
              workspaceId: workspaceId || 'global',
              type: 'project_updated',
              entityId: `plugin-${osWindow.id}`,
              userId: currentUser?.id || 'unknown',
              comment: `[${args[0]}] ${args[1]}`,
            });
            result = true;
            break;
          case 'ui.openWindow':
            openWindow(args[0], args[1] || 'Plugin Window', args[2]);
            result = true;
            break;

          // ── Auth ──
          case 'auth.getCurrentUser':
            result = {
              id: currentUser?.id || 'unknown',
              name: currentUser?.name || 'User',
              role: currentUser?.role || 'user',
            };
            break;
          case 'auth.hasPermission':
            // Delegate to the plugin service's permission check
            if (pluginId) {
              result = usePluginStore.getState().isPermissionGranted(pluginId, args[0]);
            } else {
              result = true;
            }
            break;

          // ── Campaign Lab ──
          case 'campaignLab.getCampaigns':
            result = [];
            break;
          case 'campaignLab.updateCampaignStatus':
            result = true;
            break;

          default:
            error = `Unknown RPC method: ${method}`;
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
  }, [currentUser, openWindow, emitEvent, workspaceId, osWindow.id, pluginOrigin, isRpcAllowed, pluginId]);

  // ─── Message handler ──────────────────────────────────────────────────

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
            },
          }, pluginOrigin);
          break;

        case 'PLUGIN_RPC':
          handleRPC(method, args || [], id);
          break;

        case 'OPEN_APP':
          if (isRpcAllowed('window:open')) {
            openWindow(payload.appId, payload.title || 'App from Plugin', payload.data);
          }
          break;

        case 'NOTIFY':
          if (isRpcAllowed('notifications:send')) {
            emitEvent({
              workspaceId: workspaceId || 'global',
              type: 'project_updated',
              entityId: `plugin-${osWindow.id}`,
              userId: currentUser?.id || 'unknown',
              comment: `[Plugin]: ${payload?.message || ''}`,
            });
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser, openWindow, emitEvent, workspaceId, osWindow.id, handleRPC, pluginOrigin, pluginId, isRpcAllowed]);

  const permCheck = pluginId
    ? usePluginStore(s => s.isPermissionGranted)
    : null;
  const grantedPerms = pluginId && permCheck
    ? (getPlugin?.(pluginId)?.permissions || []).filter((p: string) => permCheck(pluginId, p as any))
    : [];

  return (
    <div className="w-full h-full flex flex-col bg-black overflow-hidden relative">
      <div className="h-8 bg-[#111] border-b border-white/10 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          {isReady ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
            {isReady ? 'Sandbox IPC Active' : 'Initializing Sandbox...'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {deniedCount > 0 && (
            <span className="text-[10px] font-mono text-red-400/70 flex items-center gap-1">
              <ShieldOff className="w-3 h-3" /> {deniedCount} denied
            </span>
          )}
          {pluginId && (
            <span className="text-[10px] font-mono text-blue-400/50">
              {grantedPerms.length} perm{grantedPerms.length !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[10px] font-mono text-emerald-500/50">
            postMessage() Bridge
          </span>
        </div>
      </div>

      {pluginUrl ? (
        <iframe
          ref={iframeRef}
          src={pluginUrl}
          className="flex-1 w-full border-none bg-white"
          sandbox="allow-scripts"
          title={`Plugin ${osWindow.title}`}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#111] text-white/40">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No plugin URL provided</p>
            <p className="text-xs text-white/20 mt-1">Install a plugin from the App Store to run it here</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Lazy import to avoid circular dependency
let getPlugin: ((id: string) => any) | null = null;
import('@/lib/plugin-registry').then(mod => { getPlugin = mod.getPlugin; });
