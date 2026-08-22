'use client';

import { usePluginStore } from '@/lib/stores/plugin.store';
import { readDomain, writeDomain } from '@/lib/context-layer';
import { useThemeStore } from '@/lib/stores/theme.store';
import { audioSystem } from '@/lib/services/audio-engine';

export interface PluginMessageRequest {
  pluginId: string;
  requestId: string;
  type: 'request';
  action: string;
  payload: Record<string, any>;
}

export interface PluginMessageResponse {
  pluginId: string;
  requestId: string;
  type: 'response';
  data?: any;
  error?: string;
}

class PluginSandboxHostService {
  private isListening = false;

  public init(): void {
    if (typeof window === 'undefined' || this.isListening) return;

    window.addEventListener('message', this.handleIframeMessage.bind(this));
    this.isListening = true;
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleIframeMessage.bind(this));
      this.isListening = false;
    }
  }

  private async handleIframeMessage(event: MessageEvent): Promise<void> {
    const data: PluginMessageRequest = event.data;
    if (!data || typeof data !== 'object' || data.type !== 'request' || !data.pluginId || !data.requestId) {
      return;
    }

    const { pluginId, requestId, action, payload } = data;
    const sourceWindow = event.source as Window;
    if (!sourceWindow) return;

    const respond = (responsePayload: { data?: any; error?: string }) => {
      sourceWindow.postMessage(
        {
          pluginId,
          requestId,
          type: 'response',
          ...responsePayload,
        },
        event.origin === 'null' ? '*' : event.origin
      );
    };

    const store = usePluginStore.getState();
    const plugin = store.getPlugin(pluginId);
    if (!plugin) {
      respond({ error: `Plugin "${pluginId}" is not registered.` });
      return;
    }

    const isInstalled = store.isPluginActive(pluginId);
    if (!isInstalled) {
      respond({ error: `Plugin "${pluginId}" is not active or enabled.` });
      return;
    }

    // Permission Verification Map
    try {
      switch (action) {
        // ─── Context API ───
        case 'context:get': {
          if (!store.isPermissionGranted(pluginId, 'context:read' as any)) {
            respond({ error: 'Permission denied: context:read' });
            return;
          }
          const val = await readDomain(payload.domain);
          respond({ data: val });
          break;
        }

        case 'context:set': {
          if (!store.isPermissionGranted(pluginId, 'context:write' as any)) {
            respond({ error: 'Permission denied: context:write' });
            return;
          }
          await writeDomain(payload.domain, payload.data);
          respond({ data: { success: true } });
          break;
        }

        // ─── Storage API ───
        case 'storage:get': {
          if (!store.isPermissionGranted(pluginId, 'storage:read' as any)) {
            respond({ error: 'Permission denied: storage:read' });
            return;
          }
          const key = `plugin_storage:${pluginId}:${payload.key}`;
          const val = await readDomain(key);
          respond({ data: val });
          break;
        }

        case 'storage:set': {
          if (!store.isPermissionGranted(pluginId, 'storage:write' as any)) {
            respond({ error: 'Permission denied: storage:write' });
            return;
          }
          const key = `plugin_storage:${pluginId}:${payload.key}`;
          await writeDomain(key, payload.value);
          respond({ data: { success: true } });
          break;
        }

        case 'storage:delete': {
          if (!store.isPermissionGranted(pluginId, 'storage:write' as any)) {
            respond({ error: 'Permission denied: storage:write' });
            return;
          }
          const key = `plugin_storage:${pluginId}:${payload.key}`;
          await writeDomain(key, null);
          respond({ data: { success: true } });
          break;
        }

        // ─── UI & Notifications ───
        case 'ui:notify': {
          if (!store.isPermissionGranted(pluginId, 'ui:notifications' as any)) {
            respond({ error: 'Permission denied: ui:notifications' });
            return;
          }
          window.dispatchEvent(
            new CustomEvent('os:notify', {
              detail: {
                title: payload.title || plugin.name,
                description: payload.description || '',
                type: payload.type || 'info',
              },
            })
          );
          respond({ data: { success: true } });
          break;
        }

        case 'ui:getTheme': {
          const theme = useThemeStore.getState();
          respond({
            data: {
              isDark: theme.colorMode === 'dark',
              accentColor: theme.themeColor || '#10F4A0',
            },
          });
          break;
        }

        // ─── Audio Engine ───
        case 'audio:playClick': {
          if (!store.isPermissionGranted(pluginId, 'audio:play' as any)) {
            respond({ error: 'Permission denied: audio:play' });
            return;
          }
          audioSystem.playClick();
          respond({ data: { success: true } });
          break;
        }

        case 'audio:getSoundProfile': {
          respond({ data: audioSystem.getSoundProfile() });
          break;
        }

        default:
          respond({ error: `Unknown SDK action: ${action}` });
      }
    } catch (err: any) {
      respond({ error: err.message || 'Internal host error during SDK execution' });
    }
  }
}

export const pluginSandboxHost = new PluginSandboxHostService();
