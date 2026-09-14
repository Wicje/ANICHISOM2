import { useWorkspaceStore } from '@/lib/stores/workspace.store';

type OSThemeEvent = {
  type: 'theme:change';
  payload: { themeColor: string };
};

type OSWindowEvent = {
  type: 'window:open' | 'window:close' | 'window:focus';
  payload: { windowId: string; appId?: string };
};

type OSWorkspaceEvent = {
  type: 'workspace:switch' | 'workspace:create';
  payload: { workspaceId: string };
};

type OSUIEvent = OSThemeEvent | OSWindowEvent | OSWorkspaceEvent;

type EventListener = (event: OSUIEvent) => void;

const listeners = new Map<string, Set<EventListener>>();

/**
 * Event service — lightweight pub/sub for cross-component communication.
 * Decoupled from WebSocket for local-only events.
 */
export const EventService = {
  on(type: string, listener: EventListener): () => void {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(listener);
    return () => listeners.get(type)?.delete(listener);
  },

  emit(event: OSUIEvent): void {
    listeners.get(event.type)?.forEach((listener) => listener(event));
  },

  off(type: string, listener: EventListener): void {
    listeners.get(type)?.delete(listener);
  },

  clear(): void {
    listeners.clear();
  },
};
