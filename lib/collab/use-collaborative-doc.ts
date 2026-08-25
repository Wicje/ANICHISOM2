'use client';

/**
 * useCollaborativeDoc — React hook for real-time collaborative editing.
 *
 * Connects a TipTap editor to a Yjs document via y-websocket,
 * with IndexedDB persistence for offline support.
 */
import { useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useCollabStatusStore } from '@/lib/stores/collab-status.store';

interface UseCollaborativeDocOptions {
  /** Room identifier (e.g., workspace ID or document ID) */
  roomId: string;
  /** WebSocket server URL (defaults to env var or localhost:3001) */
  serverUrl?: string;
  /** Whether to enable collaboration (disable for solo editing) */
  enabled?: boolean;
}

interface UseCollaborativeDocResult {
  /** The shared Yjs document */
  doc: Y.Doc;
  /** Whether connected to the relay server */
  connected: boolean;
  /** Number of peers in the room */
  peerCount: number;
  /** Provider instance (for advanced usage) */
  provider: WebsocketProvider | null;
}

export function useCollaborativeDoc({
  roomId,
  serverUrl,
  enabled = true,
}: UseCollaborativeDocOptions): UseCollaborativeDocResult {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const updateRoom = useCollabStatusStore(s => s.updateRoom);
  const removeRoom = useCollabStatusStore(s => s.removeRoom);

  // Create doc once
  if (!docRef.current) {
    docRef.current = new Y.Doc();
  }
  const doc = docRef.current;

  useEffect(() => {
    if (!enabled || !doc) return;

    const url = serverUrl || process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:3001';
    const fullUrl = `${url}/${roomId}`;

    // WebSocket provider for real-time sync
    const provider = new WebsocketProvider(url, roomId, doc, {
      connect: true,
    });
    providerRef.current = provider;

    // IndexedDB persistence for offline
    const persistence = new IndexeddbPersistence(`collab-${roomId}`, doc);
    persistenceRef.current = persistence;

    // Track connection status
    provider.on('sync', (synced: boolean) => {
      updateRoom(roomId, synced, provider.awareness ? 1 : 0);
    });

    const onAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const peerCount = states.size;
      updateRoom(roomId, provider.wsconnected, peerCount);
    };
    provider.awareness.on('change', onAwarenessChange);

    provider.on('status', ({ status }: { status: string }) => {
      updateRoom(roomId, status === 'connected', provider.awareness ? provider.awareness.getStates().size : 0);
    });

    return () => {
      provider.awareness.off('change', onAwarenessChange);
      provider.disconnect();
      provider.destroy();
      persistence.destroy();
      removeRoom(roomId);
      providerRef.current = null;
      persistenceRef.current = null;
    };
  }, [roomId, enabled, doc, serverUrl, updateRoom, removeRoom]);

  // Cleanup doc on unmount
  useEffect(() => {
    return () => {
      docRef.current?.destroy();
      docRef.current = null;
    };
  }, []);

  const connected = useCollabStatusStore(s => s.rooms[roomId]?.connected ?? false);
  const peerCount = useCollabStatusStore(s => s.rooms[roomId]?.peerCount ?? 0);

  return {
    doc,
    connected,
    peerCount,
    provider: providerRef.current,
  };
}
