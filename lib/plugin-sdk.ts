// ANICHISOM OS Plugin API SDK
// Phase 4 — Full implementation with postMessage RPC protocol
//
// Plugins (iframe sandbox) import this SDK and call methods like:
//   const api = await initPluginAPI();
//   const files = await api.files.listFiles('/');
//   api.ui.showNotification('Hello', 'World');

export interface OSPluginAPI {
  workspace: {
    getCurrentWorkspace: () => Promise<string>;
    getWorkspaceMembers: () => Promise<string[]>;
  };
  files: {
    listFiles: (path: string) => Promise<any[]>;
    openFile: (fileId: string) => void;
    saveFile: (fileId: string, content: any) => Promise<boolean>;
  };
  events: {
    emit: (type: string, payload: any) => void;
    subscribe: (type: string, callback: (payload: any) => void) => () => void;
  };
  presence: {
    getOnlineUsers: () => Promise<any[]>;
    setActivity: (activity: string) => void;
  };
  calls: {
    startCall: (contextId: string) => void;
    joinCall: (roomId: string) => void;
  };
  ui: {
    showNotification: (title: string, body: string) => void;
    openWindow: (appId: string, title?: string, data?: any) => void;
  };
  auth: {
    getCurrentUser: () => Promise<{ id: string; name: string; role: string }>;
    hasPermission: (permission: string) => Promise<boolean>;
  };
  campaignLab: {
    getCampaigns: () => Promise<any[]>;
    updateCampaignStatus: (campaignId: string, status: string) => Promise<void>;
  };
}

// ─── Internal RPC helpers ───────────────────────────────────────────────

let requestIdCounter = 0;
const pendingRequests = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();

function rpcCall(method: string, ...args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `rpc_${++requestIdCounter}_${Date.now()}`;
    pendingRequests.set(id, { resolve, reject });

    window.parent.postMessage(
      { type: 'PLUGIN_RPC', method, args, id },
      '*',
    );

    // Timeout after 10s
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`RPC ${method} timed out`));
      }
    }, 10000);
  });
}

function rpcNotify(method: string, ...args: any[]): void {
  window.parent.postMessage(
    { type: 'PLUGIN_RPC', method, args, id: undefined },
    '*',
  );
}

// Listen for RPC results from the parent
function listenForResults() {
  window.addEventListener('message', (event: MessageEvent) => {
    const { type, id, result, error } = event.data || {};
    if (type === 'PLUGIN_RPC_RESULT' && id && pendingRequests.has(id)) {
      const { resolve } = pendingRequests.get(id)!;
      pendingRequests.delete(id);
      resolve(result);
    }
    if (type === 'PLUGIN_RPC_ERROR' && id && pendingRequests.has(id)) {
      const { reject } = pendingRequests.get(id)!;
      pendingRequests.delete(id);
      reject(new Error(error || 'RPC call failed'));
    }
  });
}

// ─── SDK factory ────────────────────────────────────────────────────────

