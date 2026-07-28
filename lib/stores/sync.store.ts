import { create } from 'zustand';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface SyncState {
  isSyncing: boolean;
  deviceId: string;
  connectedDevices: number;
  syncRoomId: string | null;
  startSync: (roomId: string) => void;
  stopSync: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => {
  let wsProvider: WebsocketProvider | null = null;
  const ydoc = new Y.Doc();

  return {
    isSyncing: false,
    deviceId: Math.random().toString(36).substring(2, 9),
    connectedDevices: 1,
    syncRoomId: null,

    startSync: (roomId: string) => {
      const { isSyncing } = get();
      if (isSyncing) return;

      const wsUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:1234';
      
      wsProvider = new WebsocketProvider(wsUrl, `os-sync-${roomId}`, ydoc);
      
      wsProvider.on('status', (event: { status: string }) => {
        if (event.status === 'connected') {
          set({ isSyncing: true, syncRoomId: roomId });
        } else if (event.status === 'disconnected') {
          set({ isSyncing: false });
        }
      });

      wsProvider.awareness.on('change', () => {
        const states = Array.from(wsProvider!.awareness.getStates().values());
        set({ connectedDevices: states.length });
      });

      // Broadcast this device's presence
      wsProvider.awareness.setLocalStateField('device', { id: get().deviceId, type: 'desktop' });
    },

    stopSync: () => {
      if (wsProvider) {
        wsProvider.destroy();
        wsProvider = null;
      }
      set({ isSyncing: false, connectedDevices: 1, syncRoomId: null });
    }
  };
});
