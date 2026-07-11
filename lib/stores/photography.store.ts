/**
 * Photography Zustand Store — photography state for the Photography Pack.
 *
 * Manages shoots, galleries, clients, print orders, and watermark presets.
 * Persists to IndexedDB via debounced writes.
 */
import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';

// ─── Types ──────────────────────────────────────────────────────────────

export interface Shoot {
  id: string;
  name: string;
  clientId?: string;
  date: string;
  location: string;
  status: 'planned' | 'in-progress' | 'completed' | 'post-processed';
  imageCount: number;
  notes: string;
  tags: string[];
  createdAt: number;
}

export interface PhotoGallery {
  id: string;
  shootId?: string;
  name: string;
  status: 'draft' | 'reviewing' | 'delivered' | 'archived';
  pin: string;
  expiresAt: number;
  imageIds: string[];
  downloadCount: number;
  shareUrl: string;
  createdAt: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  shootIds: string[];
  totalSpent: number;
  notes: string;
  createdAt: number;
}

export interface PrintOrder {
  id: string;
  galleryId: string;
  items: Array<{
    size: string;
    quantity: number;
    finish: 'matte' | 'glossy' | 'metallic' | 'canvas';
    price: number;
  }>;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  total: number;
  createdAt: number;
}

export interface WatermarkPreset {
  id: string;
  name: string;
  text: string;
  opacity: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize: number;
}

// ─── Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'anichisom-photography-state';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(state: PhotographyState) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const data: PersistedPhotography = {
      shoots: state.shoots,
      galleries: state.galleries,
      clients: state.clients,
      printOrders: state.printOrders,
      watermarkPresets: state.watermarkPresets,
      activeShootId: state.activeShootId,
      activeClientId: state.activeClientId,
      activeWatermarkPresetId: state.activeWatermarkPresetId,
    };
    idbSet(STORAGE_KEY, data).catch((e: unknown) => {
      console.warn('[PhotographyStore] Failed to persist:', e);
    });
  }, 2000);
}

export interface PersistedPhotography {
  shoots: Record<string, Shoot>;
  galleries: Record<string, PhotoGallery>;
  clients: Record<string, Client>;
  printOrders: Record<string, PrintOrder>;
  watermarkPresets: Record<string, WatermarkPreset>;
  activeShootId: string | null;
  activeClientId: string | null;
  activeWatermarkPresetId: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── State ──────────────────────────────────────────────────────────────

interface PhotographyState {
  shoots: Record<string, Shoot>;
  galleries: Record<string, PhotoGallery>;
  clients: Record<string, Client>;
  printOrders: Record<string, PrintOrder>;
  watermarkPresets: Record<string, WatermarkPreset>;

  activeShootId: string | null;
  activeClientId: string | null;
  activeWatermarkPresetId: string | null;

  // ─── Shoot CRUD ──────────────────────────────────────────────────
  createShoot: (name: string, date: string, location: string) => string;
  updateShoot: (id: string, updates: Partial<Omit<Shoot, 'id' | 'createdAt'>>) => void;
  deleteShoot: (id: string) => void;
  setActiveShoot: (id: string | null) => void;
  getActiveShoot: () => Shoot | null;
  getShootsByStatus: (status: Shoot['status']) => Shoot[];

  // ─── Gallery CRUD ────────────────────────────────────────────────
  createGallery: (name: string, shootId?: string) => string;
  updateGallery: (id: string, updates: Partial<Omit<PhotoGallery, 'id' | 'createdAt'>>) => void;
  deleteGallery: (id: string) => void;
  getGalleriesByShoot: (shootId: string) => PhotoGallery[];
  getGalleriesByStatus: (status: PhotoGallery['status']) => PhotoGallery[];

  // ─── Client CRUD ─────────────────────────────────────────────────
  createClient: (name: string, email: string, phone: string) => string;
  updateClient: (id: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>) => void;
  deleteClient: (id: string) => void;
  setActiveClient: (id: string | null) => void;
  getActiveClient: () => Client | null;
  getClientShoots: (clientId: string) => Shoot[];

  // ─── Print Order CRUD ────────────────────────────────────────────
  createPrintOrder: (galleryId: string, items: PrintOrder['items']) => string;
  updatePrintOrder: (id: string, updates: Partial<Omit<PrintOrder, 'id' | 'createdAt'>>) => void;
  deletePrintOrder: (id: string) => void;
  getPrintOrdersByGallery: (galleryId: string) => PrintOrder[];
  getPrintOrdersByStatus: (status: PrintOrder['status']) => PrintOrder[];

