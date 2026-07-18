/**
 * Brand Zustand Store — brand guidelines state for the Creative Pack.
 *
 * Manages colors, typography, voice, logos, and usage rules.
 * Persists to IndexedDB via debounced writes.
 */
import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { generateId } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

export interface BrandColor {
  id: string;
  hex: string;
  name: string;
  role: 'primary' | 'secondary' | 'accent' | 'neutral' | 'background';
}

export interface BrandTypography {
  headingFont: string;
  bodyFont: string;
  accentFont: string;
  headingWeight: string;
  bodyWeight: string;
}

export interface BrandVoice {
  tone: string;
  personality: string[];
  dos: string[];
  donts: string[];
}

export interface BrandLogo {
  id: string;
  name: string;
  variant: 'primary' | 'secondary' | 'favicon' | 'icon';
  dataUrl: string;
}

export interface BrandUsageRule {
  id: string;
  category: 'spacing' | 'color' | 'typography' | 'logo' | 'tone' | 'general';
  rule: string;
}

export interface BrandGuidelines {
  id: string;
  brandName: string;
  colors: BrandColor[];
  typography: BrandTypography;
  voice: BrandVoice;
  logos: BrandLogo[];
  usageRules: BrandUsageRule[];
  linkedCampaignIds: string[];
  createdAt: number;
  updatedAt: number;
}

// ─── Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'continuaos-brand-state';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(state: BrandState) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const data: PersistedBrand = {
      brands: state.brands,
      activeBrandId: state.activeBrandId,
    };
    idbSet(STORAGE_KEY, data).catch((e: unknown) => {
      console.warn('[BrandStore] Failed to persist:', e);
    });
  }, 2000);
}

