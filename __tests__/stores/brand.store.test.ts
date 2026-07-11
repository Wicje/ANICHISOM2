import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBrandStore } from '@/lib/stores/brand.store';

describe('BrandStore', () => {
  beforeEach(() => {
    useBrandStore.setState({ brands: {}, activeBrandId: null });
    vi.clearAllTimers();
  });

  describe('createBrand', () => {
    it('should create a brand and return its ID', () => {
      const id = useBrandStore.getState().createBrand('Test Brand');
      expect(id).toMatch(/^brand_/);
      const brand = useBrandStore.getState().brands[id];
      expect(brand).toBeDefined();
      expect(brand.brandName).toBe('Test Brand');
    });

    it('should auto-set activeBrandId on first brand', () => {
      const id = useBrandStore.getState().createBrand('First Brand');
      expect(useBrandStore.getState().activeBrandId).toBe(id);
    });

    it('should create brand with default typography', () => {
      const id = useBrandStore.getState().createBrand('Default Type');
      const brand = useBrandStore.getState().brands[id];
      expect(brand.typography.headingFont).toBe('Inter');
      expect(brand.typography.bodyFont).toBe('Inter');
    });

    it('should create brand with default voice', () => {
      const id = useBrandStore.getState().createBrand('Default Voice');
      const brand = useBrandStore.getState().brands[id];
      expect(brand.voice.tone).toBe('Professional');
      expect(brand.voice.personality).toEqual([]);
    });
  });

  describe('updateBrand', () => {
    it('should update brand name', () => {
      const id = useBrandStore.getState().createBrand('Old Name');
      useBrandStore.getState().updateBrand(id, { brandName: 'New Name' });
      expect(useBrandStore.getState().brands[id].brandName).toBe('New Name');
    });

    it('should not create new brands for unknown IDs', () => {
      useBrandStore.getState().updateBrand('nonexistent', { brandName: 'X' });
      expect(useBrandStore.getState().brands['nonexistent']).toBeUndefined();
    });

    it('should bump updatedAt on update', () => {
      const id = useBrandStore.getState().createBrand('Timestamped');
      const origTs = useBrandStore.getState().brands[id].updatedAt;
      useBrandStore.getState().updateBrand(id, { brandName: 'Updated' });
      expect(useBrandStore.getState().brands[id].updatedAt).toBeGreaterThanOrEqual(origTs);
    });
  });

  describe('deleteBrand', () => {
    it('should remove brand from store', () => {
      const id = useBrandStore.getState().createBrand('Doomed');
      useBrandStore.getState().deleteBrand(id);
      expect(useBrandStore.getState().brands[id]).toBeUndefined();
    });

    it('should clear activeBrandId if deleting active brand', () => {
      const id = useBrandStore.getState().createBrand('Active One');
      expect(useBrandStore.getState().activeBrandId).toBe(id);
      useBrandStore.getState().deleteBrand(id);
      expect(useBrandStore.getState().activeBrandId).toBeNull();
    });

    it('should not affect activeBrandId if deleting non-active brand', () => {
      const id1 = useBrandStore.getState().createBrand('Keep');
      const id2 = useBrandStore.getState().createBrand('Delete');
      // Second create overrides activeBrandId to id2, so reset to id1
      useBrandStore.getState().setActiveBrand(id1);
      useBrandStore.getState().deleteBrand(id2);
      expect(useBrandStore.getState().activeBrandId).toBe(id1);
    });
  });

  describe('setActiveBrand / getActiveBrand', () => {
    it('should set and get active brand', () => {
      const id = useBrandStore.getState().createBrand('Brand A');
      useBrandStore.getState().createBrand('Brand B');
      useBrandStore.getState().setActiveBrand(id);
      expect(useBrandStore.getState().getActiveBrand()?.id).toBe(id);
    });

    it('should return null when no active brand', () => {
      expect(useBrandStore.getState().getActiveBrand()).toBeNull();
    });

    it('should clear active brand with null', () => {
      useBrandStore.getState().createBrand('Will Clear');
      useBrandStore.getState().setActiveBrand(null);
      expect(useBrandStore.getState().activeBrandId).toBeNull();
      expect(useBrandStore.getState().getActiveBrand()).toBeNull();
    });
  });

  describe('getAllBrands', () => {
    it('should return all brands', () => {
      useBrandStore.getState().createBrand('One');
      useBrandStore.getState().createBrand('Two');
      expect(useBrandStore.getState().getAllBrands()).toHaveLength(2);
    });
  });

  describe('colors', () => {
    it('should add a color to a brand', () => {
      const id = useBrandStore.getState().createBrand('Colorful');
      useBrandStore.getState().addColor(id, { hex: '#FF0000', name: 'Red', role: 'primary' });
      const colors = useBrandStore.getState().brands[id].colors;
      expect(colors).toHaveLength(1);
      expect(colors[0].hex).toBe('#FF0000');
      expect(colors[0].id).toMatch(/^color_/);
    });

    it('should update a color', () => {
      const id = useBrandStore.getState().createBrand('Updatable');
      useBrandStore.getState().addColor(id, { hex: '#000000', name: 'Black', role: 'neutral' });
      const colorId = useBrandStore.getState().brands[id].colors[0].id;
      useBrandStore.getState().updateColor(id, colorId, { hex: '#333333' });
      expect(useBrandStore.getState().brands[id].colors[0].hex).toBe('#333333');
    });

    it('should remove a color', () => {
      const id = useBrandStore.getState().createBrand('Removable');
      useBrandStore.getState().addColor(id, { hex: '#00FF00', name: 'Green', role: 'accent' });
      const colorId = useBrandStore.getState().brands[id].colors[0].id;
      useBrandStore.getState().removeColor(id, colorId);
      expect(useBrandStore.getState().brands[id].colors).toHaveLength(0);
    });
  });

  describe('typography', () => {
    it('should update typography', () => {
      const id = useBrandStore.getState().createBrand('Typed');
      useBrandStore.getState().updateTypography(id, { headingFont: 'Poppins' });
      expect(useBrandStore.getState().brands[id].typography.headingFont).toBe('Poppins');
      expect(useBrandStore.getState().brands[id].typography.bodyFont).toBe('Inter');
    });
  });

  describe('voice', () => {
    it('should update voice tone and personality', () => {
      const id = useBrandStore.getState().createBrand('Vocal');
      useBrandStore.getState().updateVoice(id, {
        tone: 'Playful',
        personality: ['fun', 'energetic'],
      });
      const voice = useBrandStore.getState().brands[id].voice;
      expect(voice.tone).toBe('Playful');
      expect(voice.personality).toEqual(['fun', 'energetic']);
    });
  });

  describe('logos', () => {
    it('should add and remove logos', () => {
      const id = useBrandStore.getState().createBrand('Logoed');
      useBrandStore.getState().addLogo(id, { name: 'Main', variant: 'primary', dataUrl: 'data:image/png;base64,abc' });
      expect(useBrandStore.getState().brands[id].logos).toHaveLength(1);
      const logoId = useBrandStore.getState().brands[id].logos[0].id;
      useBrandStore.getState().removeLogo(id, logoId);
      expect(useBrandStore.getState().brands[id].logos).toHaveLength(0);
    });
  });

  describe('usage rules', () => {
    it('should add and remove usage rules', () => {
      const id = useBrandStore.getState().createBrand('Ruled');
      useBrandStore.getState().addUsageRule(id, { category: 'spacing', rule: 'Use 8px grid' });
      expect(useBrandStore.getState().brands[id].usageRules).toHaveLength(1);
      const ruleId = useBrandStore.getState().brands[id].usageRules[0].id;
      useBrandStore.getState().removeUsageRule(id, ruleId);
      expect(useBrandStore.getState().brands[id].usageRules).toHaveLength(0);
    });
  });

  describe('campaign linking', () => {
    it('should link and unlink brand to campaign', () => {
      const id = useBrandStore.getState().createBrand('Linked');
      useBrandStore.getState().linkCampaign(id, 'camp_1');
      expect(useBrandStore.getState().brands[id].linkedCampaignIds).toContain('camp_1');
      useBrandStore.getState().unlinkCampaign(id, 'camp_1');
      expect(useBrandStore.getState().brands[id].linkedCampaignIds).not.toContain('camp_1');
    });

    it('should not duplicate campaign links', () => {
      const id = useBrandStore.getState().createBrand('No Dup');
      useBrandStore.getState().linkCampaign(id, 'camp_1');
      useBrandStore.getState().linkCampaign(id, 'camp_1');
      expect(useBrandStore.getState().brands[id].linkedCampaignIds.filter((c) => c === 'camp_1')).toHaveLength(1);
    });

    it('should find brands for a campaign', () => {
      const id = useBrandStore.getState().createBrand('Finder');
      useBrandStore.getState().linkCampaign(id, 'camp_99');
      const found = useBrandStore.getState().getBrandsForCampaign('camp_99');
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(id);
    });

    it('should return empty for unmatched campaign', () => {
      expect(useBrandStore.getState().getBrandsForCampaign('nonexistent')).toHaveLength(0);
    });
  });
});
