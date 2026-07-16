'use client';

import { create } from 'zustand';

/**
 * Global collaboration status store.
 * Each useCollaborativeDoc hook updates its own room's status here.
 * The menu bar reads from this to show connection indicator.
 */
export interface CollabRoomStatus {
  roomId: string;
  connected: boolean;
  peerCount: number;
}

interface CollabStatusState {
  rooms: Record<string, CollabRoomStatus>;
  updateRoom: (roomId: string, connected: boolean, peerCount: number) => void;
  removeRoom: (roomId: string) => void;
  /** Derived: is any room connected? */
  isConnected: () => boolean;
  /** Derived: total peers across all rooms */
  totalPeers: () => number;
}

export const useCollabStatusStore = create<CollabStatusState>((set, get) => ({
  rooms: {},
  updateRoom: (roomId, connected, peerCount) =>
    set((state) => ({
      rooms: { ...state.rooms, [roomId]: { roomId, connected, peerCount } },
    })),
  removeRoom: (roomId) =>
    set((state) => {
      const { [roomId]: _, ...rest } = state.rooms;
      return { rooms: rest };
    }),
  isConnected: () => Object.values(get().rooms).some((r) => r.connected),
  totalPeers: () => Object.values(get().rooms).reduce((sum, r) => sum + r.peerCount, 0),
}));
