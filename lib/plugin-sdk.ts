// ANICHISOM OS Plugin API SDK
// Phase 4A

import { Event, Presence } from './workspace-types';

export interface OSPluginAPI {
  // Read/write workspace data
  workspace: {
    getCurrentWorkspace: () => string;
    getWorkspaceMembers: () => string[];
  };

  // Access files from any cloud bridge
  files: {
    listFiles: (path: string) => Promise<any[]>;
    openFile: (fileId: string) => void;
    saveFile: (fileId: string, content: any) => Promise<boolean>;
  };

  // Emit and subscribe to events
  events: {
    emit: (type: string, payload: any) => void;
    subscribe: (type: string, callback: (payload: any) => void) => () => void;
  };

  // Know who is online, who is in what app
  presence: {
    getOnlineUsers: () => Presence[];
    setActivity: (activity: string) => void;
  };

  // Start or join a call with campaign context
  calls: {
    startCall: (contextId: string) => void;
    joinCall: (roomId: string) => void;
  };

  // Render windows, notifications, modals
  ui: {
    showNotification: (title: string, body: string) => void;
    openWindow: (appId: string, title?: string, data?: any) => void;
  };

  // Current user, permissions check
  auth: {
    getCurrentUser: () => { id: string; name: string; role: string };
    hasPermission: (permission: string) => boolean;
  };

  // Read/write campaign data
  campaignLab: {
    getCampaigns: () => Promise<any[]>;
    updateCampaignStatus: (campaignId: string, status: string) => Promise<void>;
  };
}

// Helper to initialize the SDK within an iframe plugin
export function initPluginAPI(): Promise<OSPluginAPI> {
  return new Promise((resolve) => {
    // In a real implementation, this would establish a postMessage handshake
    // with the parent window (the OS Core) to get access to these methods.
    
    // For now, we return a mock/proxy object that forwards calls via postMessage
    const apiProxy = {
      ui: {
        showNotification: (title: string, body: string) => {
          window.parent.postMessage({ type: 'PLUGIN_RPC', method: 'ui.showNotification', args: [title, body] }, '*');
        },
        openWindow: (appId: string, title?: string, data?: any) => {
          window.parent.postMessage({ type: 'PLUGIN_RPC', method: 'ui.openWindow', args: [appId, title, data] }, '*');
        }
      },
      events: {
        emit: (type: string, payload: any) => {
          window.parent.postMessage({ type: 'PLUGIN_RPC', method: 'events.emit', args: [type, payload] }, '*');
        },
        subscribe: (type: string, callback: (payload: any) => void) => {
          // Mock implementation
          return () => {};
        }
      },
      // ... other proxies
    } as unknown as OSPluginAPI;
    
    resolve(apiProxy);
  });
}
