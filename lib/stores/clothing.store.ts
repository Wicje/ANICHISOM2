/**
 * Clothing Zustand Store — design, pattern, production & collection state.
 *
 * Manages designs, patterns, production orders, and collections.
 * Persists to IndexedDB via debounced writes.
 */
import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';

// ─── Types ──────────────────────────────────────────────────────────────

export interface Design {
  id: string;
  name: string;
  category: 'top' | 'bottom' | 'outerwear' | 'accessory' | 'footwear';
  status: 'sketch' | 'draft' | 'prototype' | 'production' | 'archived';
  sketchData?: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface Pattern {
  id: string;
  designId: string;
  name: string;
  sizes: string[];
  fabricType: string;
  yardage: number;
  gradeRules?: Record<string, { chest?: number; waist?: number; length?: number }>;
  createdAt: number;
}

export interface ProductionOrder {
  id: string;
  designId: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'in-production' | 'shipped' | 'delivered';
  manufacturer: string;
  unitCost: number;
  dueDate: string;
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'resort';
  designIds: string[];
  status: 'planning' | 'active' | 'completed';
  createdAt: number;
}

// ─── Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'anichisom-clothing-state';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(state: ClothingState) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const data: PersistedClothing = {
      designs: state.designs,
      patterns: state.patterns,
      orders: state.orders,
      collections: state.collections,
      activeDesignId: state.activeDesignId,
      activeCollectionId: state.activeCollectionId,
    };
    idbSet(STORAGE_KEY, data).catch((e: unknown) => {
      console.warn('[ClothingStore] Failed to persist:', e);
    });
  }, 2000);
}

