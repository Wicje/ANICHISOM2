import { create } from 'zustand';
import type * as Y from 'yjs';

export interface CollabTestState {
  synced: boolean;
  connected: boolean;
  peerCount: number;
  canUndo: boolean;
  canRedo: boolean;
  ydocRef: { current: Y.Doc | null };
  sharedTypesRef: { current: Record<string, any> };
  undoManagerRef: { current: any };
  wsProviderRef: { current: any };
  remoteCursors: any[];
  undo: () => void;
  redo: () => void;
  setLocalCursor: () => void;
  markSynced: () => void;
}

export const collabStore = create<CollabTestState>((set) => ({
  synced: false,
  connected: false,
  peerCount: 0,
  canUndo: false,
  canRedo: false,
  ydocRef: { current: null },
  sharedTypesRef: { current: {} },
  undoManagerRef: { current: null },
  wsProviderRef: { current: null },
  remoteCursors: [],
  undo: () => {},
  redo: () => {},
  setLocalCursor: () => {},
  markSynced: () => set({ synced: true }),
}));

export function resetCollabStore() {
  collabStore.setState({
    synced: false,
    connected: false,
    peerCount: 0,
    canUndo: false,
    canRedo: false,
    undoManagerRef: { current: null },
    wsProviderRef: { current: null },
    remoteCursors: [],
  });
}