export function initPluginAPI(): Promise<OSPluginAPI> {
  return new Promise((resolve) => {
    listenForResults();

    // Establish handshake: the parent (PluginSandbox) sends INIT_CONTEXT
    // when it receives OS_READY from this plugin.
    const onMessage = (event: MessageEvent) => {
      const { type } = event.data || {};
      if (type === 'INIT_CONTEXT') {
        window.removeEventListener('message', onMessage);

        const api: OSPluginAPI = {
          // ── Workspace ──────────────────────────────────────────────
          workspace: {
            getCurrentWorkspace: () => rpcCall('workspace.getCurrentWorkspace'),
            getWorkspaceMembers: () => rpcCall('workspace.getWorkspaceMembers'),
          },

          // ── Files ──────────────────────────────────────────────────
          files: {
            listFiles: (path: string) => rpcCall('files.listFiles', path),
            openFile: (fileId: string) => rpcNotify('files.openFile', fileId),
            saveFile: (fileId: string, content: any) => rpcCall('files.saveFile', fileId, content),
          },

          // ── Events ─────────────────────────────────────────────────
          events: {
            emit: (type: string, payload: any) => rpcNotify('events.emit', type, payload),
            subscribe: (type: string, callback: (payload: any) => void) => {
              const handler = (event: MessageEvent) => {
                const { type: msgType, payload } = event.data || {};
                if (msgType === 'PLUGIN_EVENT' && event.data?.eventType === type) {
                  callback(payload);
                }
              };
              window.addEventListener('message', handler);
              // Notify parent we want to subscribe
              rpcNotify('events.subscribe', type);
              return () => window.removeEventListener('message', handler);
            },
          },

          // ── Presence ───────────────────────────────────────────────
          presence: {
            getOnlineUsers: () => rpcCall('presence.getOnlineUsers'),
            setActivity: (activity: string) => rpcNotify('presence.setActivity', activity),
          },

          // ── Calls ──────────────────────────────────────────────────
          calls: {
            startCall: (contextId: string) => rpcNotify('calls.startCall', contextId),
            joinCall: (roomId: string) => rpcNotify('calls.joinCall', roomId),
          },

          // ── UI ─────────────────────────────────────────────────────
          ui: {
            showNotification: (title: string, body: string) => rpcNotify('ui.showNotification', title, body),
            openWindow: (appId: string, title?: string, data?: any) => rpcNotify('ui.openWindow', appId, title, data),
          },

          // ── Auth ───────────────────────────────────────────────────
          auth: {
            getCurrentUser: () => rpcCall('auth.getCurrentUser'),
            hasPermission: (permission: string) => rpcCall('auth.hasPermission', permission),
          },

          // ── Campaign Lab ───────────────────────────────────────────
          campaignLab: {
            getCampaigns: () => rpcCall('campaignLab.getCampaigns'),
            updateCampaignStatus: (campaignId: string, status: string) => rpcCall('campaignLab.updateCampaignStatus', campaignId, status),
          },
        };

        resolve(api);
      }
    };

    window.addEventListener('message', onMessage);

    // Notify parent that the plugin is ready
    window.parent.postMessage({ type: 'OS_READY', payload: {} }, '*');

    // Fallback: if no INIT_CONTEXT within 2s, resolve with a minimal working API
    setTimeout(() => {
      window.removeEventListener('message', onMessage);
      // The handshake listener is removed, but the rpc listener is still active
      // We can resolve with a minimal API that still works via RPC
      // However, the main listener was already set up, so just resolve
      resolve({
        workspace: {
          getCurrentWorkspace: () => rpcCall('workspace.getCurrentWorkspace'),
          getWorkspaceMembers: () => rpcCall('workspace.getWorkspaceMembers'),
        },
        files: {
          listFiles: (path: string) => rpcCall('files.listFiles', path),
          openFile: (fileId: string) => rpcNotify('files.openFile', fileId),
          saveFile: (fileId: string, content: any) => rpcCall('files.saveFile', fileId, content),
        },
        events: {
          emit: (type: string, payload: any) => rpcNotify('events.emit', type, payload),
          subscribe: (type: string, callback: (payload: any) => void) => {
            const handler = (event: MessageEvent) => {
              const { data: msg } = event;
              if (msg?.type === 'PLUGIN_EVENT' && msg?.eventType === type) {
                callback(msg.payload);
              }
            };
            window.addEventListener('message', handler);
            rpcNotify('events.subscribe', type);
            return () => window.removeEventListener('message', handler);
          },
        },
        presence: {
          getOnlineUsers: () => rpcCall('presence.getOnlineUsers'),
          setActivity: (activity: string) => rpcNotify('presence.setActivity', activity),
        },
        calls: {
          startCall: (contextId: string) => rpcNotify('calls.startCall', contextId),
          joinCall: (roomId: string) => rpcNotify('calls.joinCall', roomId),
        },
        ui: {
          showNotification: (title: string, body: string) => rpcNotify('ui.showNotification', title, body),
          openWindow: (appId: string, title?: string, data?: any) => rpcNotify('ui.openWindow', appId, title, data),
        },
        auth: {
          getCurrentUser: () => rpcCall('auth.getCurrentUser'),
          hasPermission: (permission: string) => rpcCall('auth.hasPermission', permission),
        },
        campaignLab: {
          getCampaigns: () => rpcCall('campaignLab.getCampaigns'),
          updateCampaignStatus: (campaignId: string, status: string) => rpcCall('campaignLab.updateCampaignStatus', campaignId, status),
        },
      });
    }, 2000);
  });
}