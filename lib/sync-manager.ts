import { FS } from './fs';
import { db, collection, getDocs, setDoc, doc, deleteDoc } from './firebase';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

// Abstracted Storage interface
export interface StorageProvider {
  name: string;
  list: (collectionName: string) => Promise<any[]>;
  get: (collectionName: string, id: string) => Promise<any | null>;
  set: (collectionName: string, id: string, data: any) => Promise<void>;
  delete: (collectionName: string, id: string) => Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  name = 'local';
  
  async list(collectionName: string) {
    const files = await FS.readDir(collectionName);
    return Promise.all(
        files.map(async f => {
            const data = await FS.read(f.id);
            if (data?.content) {
                try {
                    return JSON.parse(data.content);
                } catch {
                    return null;
                }
            }
            return null;
        })
    );
  }

  async get(collectionName: string, id: string) {
    const file = await FS.read(`${collectionName}/${id}`);
    if (file && file.content) {
        return JSON.parse(file.content);
    }
    return null;
  }

  async set(collectionName: string, id: string, data: any) {
    await FS.write(`${collectionName}/${id}`, JSON.stringify(data));
  }

  async delete(collectionName: string, id: string) {
    await FS.delete(`${collectionName}/${id}`);
  }
}

export class FirebaseStorageProvider implements StorageProvider {
  name = 'firebase';
  
  async list(collectionName: string) {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async get(collectionName: string, id: string) {
    const d = await getDocs(collection(db, collectionName));
    const item = d.docs.find(doc => doc.id === id);
    return item ? { id: item.id, ...item.data() } : null;
  }

  async set(collectionName: string, id: string, data: any) {
    await setDoc(doc(db, collectionName, id), data, { merge: true });
  }

  async delete(collectionName: string, id: string) {
    await deleteDoc(doc(db, collectionName, id));
  }
}

export class SyncManager {
  private primary: StorageProvider;
  private secondary: StorageProvider;

  constructor(primary: StorageProvider, secondary: StorageProvider) {
    this.primary = primary;
    this.secondary = secondary;
  }

  // Basic document sync
  async push(collectionName: string) {
    const localData = await this.primary.list(collectionName);
    for (const item of localData) {
      if (item && item.id) {
        await this.secondary.set(collectionName, item.id, item);
      }
    }
  }

  async pull(collectionName: string) {
    const remoteData = await this.secondary.list(collectionName);
    for (const item of remoteData) {
      if (item && item.id) {
         await this.primary.set(collectionName, item.id, item);
      }
    }
  }
}

// Global CRDT Manager for real-time local-first sync
export class CRDTManager {
  private docs: Map<string, Y.Doc> = new Map();
  private providers: Map<string, IndexeddbPersistence> = new Map();

  getDoc(name: string): Y.Doc {
    if (this.docs.has(name)) return this.docs.get(name)!;

    const ydoc = new Y.Doc();
    this.docs.set(name, ydoc);

    // Initialize Local-First IndexedDB persistence
    if (typeof window !== 'undefined') {
      const provider = new IndexeddbPersistence(name, ydoc);
      this.providers.set(name, provider);
      
      provider.on('synced', () => {
        console.log(`[CRDT] ${name} loaded from local IndexedDB.`);
      });
    }

    return ydoc;
  }
  
  clearDoc(name: string) {
    if (this.providers.has(name)) {
      const provider = this.providers.get(name)!;
      provider.destroy();
      this.providers.delete(name);
    }
    if (this.docs.has(name)) {
      this.docs.delete(name);
    }
  }
}

export const localProvider = new LocalStorageProvider();
export const firebaseProvider = new FirebaseStorageProvider();
export const globalSyncManager = new SyncManager(localProvider, firebaseProvider);
export const crdtManager = new CRDTManager();
