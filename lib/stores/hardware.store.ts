/**
 * Hardware Zustand Store — hardware pack state for ANICHISOM2.
 *
 * Manages components, schematics, firmware versions, and suppliers.
 * Persists to IndexedDB via debounced writes.
 */
import { create } from 'zustand';
import { withPersistence } from '@/lib/stores/persisted-store';

// ─── Types ──────────────────────────────────────────────────────────────

export interface HwComponent {
  id: string;
  name: string;
  type: 'mcu' | 'sensor' | 'passive' | 'ic' | 'connector' | 'power' | 'other';
  value: string;
  footprint: string;
  datasheetUrl?: string;
  manufacturer: string;
  unitCost: number;
}

export interface BomItem {
  id: string;
  componentId: string;
  reference: string;
  qty: number;
  notes: string;
}

export interface Schematic {
  id: string;
  name: string;
  description: string;
  componentIds: string[];
  connections: Array<{
    from: string;
    fromPin: string;
    to: string;
    toPin: string;
    color?: string;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface FirmwareVersion {
  id: string;
  name: string;
  version: string;
  changelog: string;
  deployedAt?: number;
  status: 'draft' | 'staged' | 'deployed' | 'archived';
}

export interface Supplier {
  id: string;
  name: string;
  type: 'distributor' | 'manufacturer' | 'fab-house';
  apiKey?: string;
  linked: boolean;
  lastSync?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function generateId(): string {
  return `hw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── State ──────────────────────────────────────────────────────────────

interface HardwareState {
  components: Record<string, HwComponent>;
  schematics: Record<string, Schematic>;
  firmwareVersions: Record<string, FirmwareVersion>;
  suppliers: Record<string, Supplier>;
  activeSchematicId: string | null;

  // ─── Component CRUD ──────────────────────────────────────────────
  createComponent: (
    name: string,
    type: HwComponent['type'],
    value: string,
    footprint: string,
    manufacturer: string,
    unitCost: number,
    datasheetUrl?: string,
  ) => string;
  updateComponent: (id: string, updates: Partial<Omit<HwComponent, 'id'>>) => void;
  deleteComponent: (id: string) => void;
  getComponentsByType: (type: HwComponent['type']) => HwComponent[];

  // ─── Schematic CRUD ─────────────────────────────────────────────
  createSchematic: (name: string, description?: string) => string;
  updateSchematic: (
    id: string,
    updates: Partial<Omit<Schematic, 'id' | 'createdAt'>>,
  ) => void;
  deleteSchematic: (id: string) => void;
  getSchematicComponents: (schematicId: string) => HwComponent[];
  setActiveSchematic: (id: string | null) => void;

  // ─── Firmware CRUD ──────────────────────────────────────────────
  createFirmware: (name: string, version: string, changelog?: string) => string;
  updateFirmware: (
    id: string,
    updates: Partial<Omit<FirmwareVersion, 'id'>>,
  ) => void;
  deleteFirmware: (id: string) => void;
  getDeployedFirmware: () => FirmwareVersion | null;

  // ─── Supplier CRUD ──────────────────────────────────────────────
  addSupplier: (name: string, type: Supplier['type']) => string;
  updateSupplier: (id: string, updates: Partial<Omit<Supplier, 'id'>>) => void;
  deleteSupplier: (id: string) => void;
  linkSupplier: (id: string) => void;
  unlinkSupplier: (id: string) => void;
}

export const useHardwareStore = create<HardwareState>((set, get) => ({
  components: {},
  schematics: {},
  firmwareVersions: {},
  suppliers: {},
  activeSchematicId: null,

  // ─── Component CRUD ──────────────────────────────────────────────

  createComponent: (name, type, value, footprint, manufacturer, unitCost, datasheetUrl) => {
    const id = generateId();
    const component: HwComponent = {
      id,
      name,
      type,
      value,
      footprint,
      manufacturer,
      unitCost,
      datasheetUrl,
    };
    set((s) => {
      const components = { ...s.components, [id]: component };
      return { components };
    });
    return id;
  },

  updateComponent: (id, updates) => {
    set((s) => {
      const existing = s.components[id];
      if (!existing) return s;
      const components = {
        ...s.components,
        [id]: { ...existing, ...updates },
      };
      return { components };
    });
  },

  deleteComponent: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.components;
      return { components: rest };
    });
  },

  getComponentsByType: (type) => {
    return Object.values(get().components).filter((c) => c.type === type);
  },

  // ─── Schematic CRUD ─────────────────────────────────────────────

  createSchematic: (name, description = '') => {
    const id = generateId();
    const schematic: Schematic = {
      id,
      name,
      description,
      componentIds: [],
      connections: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((s) => {
      const schematics = { ...s.schematics, [id]: schematic };
      return { schematics };
    });
    return id;
  },

  updateSchematic: (id, updates) => {
    set((s) => {
      const existing = s.schematics[id];
      if (!existing) return s;
      const schematics = {
        ...s.schematics,
        [id]: { ...existing, ...updates, updatedAt: Date.now() },
      };
      return { schematics };
    });
  },

  deleteSchematic: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.schematics;
      const activeSchematicId = s.activeSchematicId === id ? null : s.activeSchematicId;
      return { schematics: rest, activeSchematicId };
    });
  },

  getSchematicComponents: (schematicId) => {
    const schematic = get().schematics[schematicId];
    if (!schematic) return [];
    return schematic.componentIds
      .map((cid) => get().components[cid])
      .filter((c): c is HwComponent => Boolean(c));
  },

  setActiveSchematic: (id) => {
    set({ activeSchematicId: id });
  },

  // ─── Firmware CRUD ──────────────────────────────────────────────

  createFirmware: (name, version, changelog = '') => {
    const id = generateId();
    const fw: FirmwareVersion = {
      id,
      name,
      version,
      changelog,
      status: 'draft',
    };
    set((s) => {
      const firmwareVersions = { ...s.firmwareVersions, [id]: fw };
      return { firmwareVersions };
    });
    return id;
  },

  updateFirmware: (id, updates) => {
    set((s) => {
      const existing = s.firmwareVersions[id];
      if (!existing) return s;
      const firmwareVersions = {
        ...s.firmwareVersions,
        [id]: { ...existing, ...updates },
      };
      return { firmwareVersions };
    });
  },

  deleteFirmware: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.firmwareVersions;
      return { firmwareVersions: rest };
    });
  },

  getDeployedFirmware: () => {
    const all = Object.values(get().firmwareVersions);
    return all.find((fw) => fw.status === 'deployed') || null;
  },

  // ─── Supplier CRUD ──────────────────────────────────────────────

  addSupplier: (name, type) => {
    const id = generateId();
    const supplier: Supplier = {
      id,
      name,
      type,
      linked: false,
    };
    set((s) => {
      const suppliers = { ...s.suppliers, [id]: supplier };
      return { suppliers };
    });
    return id;
  },

  updateSupplier: (id, updates) => {
    set((s) => {
      const existing = s.suppliers[id];
      if (!existing) return s;
      const suppliers = {
        ...s.suppliers,
        [id]: { ...existing, ...updates },
      };
      return { suppliers };
    });
  },

  deleteSupplier: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.suppliers;
      return { suppliers: rest };
    });
  },

  linkSupplier: (id) => {
    set((s) => {
      const supplier = s.suppliers[id];
      if (!supplier || supplier.linked) return s;
      const suppliers = {
        ...s.suppliers,
        [id]: { ...supplier, linked: true, lastSync: Date.now() },
      };
      return { suppliers };
    });
  },

  unlinkSupplier: (id) => {
    set((s) => {
      const supplier = s.suppliers[id];
      if (!supplier) return s;
      const suppliers = {
        ...s.suppliers,
        [id]: { ...supplier, linked: false },
      };
      return { suppliers };
    });
  },
}));

withPersistence(useHardwareStore, 'hardware-state', ['components', 'schematics', 'firmwareVersions', 'suppliers', 'activeSchematicId']);
