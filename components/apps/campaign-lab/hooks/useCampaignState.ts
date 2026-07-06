import { useState, useEffect } from 'react';
import { Page, Block } from '../types';
import { DEFAULT_PAGES } from '../data';

export function useCampaignState(roomId: string, workspaceMode: string, currentUser: any, windowId: string) {
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [awarenessInfo, setAwarenessInfo] = useState<any[]>([]);

  useEffect(() => {
    setIsLoaded(false);
    
    import('yjs').then(Y => {
        import('y-indexeddb').then(({ IndexeddbPersistence }) => {
            const ydoc = new Y.Doc();
            const yPages = ydoc.getMap<Page>('pages');
            const provider = new IndexeddbPersistence(roomId, ydoc);
            
            const syncUiToYjs = () => {
                const arr = Array.from(yPages.values());
                arr.sort((a, b) => a.updatedAt - b.updatedAt);
                setPages(arr);
            };
            
            provider.on('synced', () => {
                if (yPages.size === 0) {
                    DEFAULT_PAGES.forEach(p => yPages.set(p.id, p));
                }
                syncUiToYjs();
                setIsLoaded(true);
            });
            
            yPages.observe(syncUiToYjs);

            let wsProvider: any = null;
            if (workspaceMode === 'agency') {
                import('y-websocket').then(({ WebsocketProvider }) => {
                   const wsUrl = typeof window !== 'undefined' && window.location.protocol === 'https:' 
                      ? `wss://${window.location.hostname}:1234` 
                      : 'ws://localhost:1234';
                      
                   wsProvider = new WebsocketProvider(wsUrl, roomId, ydoc);
                   wsProvider.awareness.setLocalStateField('user', {
                     name: currentUser?.name || 'Anonymous',
                     color: `hsl(${Math.round(Math.random() * 360)}, 100%, 50%)`,
                     avatar: currentUser?.avatarUrl
                   });
                   
                   wsProvider.awareness.on('change', () => {
                     const states = Array.from(wsProvider.awareness.getStates().entries())
                       .filter((entry: any) => entry[0] !== wsProvider.doc.clientID && entry[1].user && entry[1].cursor)
                       .map((entry: any) => ({ clientId: entry[0], ...entry[1] }));
                     setAwarenessInfo(states);
                   });
                   
                   (globalThis.window as any)[`ws_${windowId}`] = wsProvider;
                });
            }

            (globalThis.window as any)[`ypages_${windowId}`] = yPages;

            return () => {
                provider.destroy();
                if (wsProvider) wsProvider.destroy();
                delete (globalThis.window as any)[`ws_${windowId}`];
                delete (globalThis.window as any)[`ypages_${windowId}`];
            };
        });
    });
  }, [roomId, workspaceMode, currentUser, windowId]);

  const updateYPage = (newVals: Partial<Page> & { id: string }) => {
     const yPages = (globalThis.window as any)[`ypages_${windowId}`];
     if (yPages) {
        const existing = yPages.get(newVals.id) || {};
        yPages.set(newVals.id, { ...existing, ...newVals, updatedAt: Date.now() });
     }
  };
  
  const deleteYPage = (id: string) => {
      const yPages = (globalThis.window as any)[`ypages_${windowId}`];
      if (yPages) yPages.delete(id);
  };

  return {
    pages,
    isLoaded,
    awarenessInfo,
    updateYPage,
    deleteYPage
  };
}