interface PersistedClothing {
  designs: Record<string, Design>;
  patterns: Record<string, Pattern>;
  orders: Record<string, ProductionOrder>;
  collections: Record<string, Collection>;
  activeDesignId: string | null;
  activeCollectionId: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function generateId(): string {
  return `clothing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── State ──────────────────────────────────────────────────────────────

interface ClothingState {
  designs: Record<string, Design>;
  patterns: Record<string, Pattern>;
  orders: Record<string, ProductionOrder>;
  collections: Record<string, Collection>;
  activeDesignId: string | null;
  activeCollectionId: string | null;

  // ─── Design CRUD ──────────────────────────────────────────────────
  createDesign: (name: string, category: Design['category']) => string;
  updateDesign: (id: string, updates: Partial<Omit<Design, 'id' | 'createdAt'>>) => void;
  deleteDesign: (id: string) => void;
  getDesignsByStatus: (status: Design['status']) => Design[];

  // ─── Pattern CRUD ─────────────────────────────────────────────────
  createPattern: (designId: string, name: string, sizes: string[], fabricType: string, yardage: number) => string;
  updatePattern: (id: string, updates: Partial<Omit<Pattern, 'id' | 'createdAt'>>) => void;
  deletePattern: (id: string) => void;
  getPatternsForDesign: (designId: string) => Pattern[];

  // ─── Order CRUD ───────────────────────────────────────────────────
  createOrder: (designId: string, quantity: number, manufacturer: string, unitCost: number, dueDate: string) => string;
  updateOrder: (id: string, updates: Partial<Omit<ProductionOrder, 'id' | 'createdAt'>>) => void;
  deleteOrder: (id: string) => void;

  // ─── Collection CRUD ──────────────────────────────────────────────
  createCollection: (name: string, season: Collection['season']) => string;
  updateCollection: (id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>) => void;
  deleteCollection: (id: string) => void;
  addDesignToCollection: (collectionId: string, designId: string) => void;
  removeDesignFromCollection: (collectionId: string, designId: string) => void;

  // ─── Persistence ─────────────────────────────────────────────────
  hydrate: () => Promise<void>;
}

export const useClothingStore = create<ClothingState>((set, get) => ({
  designs: {},
  patterns: {},
  orders: {},
  collections: {},
  activeDesignId: null,
  activeCollectionId: null,

  // ─── Design CRUD ──────────────────────────────────────────────────

  createDesign: (name, category) => {
    const id = generateId();
    const now = Date.now();
    const design: Design = {
      id,
      name,
      category,
      status: 'sketch',
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const designs = { ...s.designs, [id]: design };
      schedulePersist({ ...s, designs });
      return { designs, activeDesignId: id };
    });
    return id;
  },

  updateDesign: (id, updates) => {
    set((s) => {
      const existing = s.designs[id];
      if (!existing) return s;
      const designs = {
        ...s.designs,
        [id]: { ...existing, ...updates, updatedAt: Date.now() },
      };
      schedulePersist({ ...s, designs });
      return { designs };
    });
  },

  deleteDesign: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.designs;
      const activeDesignId = s.activeDesignId === id ? null : s.activeDesignId;
      schedulePersist({ ...s, designs: rest, activeDesignId });
      return { designs: rest, activeDesignId };
    });
  },

  getDesignsByStatus: (status) => {
    return Object.values(get().designs).filter((d) => d.status === status);
  },

  // ─── Pattern CRUD ─────────────────────────────────────────────────

  createPattern: (designId, name, sizes, fabricType, yardage) => {
    const id = generateId();
    const pattern: Pattern = {
      id,
      designId,
      name,
      sizes,
      fabricType,
      yardage,
      createdAt: Date.now(),
    };
    set((s) => {
      const patterns = { ...s.patterns, [id]: pattern };
      schedulePersist({ ...s, patterns });
      return { patterns };
    });
    return id;
  },

  updatePattern: (id, updates) => {
    set((s) => {
      const existing = s.patterns[id];
      if (!existing) return s;
      const patterns = {
        ...s.patterns,
        [id]: { ...existing, ...updates },
      };
      schedulePersist({ ...s, patterns });
      return { patterns };
    });
  },

  deletePattern: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.patterns;
      schedulePersist({ ...s, patterns: rest });
      return { patterns: rest };
    });
  },

  getPatternsForDesign: (designId) => {
    return Object.values(get().patterns).filter((p) => p.designId === designId);
  },

  // ─── Order CRUD ───────────────────────────────────────────────────

  createOrder: (designId, quantity, manufacturer, unitCost, dueDate) => {
    const id = generateId();
    const order: ProductionOrder = {
      id,
      designId,
      quantity,
      status: 'pending',
      manufacturer,
      unitCost,
      dueDate,
      createdAt: Date.now(),
    };
    set((s) => {
      const orders = { ...s.orders, [id]: order };
      schedulePersist({ ...s, orders });
      return { orders };
    });
    return id;
  },

  updateOrder: (id, updates) => {
    set((s) => {
      const existing = s.orders[id];
      if (!existing) return s;
      const orders = {
        ...s.orders,
        [id]: { ...existing, ...updates },
      };
      schedulePersist({ ...s, orders });
      return { orders };
    });
  },

  deleteOrder: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.orders;
      schedulePersist({ ...s, orders: rest });
      return { orders: rest };
    });
  },

  // ─── Collection CRUD ──────────────────────────────────────────────

  createCollection: (name, season) => {
    const id = generateId();
    const collection: Collection = {
      id,
      name,
      season,
      designIds: [],
      status: 'planning',
      createdAt: Date.now(),
    };
    set((s) => {
      const collections = { ...s.collections, [id]: collection };
      schedulePersist({ ...s, collections });
      return { collections, activeCollectionId: id };
    });
    return id;
  },

  updateCollection: (id, updates) => {
    set((s) => {
      const existing = s.collections[id];
      if (!existing) return s;
      const collections = {
        ...s.collections,
        [id]: { ...existing, ...updates },
      };
      schedulePersist({ ...s, collections });
      return { collections };
    });
  },

  deleteCollection: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.collections;
      const activeCollectionId = s.activeCollectionId === id ? null : s.activeCollectionId;
      schedulePersist({ ...s, collections: rest, activeCollectionId });
      return { collections: rest, activeCollectionId };
    });
  },

  addDesignToCollection: (collectionId, designId) => {
    set((s) => {
      const collection = s.collections[collectionId];
      if (!collection || collection.designIds.includes(designId)) return s;
      const collections = {
        ...s.collections,
        [collectionId]: {
          ...collection,
          designIds: [...collection.designIds, designId],
        },
      };
      schedulePersist({ ...s, collections });
      return { collections };
    });
  },

  removeDesignFromCollection: (collectionId, designId) => {
    set((s) => {
      const collection = s.collections[collectionId];
      if (!collection) return s;
      const collections = {
        ...s.collections,
        [collectionId]: {
          ...collection,
          designIds: collection.designIds.filter((dId) => dId !== designId),
        },
      };
      schedulePersist({ ...s, collections });
      return { collections };
    });
  },

  // ─── Persistence ─────────────────────────────────────────────────

  hydrate: async () => {
    try {
      const data = await idbGet<PersistedClothing>(STORAGE_KEY);
      if (data) {
        set({
          designs: data.designs || {},
          patterns: data.patterns || {},
          orders: data.orders || {},
          collections: data.collections || {},
          activeDesignId: data.activeDesignId || null,
          activeCollectionId: data.activeCollectionId || null,
        });
      }
    } catch (e) {
      console.warn('[ClothingStore] Failed to hydrate:', e);
    }
  },
}));