interface PersistedBrand {
  brands: Record<string, BrandGuidelines>;
  activeBrandId: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function createDefaultBrand(name: string): BrandGuidelines {
  return {
    id: generateId('brand'),
    brandName: name,
    colors: [],
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      accentFont: 'Inter',
      headingWeight: '700',
      bodyWeight: '400',
    },
    voice: {
      tone: 'Professional',
      personality: [],
      dos: [],
      donts: [],
    },
    logos: [],
    usageRules: [],
    linkedCampaignIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── State ──────────────────────────────────────────────────────────────

interface BrandState {
  brands: Record<string, BrandGuidelines>;
  activeBrandId: string | null;

  // ─── Brand CRUD ──────────────────────────────────────────────────
  createBrand: (name: string) => string;
  updateBrand: (id: string, updates: Partial<Omit<BrandGuidelines, 'id' | 'createdAt'>>) => void;
  deleteBrand: (id: string) => void;
  setActiveBrand: (id: string | null) => void;
  getActiveBrand: () => BrandGuidelines | null;
  getAllBrands: () => BrandGuidelines[];

  // ─── Colors ──────────────────────────────────────────────────────
  addColor: (brandId: string, color: Omit<BrandColor, 'id'>) => void;
  updateColor: (brandId: string, colorId: string, updates: Partial<BrandColor>) => void;
  removeColor: (brandId: string, colorId: string) => void;

  // ─── Typography ──────────────────────────────────────────────────
  updateTypography: (brandId: string, typography: Partial<BrandTypography>) => void;

  // ─── Voice ───────────────────────────────────────────────────────
  updateVoice: (brandId: string, voice: Partial<BrandVoice>) => void;

  // ─── Logos ───────────────────────────────────────────────────────
  addLogo: (brandId: string, logo: Omit<BrandLogo, 'id'>) => void;
  removeLogo: (brandId: string, logoId: string) => void;

  // ─── Usage Rules ─────────────────────────────────────────────────
  addUsageRule: (brandId: string, rule: Omit<BrandUsageRule, 'id'>) => void;
  removeUsageRule: (brandId: string, ruleId: string) => void;

  // ─── Campaign Linking ────────────────────────────────────────────
  linkCampaign: (brandId: string, campaignId: string) => void;
  unlinkCampaign: (brandId: string, campaignId: string) => void;
  getBrandsForCampaign: (campaignId: string) => BrandGuidelines[];

  // ─── Persistence ─────────────────────────────────────────────────
  hydrate: () => Promise<void>;
}

export const useBrandStore = create<BrandState>((set, get) => ({
  brands: {},
  activeBrandId: null,

  createBrand: (name) => {
    const brand = createDefaultBrand(name);
    set((s) => {
      const brands = { ...s.brands, [brand.id]: brand };
      schedulePersist({ ...s, brands, activeBrandId: brand.id });
      return { brands, activeBrandId: brand.id };
    });
    return brand.id;
  },

  updateBrand: (id, updates) => {
    set((s) => {
      const existing = s.brands[id];
      if (!existing) return s;
      const brands = {
        ...s.brands,
        [id]: { ...existing, ...updates, updatedAt: Date.now() },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  deleteBrand: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.brands;
      const activeBrandId = s.activeBrandId === id ? null : s.activeBrandId;
      schedulePersist({ ...s, brands: rest, activeBrandId });
      return { brands: rest, activeBrandId };
    });
  },

  setActiveBrand: (id) => {
    set((s) => {
      schedulePersist({ ...s, activeBrandId: id });
      return { activeBrandId: id };
    });
  },

  getActiveBrand: () => {
    const s = get();
    return s.activeBrandId ? s.brands[s.activeBrandId] || null : null;
  },

  getAllBrands: () => {
    return Object.values(get().brands);
  },

  // ─── Colors ──────────────────────────────────────────────────────

  addColor: (brandId, color) => {
    const id = `color_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          colors: [...brand.colors, { ...color, id }],
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  updateColor: (brandId, colorId, updates) => {
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          colors: brand.colors.map((c) => (c.id === colorId ? { ...c, ...updates } : c)),
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  removeColor: (brandId, colorId) => {
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          colors: brand.colors.filter((c) => c.id !== colorId),
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  // ─── Typography ──────────────────────────────────────────────────

  updateTypography: (brandId, typography) => {
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          typography: { ...brand.typography, ...typography },
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  // ─── Voice ───────────────────────────────────────────────────────

  updateVoice: (brandId, voice) => {
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          voice: { ...brand.voice, ...voice },
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  // ─── Logos ───────────────────────────────────────────────────────

  addLogo: (brandId, logo) => {
    const id = `logo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          logos: [...brand.logos, { ...logo, id }],
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  removeLogo: (brandId, logoId) => {
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          logos: brand.logos.filter((l) => l.id !== logoId),
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  // ─── Usage Rules ─────────────────────────────────────────────────

  addUsageRule: (brandId, rule) => {
    const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          usageRules: [...brand.usageRules, { ...rule, id }],
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  removeUsageRule: (brandId, ruleId) => {
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          usageRules: brand.usageRules.filter((r) => r.id !== ruleId),
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  // ─── Campaign Linking ────────────────────────────────────────────

  linkCampaign: (brandId, campaignId) => {
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand || brand.linkedCampaignIds.includes(campaignId)) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          linkedCampaignIds: [...brand.linkedCampaignIds, campaignId],
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  unlinkCampaign: (brandId, campaignId) => {
    set((s) => {
      const brand = s.brands[brandId];
      if (!brand) return s;
      const brands = {
        ...s.brands,
        [brandId]: {
          ...brand,
          linkedCampaignIds: brand.linkedCampaignIds.filter((id) => id !== campaignId),
          updatedAt: Date.now(),
        },
      };
      schedulePersist({ ...s, brands });
      return { brands };
    });
  },

  getBrandsForCampaign: (campaignId) => {
    return Object.values(get().brands).filter((b) =>
      b.linkedCampaignIds.includes(campaignId),
    );
  },

  // ─── Persistence ─────────────────────────────────────────────────

  hydrate: async () => {
    try {
      const data = await idbGet<PersistedBrand>(STORAGE_KEY);
      if (data) {
        set({
          brands: data.brands || {},
          activeBrandId: data.activeBrandId || null,
        });
      }
    } catch (e) {
      console.warn('[BrandStore] Failed to hydrate:', e);
    }
  },
}));
