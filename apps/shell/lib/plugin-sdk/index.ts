/**
 * Continua Plugin SDK (Layer 3)
 *
 * The official client SDK for building third-party applications and plugins
 * that integrate with Continua's persistent Context Layer.
 */

export type PluginPermission =
  | 'storage:read'
  | 'storage:write'
  | 'context:read'
  | 'context:write'
  | 'ui:notifications'
  | 'ui:theme'
  | 'audio:play'
  | 'network:fetch'
  | 'filesystem:read'
  | 'filesystem:write';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  category: 'productivity' | 'creative' | 'developer' | 'utility' | 'media';
  permissions: PluginPermission[];
  runtime: 'iframe' | 'native' | 'wasm';
  entryUrl?: string;
}

export interface ContextEvent<T = unknown> {
  domain: string;
  data: T;
  version: number;
}

export interface ContinuaSDKConfig {
  pluginId: string;
  targetWindow?: Window;
  targetOrigin?: string;
}

export class ContinuaPluginSDK {
  private pluginId: string;
  private targetWindow: Window;
  private targetOrigin: string;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private listeners = new Map<string, Set<(data: any) => void>>();

  constructor(config: ContinuaSDKConfig) {
    this.pluginId = config.pluginId;
    this.targetWindow = config.targetWindow || (typeof window !== 'undefined' ? window.parent : ({} as Window));
    this.targetOrigin = config.targetOrigin || '*';

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleHostMessage.bind(this));
    }
  }

  private handleHostMessage(event: MessageEvent) {
    const message = event.data;
    if (!message || typeof message !== 'object' || message.pluginId !== this.pluginId) return;

    if (message.type === 'response') {
      const pending = this.pendingRequests.get(message.requestId);
      if (pending) {
        this.pendingRequests.delete(message.requestId);
        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.data);
        }
      }
    } else if (message.type === 'event') {
      const handlers = this.listeners.get(message.event);
      if (handlers) {
        handlers.forEach((fn) => fn(message.payload));
      }
    }
  }

  private request<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      this.targetWindow.postMessage(
        {
          pluginId: this.pluginId,
          requestId,
          type: 'request',
          action,
          payload,
        },
        this.targetOrigin
      );

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Continua SDK request timeout: ${action}`));
        }
      }, 10000);
    });
  }

  // ─── 1. Context API ──────────────────────────────────────────

  public context = {
    get: async <T>(domain: string): Promise<T | null> => {
      return this.request<T | null>('context:get', { domain });
    },
    set: async <T>(domain: string, data: T): Promise<void> => {
      return this.request<void>('context:set', { domain, data });
    },
    subscribe: <T>(domain: string, callback: (data: T) => void): (() => void) => {
      const eventName = `context:${domain}`;
      if (!this.listeners.has(eventName)) {
        this.listeners.set(eventName, new Set());
      }
      this.listeners.get(eventName)!.add(callback);
      void this.request('context:subscribe', { domain });

      return () => {
        this.listeners.get(eventName)?.delete(callback);
      };
    },
  };

  // ─── 2. Storage API ──────────────────────────────────────────

  public storage = {
    get: async <T>(key: string): Promise<T | null> => {
      return this.request<T | null>('storage:get', { key });
    },
    set: async <T>(key: string, value: T): Promise<void> => {
      return this.request<void>('storage:set', { key, value });
    },
    delete: async (key: string): Promise<void> => {
      return this.request<void>('storage:delete', { key });
    },
  };

  // ─── 3. UI & Notifications ───────────────────────────────────

  public ui = {
    notify: async (title: string, description?: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> => {
      return this.request<void>('ui:notify', { title, description, type });
    },
    getTheme: async (): Promise<{ isDark: boolean; accentColor: string }> => {
      return this.request<{ isDark: boolean; accentColor: string }>('ui:getTheme');
    },
  };

  // ─── 4. Audio Engine ─────────────────────────────────────────

  public audio = {
    playClick: async (): Promise<void> => {
      return this.request<void>('audio:playClick');
    },
    getSoundProfile: async (): Promise<string> => {
      return this.request<string>('audio:getSoundProfile');
    },
  };
}

/**
 * Initializes the Continua Plugin SDK instance for the current iframe runtime.
 */
export function initContinuaSDK(pluginId: string): ContinuaPluginSDK {
  return new ContinuaPluginSDK({ pluginId });
}