  // ─── Watermark Preset CRUD ───────────────────────────────────────
  createWatermarkPreset: (name: string, text: string) => string;
  updateWatermarkPreset: (id: string, updates: Partial<Omit<WatermarkPreset, 'id'>>) => void;
  deleteWatermarkPreset: (id: string) => void;
  getActiveWatermarkPreset: () => WatermarkPreset | null;
  setActiveWatermarkPreset: (id: string | null) => void;

  // ─── Persistence ─────────────────────────────────────────────────
  hydrate: () => Promise<void>;
}

export const usePhotographyStore = create<PhotographyState>((set, get) => ({
  shoots: {},
  galleries: {},
  clients: {},
  printOrders: {},
  watermarkPresets: {},

  activeShootId: null,
  activeClientId: null,
  activeWatermarkPresetId: null,

  // ─── Shoot CRUD ──────────────────────────────────────────────────

  createShoot: (name, date, location) => {
    const id = generateId('shoot');
    const shoot: Shoot = {
      id,
      name,
      date,
      location,
      status: 'planned',
      imageCount: 0,
      notes: '',
      tags: [],
      createdAt: Date.now(),
    };
    set((s) => {
      const shoots = { ...s.shoots, [id]: shoot };
      schedulePersist({ ...s, shoots });
      return { shoots };
    });
    return id;
  },

  updateShoot: (id, updates) => {
    set((s) => {
      const existing = s.shoots[id];
      if (!existing) return s;
      const shoots = { ...s.shoots, [id]: { ...existing, ...updates } };
      schedulePersist({ ...s, shoots });
      return { shoots };
    });
  },

  deleteShoot: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.shoots;
      const activeShootId = s.activeShootId === id ? null : s.activeShootId;
      schedulePersist({ ...s, shoots: rest, activeShootId });
      return { shoots: rest, activeShootId };
    });
  },

  setActiveShoot: (id) => {
    set((s) => {
      schedulePersist({ ...s, activeShootId: id });
      return { activeShootId: id };
    });
  },

  getActiveShoot: () => {
    const s = get();
    return s.activeShootId ? s.shoots[s.activeShootId] || null : null;
  },

  getShootsByStatus: (status) => {
    return Object.values(get().shoots).filter((s) => s.status === status);
  },

  // ─── Gallery CRUD ────────────────────────────────────────────────

  createGallery: (name, shootId) => {
    const id = generateId('gallery');
    const gallery: PhotoGallery = {
      id,
      shootId,
      name,
      status: 'draft',
      pin: Math.random().toString(36).slice(2, 8),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      imageIds: [],
      downloadCount: 0,
      shareUrl: `https://share.anichisom.com/${id}`,
      createdAt: Date.now(),
    };
    set((s) => {
      const galleries = { ...s.galleries, [id]: gallery };
      schedulePersist({ ...s, galleries });
      return { galleries };
    });
    return id;
  },

  updateGallery: (id, updates) => {
    set((s) => {
      const existing = s.galleries[id];
      if (!existing) return s;
      const galleries = { ...s.galleries, [id]: { ...existing, ...updates } };
      schedulePersist({ ...s, galleries });
      return { galleries };
    });
  },

