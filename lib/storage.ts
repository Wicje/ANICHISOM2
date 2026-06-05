import { get, set, del } from 'idb-keyval';
import { db, doc, getDoc, setDoc, onSnapshot } from '@/lib/firebase';
import { Unsubscribe } from 'firebase/firestore';

export interface StorageAdapter {
  getDoc: <T>(collection: string, id: string) => Promise<T | null>;
  setDoc: <T>(collection: string, id: string, data: Partial<T>) => Promise<void>;
  subscribe: <T>(collection: string, id: string, onUpdate: (data: T | null) => void) => () => void;
  deleteDoc: (collection: string, id: string) => Promise<void>;
}

// 1. Firebase Adapter
export const FirebaseAdapter: StorageAdapter = {
  getDoc: async <T,>(collectionName: string, id: string) => {
    try {
      const snap = await getDoc(doc(db, collectionName, id));
      return snap.exists() ? (snap.data() as T) : null;
    } catch (e) {
      console.warn('Firebase getDoc failed', e);
      return null;
    }
  },
  setDoc: async <T,>(collectionName: string, id: string, data: Partial<T>) => {
    try {
      await setDoc(doc(db, collectionName, id), data, { merge: true });
    } catch (e) {
      console.warn('Firebase setDoc failed', e);
    }
  },
  subscribe: <T,>(collectionName: string, id: string, callback: (data: T | null) => void) => {
    return onSnapshot(doc(db, collectionName, id), (snap) => {
      callback(snap.exists() ? (snap.data() as T) : null);
    });
  },
  deleteDoc: async (collectionName: string, id: string) => {
     const { deleteDoc: fBDel, doc: fBDoc } = await import('firebase/firestore');
     await fBDel(fBDoc(db, collectionName, id));
  }
};

// 2. Local IndexedDB Adapter (Offline-First/Private Mode)
export const LocalAdapter: StorageAdapter = {
  getDoc: async <T,>(collectionName: string, id: string) => {
    const key = `anichisom_os_${collectionName}_${id}`;
    return (await get(key)) as T | null;
  },
  setDoc: async <T,>(collectionName: string, id: string, data: Partial<T>) => {
    const key = `anichisom_os_${collectionName}_${id}`;
    const existing = await get(key) || {};
    await set(key, { ...existing, ...data });
  },
  subscribe: <T,>(collectionName: string, id: string, callback: (data: T | null) => void) => {
    // Basic polling or one-time fetch for local since multiple tabs could change it
    // In a real robust system, use BroadcastChannel to sync tabs
    const key = `anichisom_os_${collectionName}_${id}`;
    let lastStr = '';
    
    // Initial fetch
    get(key).then(val => {
       lastStr = JSON.stringify(val);
       callback(val as T | null);
    });

    const interval = setInterval(async () => {
      const val = await get(key);
      const str = JSON.stringify(val);
      if (str !== lastStr) {
         lastStr = str;
         callback(val as T | null);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  },
  deleteDoc: async (collectionName: string, id: string) => {
    await del(`anichisom_os_${collectionName}_${id}`);
  }
};

// 3. Provider Factory
// Allows components to just say Storage.getDoc('code', 'roomId', 'private')
export const Storage = {
  getDoc: (collection: string, id: string, mode: 'private' | 'agency') => {
    const adapter = mode === 'agency' ? FirebaseAdapter : LocalAdapter;
    return adapter.getDoc(collection, id);
  },
  setDoc: (collection: string, id: string, data: any, mode: 'private' | 'agency') => {
    const adapter = mode === 'agency' ? FirebaseAdapter : LocalAdapter;
    return adapter.setDoc(collection, id, data);
  },
  subscribe: (collection: string, id: string, mode: 'private' | 'agency', callback: (data: any) => void) => {
    const adapter = mode === 'agency' ? FirebaseAdapter : LocalAdapter;
    return adapter.subscribe(collection, id, callback);
  },
  deleteDoc: (collection: string, id: string, mode: 'private' | 'agency') => {
    const adapter = mode === 'agency' ? FirebaseAdapter : LocalAdapter;
    return adapter.deleteDoc(collection, id);
  }
};
