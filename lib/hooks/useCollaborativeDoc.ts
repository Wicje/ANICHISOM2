'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useOS } from '@/lib/os-context';
import { useCollabStatusStore } from '@/lib/stores/collab-status.store';

export interface CollaborativeDocConfig {
  /** App-specific room prefix, e.g. 'campaign', 'moodboard', 'word' */
  appPrefix: string;
  /** Project/document ID for the room */
  docId: string;
  /** Y.Doc shared types to create and track */
  sharedTypes: SharedTypeConfig[];
  /** Optional: seed data when the doc is empty on first load */
  onFirstSync?: (ydoc: any, sharedTypes: Record<string, any>) => void;
  /** Optional: which Yjs shared types the UndoManager should track */
  undoTrackingTypes?: string[];
}

export interface SharedTypeConfig {
  /** Name for the shared type, e.g. 'pages', 'nodes', 'comments' */
  name: string;
  /** Yjs type: 'Map', 'Array', 'Text', 'XmlFragment' */
  kind: 'Map' | 'Array' | 'Text' | 'XmlFragment';
}

export interface CollaborativeDocState {
  /** Whether the Yjs doc has synced from IndexedDB */
  synced: boolean;
  /** Whether we're in agency mode with a network provider active */
  connected: boolean;
  /** Number of remote peers (excluding self) */
  peerCount: number;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Access the Y.Doc instance (use sparingly) */
  ydocRef: React.MutableRefObject<any>;
  /** Access shared Yjs types by name, e.g. sharedTypesRef.current.pages */
  sharedTypesRef: React.MutableRefObject<Record<string, any>>;
  /** Access the UndoManager instance */
  undoManagerRef: React.MutableRefObject<any>;
  /** Access the WebsocketProvider instance (agency mode only) */
  wsProviderRef: React.MutableRefObject<any>;
  /** Call to undo the last tracked change */
  undo: () => void;
  /** Call to redo the last undone change */
  redo: () => void;
  /** Broadcast local cursor position for remote rendering */
  setLocalCursor: (x: number, y: number) => void;
  /** Get all remote peers' cursor positions */
  remoteCursors: { userId: string; name: string; color: string; x: number; y: number }[];
}

/**
 * Reusable hook for Yjs real-time collaboration.
 *
 * Lifecycle:
 * 1. Dynamic import of yjs + y-indexeddb (avoids SSR issues)
 * 2. Create Y.Doc + requested shared types (Y.Map, Y.Array, Y.Text, Y.XmlFragment)
 * 3. Attach IndexeddbPersistence for local-first storage
 * 4. On sync, seed default data if doc is empty
 * 5. In agency mode, attach WebsocketProvider for real-time sync
 * 6. Create UndoManager for requested shared types
 * 7. On unmount, destroy all providers + Y.Doc
 */
