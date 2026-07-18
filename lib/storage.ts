import { get, set, del } from 'idb-keyval';
import { getSupabase } from '@/lib/supabase';

export interface IStorageAdapter {
  getDoc: <T>(collection: string, id: string) => Promise<T | null>;
  setDoc: <T>(collection: string, id: string, data: Partial<T>) => Promise<void>;
  subscribe: <T>(collection: string, id: string, onUpdate: (data: T | null) => void) => () => void;
  deleteDoc: (collection: string, id: string) => Promise<void>;
}

const LOCAL_STORAGE_CHANNEL = 'continuaos-local-storage';
type LocalStorageMessage = {
  type: 'set' | 'delete';
  key: string;
  value?: unknown;
};

function createLocalStorageChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(LOCAL_STORAGE_CHANNEL);
}

// 1. Supabase Adapter
export const SupabaseAdapter: IStorageAdapter = {
  getDoc: async <T,>(collectionName: string, id: string) => {
    try {
      const { data, error } = await getSupabase()
        .from(collectionName)
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      return data as T;
    } catch (e) {
      console.warn('Supabase getDoc failed', e);
      return null;
    }
  },
  setDoc: async <T,>(collectionName: string, id: string, data: Partial<T>) => {
    try {
      await getSupabase()
        .from(collectionName)
        .upsert({ id, ...data }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase setDoc failed', e);
    }
  },
  subscribe: <T,>(collectionName: string, id: string, callback: (data: T | null) => void) => {
    // Initial fetch
    getSupabase()
      .from(collectionName)
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        callback((data as T) || null);
      });

    // Realtime subscription
    const channel = getSupabase()
      .channel(`${collectionName}:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: collectionName, filter: `id=eq.${id}` },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            callback(null);
          } else {
            callback(payload.new as T);
          }
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  },
  deleteDoc: async (collectionName: string, id: string) => {
    try {
      await getSupabase()
        .from(collectionName)
        .delete()
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteDoc failed', e);
    }
  }
};

// 2. Local IndexedDB Adapter (Offline-First/Private Mode)
export const LocalAdapter: IStorageAdapter = {
  getDoc: async <T,>(collectionName: string, id: string) => {
    const key = `continuaos_os_${collectionName}_${id}`;
    return (await get(key)) as T | null;
  },
  setDoc: async <T,>(collectionName: string, id: string, data: Partial<T>) => {
    const key = `continuaos_os_${collectionName}_${id}`;
    const existing = await get(key) || {};
    const value = { ...existing, ...data };
    await set(key, value);

    const channel = createLocalStorageChannel();
    channel?.postMessage({ type: 'set', key, value } satisfies LocalStorageMessage);
    channel?.close();
  },
  subscribe: <T,>(collectionName: string, id: string, callback: (data: T | null) => void) => {
    const key = `continuaos_os_${collectionName}_${id}`;
    const channel = createLocalStorageChannel();
    let active = true;
    
    // Initial fetch
    get(key).then(val => {
       if (active) callback(val as T | null);
    });

    if (channel) {
      channel.onmessage = (event: MessageEvent<LocalStorageMessage>) => {
        if (!active || event.data?.key !== key) return;
        callback((event.data.type === 'delete' ? null : event.data.value) as T | null);
      };
    }
    
    return () => {
      active = false;
      channel?.close();
    };
  },
  deleteDoc: async (collectionName: string, id: string) => {
    const key = `continuaos_os_${collectionName}_${id}`;
    await del(key);

    const channel = createLocalStorageChannel();
    channel?.postMessage({ type: 'delete', key } satisfies LocalStorageMessage);
    channel?.close();
  }
};

// 3. Provider Factory
// Allows components to just say Storage.getDoc('code', 'roomId', 'private')
export const Storage = {
  getDoc: <T = any>(collection: string, id: string, mode: 'private' | 'agency'): Promise<T | null> => {
    const adapter = mode === 'agency' ? SupabaseAdapter : LocalAdapter;
    return adapter.getDoc<T>(collection, id);
  },
  setDoc: (collection: string, id: string, data: any, mode: 'private' | 'agency') => {
    const adapter = mode === 'agency' ? SupabaseAdapter : LocalAdapter;
    return adapter.setDoc(collection, id, data);
  },
  subscribe: (collection: string, id: string, mode: 'private' | 'agency', callback: (data: any) => void) => {
    const adapter = mode === 'agency' ? SupabaseAdapter : LocalAdapter;
    return adapter.subscribe(collection, id, callback);
  },
  deleteDoc: (collection: string, id: string, mode: 'private' | 'agency') => {
    const adapter = mode === 'agency' ? SupabaseAdapter : LocalAdapter;
    return adapter.deleteDoc(collection, id);
  }
};

export class StorageAdapter {
  collection: string;
  mode: 'private' | 'agency';
  
  constructor(collection: string, mode: 'private' | 'agency') {
    this.collection = collection;
    this.mode = mode;
  }
  
  async get<T = any>(id: string): Promise<T | null> {
    return Storage.getDoc<T>(this.collection, id, this.mode);
  }
  
  async set(id: string, data: any) {
    return Storage.setDoc(this.collection, id, data, this.mode);
  }
  
  subscribe(id: string, callback: (data: any) => void) {
    return Storage.subscribe(this.collection, id, this.mode, callback);
  }
  
  async delete(id: string) {
    return Storage.deleteDoc(this.collection, id, this.mode);
  }
}
