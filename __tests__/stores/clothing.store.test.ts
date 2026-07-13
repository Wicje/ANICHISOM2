import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useClothingStore } from '@/lib/stores/clothing.store';

describe('ClothingStore', () => {
  beforeEach(() => {
    useClothingStore.setState({
      designs: {},
      patterns: {},
      orders: {},
      collections: {},
      activeDesignId: null,
      activeCollectionId: null,
    });
    vi.clearAllTimers();
  });

  describe('default state', () => {
    it('should start with empty records', () => {
      const s = useClothingStore.getState();
      expect(Object.keys(s.designs)).toHaveLength(0);
      expect(Object.keys(s.patterns)).toHaveLength(0);
      expect(Object.keys(s.orders)).toHaveLength(0);
      expect(Object.keys(s.collections)).toHaveLength(0);
      expect(s.activeDesignId).toBeNull();
      expect(s.activeCollectionId).toBeNull();
    });
  });

  describe('Design CRUD', () => {
    it('should create a design and return its ID', () => {
      const id = useClothingStore.getState().createDesign('Vintage Tee', 'top');
      expect(id).toMatch(/^clothing_/);
      const design = useClothingStore.getState().designs[id];
      expect(design).toBeDefined();
      expect(design!.name).toBe('Vintage Tee');
      expect(design!.category).toBe('top');
      expect(design!.status).toBe('sketch');
    });

    it('should set activeDesignId on create', () => {
      const id = useClothingStore.getState().createDesign('Cargo Pants', 'bottom');
      expect(useClothingStore.getState().activeDesignId).toBe(id);
    });

    it('should update a design', () => {
      const id = useClothingStore.getState().createDesign('Bomber', 'outerwear');
      useClothingStore.getState().updateDesign(id, { status: 'draft', notes: 'revised collar' });
      const d = useClothingStore.getState().designs[id];
      expect(d!.status).toBe('draft');
      expect(d!.notes).toBe('revised collar');
    });

    it('should not create new designs for unknown IDs', () => {
      useClothingStore.getState().updateDesign('nonexistent', { name: 'X' });
      expect(useClothingStore.getState().designs['nonexistent']).toBeUndefined();
    });

    it('should delete a design', () => {
      const id = useClothingStore.getState().createDesign('Doomed', 'accessory');
      useClothingStore.getState().deleteDesign(id);
      expect(useClothingStore.getState().designs[id]).toBeUndefined();
    });

    it('should clear activeDesignId when deleting the active design', () => {
      const id = useClothingStore.getState().createDesign('Active Design', 'footwear');
      expect(useClothingStore.getState().activeDesignId).toBe(id);
      useClothingStore.getState().deleteDesign(id);
      expect(useClothingStore.getState().activeDesignId).toBeNull();
    });

    it('should filter designs by status', () => {
      const id1 = useClothingStore.getState().createDesign('Sketch 1', 'top');
      const id2 = useClothingStore.getState().createDesign('Draft 1', 'bottom');
      useClothingStore.getState().updateDesign(id2, { status: 'draft' });
      useClothingStore.getState().updateDesign(id1, { status: 'production' });

      expect(useClothingStore.getState().getDesignsByStatus('sketch')).toHaveLength(0);
      expect(useClothingStore.getState().getDesignsByStatus('draft')).toHaveLength(1);
      expect(useClothingStore.getState().getDesignsByStatus('production')).toHaveLength(1);
    });
  });

  describe('Pattern CRUD', () => {
    it('should create a pattern and return its ID', () => {
      const designId = useClothingStore.getState().createDesign('Tee', 'top');
      const patId = useClothingStore.getState().createPattern(designId, 'Tee Pattern', ['S', 'M', 'L'], 'Cotton Jersey', 2.5);
      expect(patId).toMatch(/^clothing_/);
      const pat = useClothingStore.getState().patterns[patId];
      expect(pat!.name).toBe('Tee Pattern');
      expect(pat!.sizes).toEqual(['S', 'M', 'L']);
      expect(pat!.fabricType).toBe('Cotton Jersey');
      expect(pat!.yardage).toBe(2.5);
      expect(pat!.designId).toBe(designId);
    });

    it('should update a pattern', () => {
      const designId = useClothingStore.getState().createDesign('Hoodie', 'outerwear');
      const patId = useClothingStore.getState().createPattern(designId, 'Hoodie Pattern', ['M', 'L'], 'Fleece', 3.0);
      useClothingStore.getState().updatePattern(patId, { yardage: 3.5 });
      expect(useClothingStore.getState().patterns[patId]!.yardage).toBe(3.5);
    });

    it('should delete a pattern', () => {
      const designId = useClothingStore.getState().createDesign('Skirt', 'bottom');
      const patId = useClothingStore.getState().createPattern(designId, 'Skirt Pattern', ['XS', 'S'], 'Denim', 1.5);
      useClothingStore.getState().deletePattern(patId);
      expect(useClothingStore.getState().patterns[patId]).toBeUndefined();
    });

    it('should get patterns for a specific design', () => {
      const designId = useClothingStore.getState().createDesign('Joggers', 'bottom');
      useClothingStore.getState().createPattern(designId, 'Jogger Pat', ['M'], 'French Terry', 2.0);
      useClothingStore.getState().createPattern(designId, 'Jogger Alt', ['M'], 'Ribbed Knit', 2.2);
      const otherDesignId = useClothingStore.getState().createDesign('Cap', 'accessory');
      useClothingStore.getState().createPattern(otherDesignId, 'Cap Pat', ['OS'], 'Canvas', 0.5);

      expect(useClothingStore.getState().getPatternsForDesign(designId)).toHaveLength(2);
      expect(useClothingStore.getState().getPatternsForDesign(otherDesignId)).toHaveLength(1);
    });
  });

  describe('Order CRUD', () => {
    it('should create an order and return its ID', () => {
      const designId = useClothingStore.getState().createDesign('Sneaker', 'footwear');
      const orderId = useClothingStore.getState().createOrder(designId, 500, 'Factory X', 12.50, '2026-09-01');
      expect(orderId).toMatch(/^clothing_/);
      const order = useClothingStore.getState().orders[orderId];
      expect(order!.quantity).toBe(500);
      expect(order!.manufacturer).toBe('Factory X');
      expect(order!.unitCost).toBe(12.50);
      expect(order!.status).toBe('pending');
    });

    it('should update an order', () => {
      const designId = useClothingStore.getState().createDesign('Jacket', 'outerwear');
      const orderId = useClothingStore.getState().createOrder(designId, 200, 'Mfg A', 25.00, '2026-10-15');
      useClothingStore.getState().updateOrder(orderId, { status: 'in-production' });
      expect(useClothingStore.getState().orders[orderId]!.status).toBe('in-production');
    });

    it('should delete an order', () => {
      const designId = useClothingStore.getState().createDesign('Shorts', 'bottom');
      const orderId = useClothingStore.getState().createOrder(designId, 100, 'Mfg B', 8.00, '2026-08-20');
      useClothingStore.getState().deleteOrder(orderId);
      expect(useClothingStore.getState().orders[orderId]).toBeUndefined();
    });
  });

  describe('Collection CRUD', () => {
    it('should create a collection and return its ID', () => {
      const id = useClothingStore.getState().createCollection('AW26', 'fall');
      expect(id).toMatch(/^clothing_/);
      const col = useClothingStore.getState().collections[id];
      expect(col!.name).toBe('AW26');
      expect(col!.season).toBe('fall');
      expect(col!.status).toBe('planning');
      expect(col!.designIds).toEqual([]);
    });

    it('should set activeCollectionId on create', () => {
      const id = useClothingStore.getState().createCollection('Resort 27', 'resort');
      expect(useClothingStore.getState().activeCollectionId).toBe(id);
    });

    it('should update a collection', () => {
      const id = useClothingStore.getState().createCollection('SS27', 'summer');
      useClothingStore.getState().updateCollection(id, { status: 'active' });
      expect(useClothingStore.getState().collections[id]!.status).toBe('active');
    });

    it('should delete a collection', () => {
      const id = useClothingStore.getState().createCollection('Doomed', 'winter');
      useClothingStore.getState().deleteCollection(id);
      expect(useClothingStore.getState().collections[id]).toBeUndefined();
    });

    it('should clear activeCollectionId when deleting the active collection', () => {
      const id = useClothingStore.getState().createCollection('Active Col', 'spring');
      expect(useClothingStore.getState().activeCollectionId).toBe(id);
      useClothingStore.getState().deleteCollection(id);
      expect(useClothingStore.getState().activeCollectionId).toBeNull();
    });

    it('should add a design to a collection', () => {
      const designId = useClothingStore.getState().createDesign('Dress', 'top');
      const colId = useClothingStore.getState().createCollection('Summer', 'summer');
      useClothingStore.getState().addDesignToCollection(colId, designId);
      expect(useClothingStore.getState().collections[colId]!.designIds).toContain(designId);
    });

    it('should not duplicate designs in a collection', () => {
      const designId = useClothingStore.getState().createDesign('Blazer', 'outerwear');
      const colId = useClothingStore.getState().createCollection('FW26', 'fall');
      useClothingStore.getState().addDesignToCollection(colId, designId);
      useClothingStore.getState().addDesignToCollection(colId, designId);
      expect(useClothingStore.getState().collections[colId]!.designIds).toHaveLength(1);
    });

    it('should remove a design from a collection', () => {
      const designId = useClothingStore.getState().createDesign('Tank', 'top');
      const colId = useClothingStore.getState().createCollection('Casual', 'summer');
      useClothingStore.getState().addDesignToCollection(colId, designId);
      useClothingStore.getState().removeDesignFromCollection(colId, designId);
      expect(useClothingStore.getState().collections[colId]!.designIds).not.toContain(designId);
    });
  });
});
