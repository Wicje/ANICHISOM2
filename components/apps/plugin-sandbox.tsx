'use client';
import React, { useEffect, useRef, useState } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export function PluginSandbox({ window: osWindow }: { window: OSWindow }) {
  const { emitEvent, currentUser, openWindow } = useOS();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  // The URL of the third party plugin. For demo purposes, we will load a data URI 
  // or a placeholder if none provided.
  const pluginUrl = osWindow.data?.pluginUrl || '/plugin-mock.html';

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // In a real scenario, you'd check event.origin against a list of allowed plugin origins.
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      const { type, payload } = event.data;

      switch (type) {
        case 'OS_READY':
          setIsReady(true);
          // Send context to the plugin
          iframeRef.current.contentWindow?.postMessage({
            type: 'INIT_CONTEXT',
            payload: {
              userId: currentUser?.id,
              userName: currentUser?.name,
              theme: 'dark'
            }
          }, '*');
          break;

        case 'OPEN_APP':
          openWindow(payload.appId, payload.title || 'App from Plugin', payload.data);
          break;

        case 'NOTIFY':
          emitEvent({
            workspaceId: 'global',
            type: 'project_updated',
            entityId: `plugin-${osWindow.id}`,
            userId: currentUser?.id || 'unknown',
            comment: `[Plugin]: ${payload.message}`
          });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser, openWindow, emitEvent, osWindow.id]);

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
      
      {/* 
        sandbox attributes strictly limit what the iframe can do.
        allow-scripts is needed for postMessage to work. 
      */}
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
