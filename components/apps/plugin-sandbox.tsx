'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export function PluginSandbox({ window: osWindow }: { window: OSWindow }) {
  const { emitEvent, currentUser, openWindow, workspaceId } = useOS();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  const pluginUrl = osWindow.data?.pluginUrl || '/plugin-mock.html';

  // ─── RPC method handlers ──────────────────────────────────────────────

  const handleRPC = useCallback(async (method: string, args: any[], requestId: string | undefined) => {
    let result: any;
    let error: string | undefined;

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
          // For now, return empty list — Files Bridge would be queried
          result = [];
          break;
        case 'files.openFile':
          openWindow('files', 'Files', { fileId: args[0] });
          result = true;
          break;
        case 'files.saveFile':
          // Not implemented in sandbox; return true to avoid breaking plugins
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
          // Parent acknowledges the subscription
          result = true;
          break;

        // ── Presence ──
        case 'presence.getOnlineUsers':
          result = [];
          break;
        case 'presence.setActivity':
          // Could update some global presence state
          result = true;
          break;

        // ── Calls ──
        case 'calls.startCall':
          openWindow('mini-browser', 'Call', { contextId: args[0] });
          result = true;
          break;
        case 'calls.joinCall':
          openWindow('mini-browser', 'Call', { roomId: args[0] });
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
          // In dev mode, grant all permissions to iframe plugins
          result = true;
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

    // Only send a response if the caller provided a requestId (async RPC calls)
    if (requestId && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        error
          ? { type: 'PLUGIN_RPC_ERROR', id: requestId, error }
          : { type: 'PLUGIN_RPC_RESULT', id: requestId, result },
        '*',
      );
    }
  }, [currentUser, openWindow, emitEvent, workspaceId, osWindow.id]);

  // ─── Message handler ──────────────────────────────────────────────────

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

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
            },
          }, '*');
          break;

        case 'PLUGIN_RPC':
          handleRPC(method, args || [], id);
          break;

        case 'OPEN_APP':
          openWindow(payload.appId, payload.title || 'App from Plugin', payload.data);
          break;

        case 'NOTIFY':
          emitEvent({
            workspaceId: workspaceId || 'global',
            type: 'project_updated',
            entityId: `plugin-${osWindow.id}`,
            userId: currentUser?.id || 'unknown',
            comment: `[Plugin]: ${payload?.message || ''}`,
          });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser, openWindow, emitEvent, workspaceId, osWindow.id, handleRPC]);

  return (
    <div className="w-full h-full flex flex-col bg-black overflow-hidden relative">
      <div className="h-8 bg-[#111] border-b border-white/10 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          {isReady ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
          <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
            {isReady ? 'Sandbox IPC Active' : 'Initializing Sandbox...'}
          </span>
        </div>
        <div className="text-[10px] font-mono text-emerald-500/50">
          postMessage() Bridge
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src={pluginUrl}
        className="flex-1 w-full border-none bg-white"
        sandbox="allow-scripts"
        title={`Plugin ${osWindow.title}`}
      />
    </div>
  );
}