  deleteGallery: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.galleries;
      schedulePersist({ ...s, galleries: rest });
      return { galleries: rest };
    });
  },

  getGalleriesByShoot: (shootId) => {
    return Object.values(get().galleries).filter((g) => g.shootId === shootId);
  },

  getGalleriesByStatus: (status) => {
    return Object.values(get().galleries).filter((g) => g.status === status);
  },

  // ─── Client CRUD ─────────────────────────────────────────────────

  createClient: (name, email, phone) => {
    const id = generateId('client');
    const client: Client = {
      id,
      name,
      email,
      phone,
      shootIds: [],
      totalSpent: 0,
      notes: '',
      createdAt: Date.now(),
    };
    set((s) => {
      const clients = { ...s.clients, [id]: client };
      schedulePersist({ ...s, clients });
      return { clients };
    });
    return id;
  },

  updateClient: (id, updates) => {
    set((s) => {
      const existing = s.clients[id];
      if (!existing) return s;
      const clients = { ...s.clients, [id]: { ...existing, ...updates } };
      schedulePersist({ ...s, clients });
      return { clients };
    });
  },

  deleteClient: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.clients;
      const activeClientId = s.activeClientId === id ? null : s.activeClientId;
      schedulePersist({ ...s, clients: rest, activeClientId });
      return { clients: rest, activeClientId };
    });
  },

  setActiveClient: (id) => {
    set((s) => {
      schedulePersist({ ...s, activeClientId: id });
      return { activeClientId: id };
    });
  },

  getActiveClient: () => {
    const s = get();
    return s.activeClientId ? s.clients[s.activeClientId] || null : null;
  },

  getClientShoots: (clientId) => {
    const client = get().clients[clientId];
    if (!client) return [];
    return client.shootIds.map((sid) => get().shoots[sid]).filter(Boolean);
  },

  // ─── Print Order CRUD ────────────────────────────────────────────

  createPrintOrder: (galleryId, items) => {
    const id = generateId('order');
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order: PrintOrder = {
      id,
      galleryId,
      items,
      status: 'pending',
      total,
      createdAt: Date.now(),
    };
    set((s) => {
      const printOrders = { ...s.printOrders, [id]: order };
      schedulePersist({ ...s, printOrders });
      return { printOrders };
    });
    return id;
  },

  updatePrintOrder: (id, updates) => {
    set((s) => {
      const existing = s.printOrders[id];
      if (!existing) return s;
      const printOrders = { ...s.printOrders, [id]: { ...existing, ...updates } };
      schedulePersist({ ...s, printOrders });
      return { printOrders };
    });
  },

  deletePrintOrder: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.printOrders;
      schedulePersist({ ...s, printOrders: rest });
      return { printOrders: rest };
    });
  },

  getPrintOrdersByGallery: (galleryId) => {
    return Object.values(get().printOrders).filter((o) => o.galleryId === galleryId);
  },

  getPrintOrdersByStatus: (status) => {
    return Object.values(get().printOrders).filter((o) => o.status === status);
  },

  // ─── Watermark Preset CRUD ───────────────────────────────────────

  createWatermarkPreset: (name, text) => {
    const id = generateId('watermark');
    const preset: WatermarkPreset = {
      id,
      name,
      text,
      opacity: 0.5,
      position: 'bottom-right',
      fontSize: 24,
    };
    set((s) => {
      const watermarkPresets = { ...s.watermarkPresets, [id]: preset };
      schedulePersist({ ...s, watermarkPresets });
      return { watermarkPresets };
    });
    return id;
  },

  updateWatermarkPreset: (id, updates) => {
    set((s) => {
      const existing = s.watermarkPresets[id];
      if (!existing) return s;
      const watermarkPresets = { ...s.watermarkPresets, [id]: { ...existing, ...updates } };
      schedulePersist({ ...s, watermarkPresets });
      return { watermarkPresets };
    });
  },

  deleteWatermarkPreset: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.watermarkPresets;
      const activeWatermarkPresetId = s.activeWatermarkPresetId === id ? null : s.activeWatermarkPresetId;
      schedulePersist({ ...s, watermarkPresets: rest, activeWatermarkPresetId });
      return { watermarkPresets: rest, activeWatermarkPresetId };
    });
  },

  getActiveWatermarkPreset: () => {
    const s = get();
    return s.activeWatermarkPresetId ? s.watermarkPresets[s.activeWatermarkPresetId] || null : null;
  },

  setActiveWatermarkPreset: (id) => {
    set((s) => {
      schedulePersist({ ...s, activeWatermarkPresetId: id });
      return { activeWatermarkPresetId: id };
    });
  },

  // ─── Persistence ─────────────────────────────────────────────────

  hydrate: async () => {
    try {
      const data = await idbGet<PersistedPhotography>(STORAGE_KEY);
      if (data) {
        set({
          shoots: data.shoots || {},
          galleries: data.galleries || {},
          clients: data.clients || {},
          printOrders: data.printOrders || {},
          watermarkPresets: data.watermarkPresets || {},
          activeShootId: data.activeShootId || null,
          activeClientId: data.activeClientId || null,
          activeWatermarkPresetId: data.activeWatermarkPresetId || null,
        });
      }
    } catch (e) {
      console.warn('[PhotographyStore] Failed to hydrate:', e);
    }
  },
}));