export function useCollaborativeDoc(config: CollaborativeDocConfig): CollaborativeDocState {
  const { workspaceMode, currentUser } = useOS();

  const roomId = `${config.appPrefix}-${workspaceMode}-${config.docId}`;
  const currentUserId = currentUser?.id || 'anonymous';

  const [synced, setSynced] = useState(false);
  const [connected, setConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState<CollaborativeDocState['remoteCursors']>([]);

  const ydocRef = useRef<any>(null);
  const sharedTypesRef = useRef<Record<string, any>>({});
  const undoManagerRef = useRef<any>(null);
  const providerRef = useRef<any>(null);
  const wsProviderRef = useRef<any>(null);
  const activeRef = useRef(true);

  const updateRoom = useCollabStatusStore((s) => s.updateRoom);
  const removeRoom = useCollabStatusStore((s) => s.removeRoom);

  // Sync local connected/peerCount to global status store
  useEffect(() => {
    if (workspaceMode === 'agency') {
      updateRoom(roomId, connected, peerCount);
    }
    return () => {
      removeRoom(roomId);
    };
  }, [roomId, connected, peerCount, workspaceMode, updateRoom, removeRoom]);

  const undo = useCallback(() => {
    if (undoManagerRef.current) {
      try { undoManagerRef.current.undo(); } catch {}
    }
  }, []);

  const redo = useCallback(() => {
    if (undoManagerRef.current) {
      try { undoManagerRef.current.redo(); } catch {}
    }
  }, []);

  const setLocalCursor = useCallback((x: number, y: number) => {
    const provider = wsProviderRef.current;
    if (provider?.awareness) {
      provider.awareness.setLocalStateField('cursor', { x, y });
    }
  }, []);

  // Main setup effect
  useEffect(() => {
    activeRef.current = true;

    let Y: any;
    let IndexeddbPersistence: any;
    let WebsocketProvider: any;

    const setup = async () => {
      try {
      Y = await import('yjs');
      const ydb = await import('y-indexeddb');
      IndexeddbPersistence = ydb.IndexeddbPersistence;

      if (!activeRef.current) return;

      // 1. Create Y.Doc
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      // 2. Create requested shared types
      const types: Record<string, any> = {};
      for (const st of config.sharedTypes) {
        switch (st.kind) {
          case 'Map':
            types[st.name] = ydoc.getMap(st.name);
            break;
          case 'Array':
            types[st.name] = ydoc.getArray(st.name);
            break;
          case 'Text':
            types[st.name] = ydoc.getText(st.name);
            break;
          case 'XmlFragment':
            types[st.name] = ydoc.getXmlFragment(st.name);
            break;
        }
      }
      sharedTypesRef.current = types;

      // 3. Attach IndexedDB persistence
      const provider = new IndexeddbPersistence(roomId, ydoc);
      providerRef.current = provider;

      provider.on('synced', () => {
        if (!activeRef.current) return;
        setSynced(true);

        // Seed defaults if doc is empty
        const hasData = config.sharedTypes.some(st => {
          const t = types[st.name];
          if (st.kind === 'Map') return t.size > 0;
          if (st.kind === 'Array') return t.length > 0;
          if (st.kind === 'Text') return t.length > 0;
          if (st.kind === 'XmlFragment') return t.length > 0;
          return false;
        });

        if (!hasData && config.onFirstSync) {
          config.onFirstSync(ydoc, types);
        }
      });

      // 4. UndoManager
      if (config.undoTrackingTypes && config.undoTrackingTypes.length > 0) {
        const tracked = config.undoTrackingTypes.map(name => types[name]);
        const UndoManager = Y.UndoManager;
        const undoManager = new UndoManager(tracked);
        undoManagerRef.current = undoManager;

        undoManager.on('stack-item-added', () => {
          if (activeRef.current) {
            setCanUndo(undoManager.undoStack.length > 0);
            setCanRedo(undoManager.redoStack.length > 0);
          }
        });
        undoManager.on('stack-item-updated', () => {
          if (activeRef.current) {
            setCanUndo(undoManager.undoStack.length > 0);
            setCanRedo(undoManager.redoStack.length > 0);
          }
        });
        undoManager.on('stack-item-popped', () => {
          if (activeRef.current) {
            setCanUndo(undoManager.undoStack.length > 0);
            setCanRedo(undoManager.redoStack.length > 0);
          }
        });
      }

      // 5. Agency-mode collaboration
      if (workspaceMode === 'agency') {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocal) {
          // Local dev: use Yjs WebSocket server on port 1234
          const yws = await import('y-websocket');
          WebsocketProvider = yws.WebsocketProvider;
          if (!activeRef.current) return;

          const wsUrl = `ws://localhost:1234`;
          const wsProvider = new WebsocketProvider(wsUrl, roomId, ydoc, {
            connect: true,
          });
          wsProviderRef.current = wsProvider;

          wsProvider.on('status', ({ status }: { status: string }) => {
            if (!activeRef.current) return;
            setConnected(status === 'connected');
            if (status === 'disconnected' || status === 'connection-error') {
              setPeerCount(0);
              setRemoteCursors([]);
            }
          });

          wsProvider.on('connection-error', (err: any) => {
            if (!activeRef.current) return;
            console.warn('[useCollaborativeDoc] WS connection error:', err);
            setConnected(false);
          });

          const userHue = Array.from(currentUserId).reduce(
            (hash, char) => (hash * 31 + char.charCodeAt(0)) % 360,
            0,
          );

          wsProvider.awareness.setLocalStateField('user', {
            name: currentUser?.name || 'Anonymous',
            color: `hsl(${userHue}, 100%, 50%)`,
            avatar: currentUser?.avatarUrl
          });

          wsProvider.awareness.on('change', () => {
            if (!activeRef.current) return;
            const states = wsProvider.awareness.getStates();
            const peers: CollaborativeDocState['remoteCursors'] = [];
            let count = 0;
            states.forEach((state: any, clientId: number) => {
              if (clientId !== wsProvider.awareness.clientID) {
                count++;
                const cursor = state.cursor;
                const user = state.user;
                if (cursor && user) {
                  peers.push({
                    userId: String(clientId),
                    name: user.name || 'Unknown',
                    color: user.color || '#888',
                    x: cursor.x,
                    y: cursor.y
                  });
                }
              }
            });
            setPeerCount(count);
            setRemoteCursors(peers);
          });
        } else {
          // Production: use Supabase Realtime for cursor sharing
          const { getSupabase } = await import('@/lib/supabase');
          if (!activeRef.current) return;

          const supabase = getSupabase();
          const channelName = `collab:${roomId}`;
          const channel = supabase.channel(channelName);

          const userHue = Array.from(currentUserId).reduce(
            (hash, char) => (hash * 31 + char.charCodeAt(0)) % 360,
            0,
          );
          const userColor = `hsl(${userHue}, 100%, 50%)`;
          const userName = currentUser?.name || 'Anonymous';

          // Track peers via presence
          const peersMap = new Map<string, { name: string; color: string; x: number; y: number }>();

          channel
            .on('presence', { event: 'sync' }, () => {
              if (!activeRef.current) return;
              const state = channel.presenceState();
              peersMap.clear();
              let count = 0;
              Object.values(state).forEach((presences: any) => {
                presences.forEach((p: any) => {
                  if (p.user_id !== currentUserId) {
                    count++;
                    peersMap.set(p.user_id, {
                      name: p.name || 'Unknown',
                      color: p.color || '#888',
                      x: p.cursor_x || 0,
                      y: p.cursor_y || 0,
                    });
                  }
                });
              });
              setPeerCount(count);
              setRemoteCursors(
                Array.from(peersMap.entries()).map(([id, data]) => ({
                  userId: id,
                  ...data,
                }))
              );
            })
            .on('presence', { event: 'join' }, () => {})
            .on('presence', { event: 'leave' }, () => {})
            .subscribe(async (status) => {
              if (!activeRef.current) return;
              if (status === 'SUBSCRIBED') {
                setConnected(true);
                await channel.track({
                  user_id: currentUserId,
                  name: userName,
                  color: userColor,
                  online_at: new Date().toISOString(),
                });
              } else {
                setConnected(false);
              }
            });

          // Store channel ref for cleanup
          wsProviderRef.current = { destroy: () => { supabase.removeChannel(channel); }, awareness: null };

          // Expose setLocalCursor for cursor broadcasting
          (wsProviderRef.current as any).awareness = {
            setLocalStateField: (field: string, value: any) => {
              if (field === 'cursor') {
                channel.track({
                  user_id: currentUserId,
                  name: userName,
                  color: userColor,
                  cursor_x: value.x,
                  cursor_y: value.y,
                  online_at: new Date().toISOString(),
                });
              }
            },
          };
        }
      }
      } catch (err) {
        console.error('[useCollaborativeDoc] Setup failed:', err);
      }
    };

    setup();

    return () => {
      activeRef.current = false;
      setSynced(false);
      setConnected(false);
      setPeerCount(0);
      setCanUndo(false);
      setCanRedo(false);
      setRemoteCursors([]);

      // Destroy in reverse order of creation
      if (wsProviderRef.current) {
        try { wsProviderRef.current.destroy(); } catch {}
        wsProviderRef.current = null;
      }
      if (providerRef.current) {
        try { providerRef.current.destroy(); } catch {}
        providerRef.current = null;
      }
      if (undoManagerRef.current) {
        try { undoManagerRef.current.destroy(); } catch {}
        undoManagerRef.current = null;
      }
      if (ydocRef.current) {
        try { ydocRef.current.destroy(); } catch {}
        ydocRef.current = null;
      }
      sharedTypesRef.current = {};
    };
  }, [roomId, workspaceMode, currentUserId]);

  return {
    synced,
    connected,
    peerCount,
    canUndo,
    canRedo,
    ydocRef,
    sharedTypesRef,
    undoManagerRef,
    wsProviderRef,
    undo,
    redo,
    setLocalCursor,
    remoteCursors,
  };
}
