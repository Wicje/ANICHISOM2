'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useOS } from '@/lib/os-context';

interface PluginSandboxProps {
  pluginUrl: string;
  pluginId: string;
  permissions: string[];
}

export function PluginSandbox({ pluginUrl, pluginId, permissions }: PluginSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { emitEvent, currentUser } = useOS();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // In production, verify event.origin matches the plugin's registered origin
      if (event.data?.type === 'PLUGIN_RPC') {
        const { method, args } = event.data;
        
        // Very basic mock API handling for Phase 4A sandbox validation
        if (method === 'ui.showNotification') {
          console.log(`[Plugin ${pluginId}] Notification:`, ...args);
        } else if (method === 'events.emit') {
          if (permissions.includes('events.write')) {
            emitEvent({
              workspaceId: 'global',
              type: args[0],
              entityId: pluginId,
              userId: currentUser?.id || 'anonymous',
              comment: args[1]?.comment || `Plugin emitted event ${args[0]}`
            });
          } else {
            console.error(`[Plugin ${pluginId}] Denied events.write permission`);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [emitEvent, pluginId, permissions, currentUser]);

  return (
    <div className="w-full h-full bg-white relative">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] text-white/50 text-sm font-mono z-10">
          Initializing secure sandbox...
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={pluginUrl}
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-forms allow-popups" // strict sandbox, no allow-same-origin
        onLoad={() => setIsReady(true)}
        title={`Plugin Sandbox: ${pluginId}`}
      />
    </div>
  );
}
