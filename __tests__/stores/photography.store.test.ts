import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePhotographyStore } from '@/lib/stores/photography.store';

describe('PhotographyStore', () => {
  beforeEach(() => {
    usePhotographyStore.setState({
      shoots: {},
      galleries: {},
      clients: {},
      printOrders: {},
      watermarkPresets: {},
      activeShootId: null,
      activeClientId: null,
      activeWatermarkPresetId: null,
    });
    vi.clearAllTimers();
  });

  describe('default state', () => {
    it('should have empty records for all collections', () => {
      const s = usePhotographyStore.getState();
      expect(Object.keys(s.shoots)).toHaveLength(0);
      expect(Object.keys(s.galleries)).toHaveLength(0);
      expect(Object.keys(s.clients)).toHaveLength(0);
      expect(Object.keys(s.printOrders)).toHaveLength(0);
      expect(Object.keys(s.watermarkPresets)).toHaveLength(0);
    });

    it('should have null active IDs', () => {
      const s = usePhotographyStore.getState();
      expect(s.activeShootId).toBeNull();
      expect(s.activeClientId).toBeNull();
      expect(s.activeWatermarkPresetId).toBeNull();
    });
  });

  describe('shoot CRUD', () => {
    it('should create a shoot and return its ID', () => {
      const id = usePhotographyStore.getState().createShoot('Test Shoot', '2026-07-01', 'Studio A');
      expect(id).toMatch(/^shoot_/);
      const shoot = usePhotographyStore.getState().shoots[id];
      expect(shoot).toBeDefined();
      expect(shoot!.name).toBe('Test Shoot');
      expect(shoot!.date).toBe('2026-07-01');
      expect(shoot!.location).toBe('Studio A');
      expect(shoot!.status).toBe('planned');
      expect(shoot!.imageCount).toBe(0);
      expect(shoot!.tags).toEqual([]);
    });

    it('should update a shoot', () => {
      const id = usePhotographyStore.getState().createShoot('Old', '2026-07-01', 'Loc');
      usePhotographyStore.getState().updateShoot(id, { name: 'New', status: 'in-progress' });
      const shoot = usePhotographyStore.getState().shoots[id];
      expect(shoot!.name).toBe('New');
      expect(shoot!.status).toBe('in-progress');
    });

    it('should not create shoots for unknown IDs', () => {
      usePhotographyStore.getState().updateShoot('nonexistent', { name: 'X' });
      expect(usePhotographyStore.getState().shoots['nonexistent']).toBeUndefined();
    });

    it('should delete a shoot', () => {
      const id = usePhotographyStore.getState().createShoot('Doomed', '2026-07-01', 'Loc');
      usePhotographyStore.getState().deleteShoot(id);
      expect(usePhotographyStore.getState().shoots[id]).toBeUndefined();
    });

    it('should clear activeShootId when deleting active shoot', () => {
      const id = usePhotographyStore.getState().createShoot('Active', '2026-07-01', 'Loc');
      usePhotographyStore.getState().setActiveShoot(id);
      usePhotographyStore.getState().deleteShoot(id);
      expect(usePhotographyStore.getState().activeShootId).toBeNull();
    });
  });

  describe('setActiveShoot / getActiveShoot', () => {
    it('should set and get active shoot', () => {
      const id = usePhotographyStore.getState().createShoot('S1', '2026-07-01', 'Loc');
      usePhotographyStore.getState().setActiveShoot(id);
      expect(usePhotographyStore.getState().getActiveShoot()?.id).toBe(id);
    });

    it('should return null when no active shoot', () => {
      expect(usePhotographyStore.getState().getActiveShoot()).toBeNull();
    });
  });

  describe('getShootsByStatus', () => {
    it('should filter shoots by status', () => {
      const id1 = usePhotographyStore.getState().createShoot('Planned', '2026-07-01', 'Loc');
      const id2 = usePhotographyStore.getState().createShoot('Done', '2026-07-02', 'Loc');
      usePhotographyStore.getState().updateShoot(id2, { status: 'completed' });
      const planned = usePhotographyStore.getState().getShootsByStatus('planned');
      const completed = usePhotographyStore.getState().getShootsByStatus('completed');
      expect(planned).toHaveLength(1);
      expect(planned[0]!.id).toBe(id1);
      expect(completed).toHaveLength(1);
      expect(completed[0]!.id).toBe(id2);
    });
  });

  describe('gallery CRUD', () => {
    it('should create a gallery and return its ID', () => {
      const id = usePhotographyStore.getState().createGallery('Test Gallery');
      expect(id).toMatch(/^gallery_/);
      const gallery = usePhotographyStore.getState().galleries[id];
      expect(gallery).toBeDefined();
      expect(gallery!.name).toBe('Test Gallery');
      expect(gallery!.status).toBe('draft');
      expect(gallery!.pin).toMatch(/^[a-z0-9]{6}$/);
      expect(gallery!.imageIds).toEqual([]);
      expect(gallery!.shareUrl).toContain(id);
    });

    it('should create a gallery with shootId', () => {
      const shootId = usePhotographyStore.getState().createShoot('S', '2026-07-01', 'Loc');
      const galleryId = usePhotographyStore.getState().createGallery('Linked', shootId);
      expect(usePhotographyStore.getState().galleries[galleryId]!.shootId).toBe(shootId);
    });

    it('should update a gallery', () => {
      const id = usePhotographyStore.getState().createGallery('Old');
      usePhotographyStore.getState().updateGallery(id, { status: 'delivered', downloadCount: 5 });
      const g = usePhotographyStore.getState().galleries[id];
      expect(g!.status).toBe('delivered');
      expect(g!.downloadCount).toBe(5);
    });

    it('should delete a gallery', () => {
      const id = usePhotographyStore.getState().createGallery('Gone');
      usePhotographyStore.getState().deleteGallery(id);
      expect(usePhotographyStore.getState().galleries[id]).toBeUndefined();
    });
  });

  describe('getGalleriesByShoot / getGalleriesByStatus', () => {
    it('should filter galleries by shootId', () => {
      const shootId = usePhotographyStore.getState().createShoot('S', '2026-07-01', 'Loc');
      usePhotographyStore.getState().createGallery('G1', shootId);
      usePhotographyStore.getState().createGallery('G2', shootId);
      usePhotographyStore.getState().createGallery('G3');
      expect(usePhotographyStore.getState().getGalleriesByShoot(shootId)).toHaveLength(2);
    });

    it('should filter galleries by status', () => {
      const id = usePhotographyStore.getState().createGallery('Draft');
      usePhotographyStore.getState().updateGallery(id, { status: 'archived' });
      usePhotographyStore.getState().createGallery('Still Draft');
      expect(usePhotographyStore.getState().getGalleriesByStatus('archived')).toHaveLength(1);
      expect(usePhotographyStore.getState().getGalleriesByStatus('draft')).toHaveLength(1);
    });
  });

  describe('client CRUD', () => {
    it('should create a client and return its ID', () => {
      const id = usePhotographyStore.getState().createClient('Alice', 'alice@test.com', '555-0001');
      expect(id).toMatch(/^client_/);
      const client = usePhotographyStore.getState().clients[id];
      expect(client!.name).toBe('Alice');
      expect(client!.email).toBe('alice@test.com');
      expect(client!.phone).toBe('555-0001');
      expect(client!.shootIds).toEqual([]);
      expect(client!.totalSpent).toBe(0);
    });

    it('should update a client', () => {
      const id = usePhotographyStore.getState().createClient('Alice', 'a@t.com', '111');
      usePhotographyStore.getState().updateClient(id, { email: 'new@test.com', totalSpent: 500 });
      expect(usePhotographyStore.getState().clients[id]!.email).toBe('new@test.com');
      expect(usePhotographyStore.getState().clients[id]!.totalSpent).toBe(500);
    });

    it('should delete a client and clear activeClientId', () => {
      const id = usePhotographyStore.getState().createClient('Bob', 'b@t.com', '222');
      usePhotographyStore.getState().setActiveClient(id);
      usePhotographyStore.getState().deleteClient(id);
      expect(usePhotographyStore.getState().clients[id]).toBeUndefined();
      expect(usePhotographyStore.getState().activeClientId).toBeNull();
    });

    it('should set and get active client', () => {
      const id = usePhotographyStore.getState().createClient('C1', 'c1@t.com', '333');
      usePhotographyStore.getState().setActiveClient(id);
      expect(usePhotographyStore.getState().getActiveClient()?.id).toBe(id);
      usePhotographyStore.getState().setActiveClient(null);
      expect(usePhotographyStore.getState().getActiveClient()).toBeNull();
    });
  });

  describe('getClientShoots', () => {
    it('should return shoots linked to client', () => {
      const clientId = usePhotographyStore.getState().createClient('C', 'c@t.com', '1');
      const shootId = usePhotographyStore.getState().createShoot('S', '2026-07-01', 'Loc');
      usePhotographyStore.getState().updateClient(clientId, { shootIds: [shootId] });
      const shoots = usePhotographyStore.getState().getClientShoots(clientId);
      expect(shoots).toHaveLength(1);
      expect(shoots[0]!.id).toBe(shootId);
    });

    it('should return empty array for unknown client', () => {
      expect(usePhotographyStore.getState().getClientShoots('nonexistent')).toEqual([]);
    });
  });

  describe('print order CRUD', () => {
    const items = [
      { size: '8x10', quantity: 2, finish: 'matte' as const, price: 25 },
      { size: '16x20', quantity: 1, finish: 'canvas' as const, price: 80 },
    ];

    it('should create a print order and return its ID', () => {
      const id = usePhotographyStore.getState().createPrintOrder('gal_1', items);
      expect(id).toMatch(/^order_/);
      const order = usePhotographyStore.getState().printOrders[id];
      expect(order!.galleryId).toBe('gal_1');
      expect(order!.status).toBe('pending');
      expect(order!.total).toBe(130);
      expect(order!.items).toHaveLength(2);
    });

    it('should update a print order', () => {
      const id = usePhotographyStore.getState().createPrintOrder('gal_1', items);
      usePhotographyStore.getState().updatePrintOrder(id, { status: 'shipped' });
      expect(usePhotographyStore.getState().printOrders[id]!.status).toBe('shipped');
    });

    it('should delete a print order', () => {
      const id = usePhotographyStore.getState().createPrintOrder('gal_1', items);
      usePhotographyStore.getState().deletePrintOrder(id);
      expect(usePhotographyStore.getState().printOrders[id]).toBeUndefined();
    });
  });

  describe('getPrintOrdersByGallery / getPrintOrdersByStatus', () => {
    it('should filter print orders by galleryId', () => {
      usePhotographyStore.getState().createPrintOrder('gal_1', [{ size: '5x7', quantity: 1, finish: 'glossy', price: 15 }]);
      usePhotographyStore.getState().createPrintOrder('gal_1', [{ size: '8x10', quantity: 1, finish: 'matte', price: 25 }]);
      usePhotographyStore.getState().createPrintOrder('gal_2', [{ size: '5x7', quantity: 1, finish: 'glossy', price: 15 }]);
      expect(usePhotographyStore.getState().getPrintOrdersByGallery('gal_1')).toHaveLength(2);
      expect(usePhotographyStore.getState().getPrintOrdersByGallery('gal_2')).toHaveLength(1);
    });

    it('should filter print orders by status', () => {
      const id = usePhotographyStore.getState().createPrintOrder('gal_1', [{ size: '5x7', quantity: 1, finish: 'glossy', price: 15 }]);
      usePhotographyStore.getState().updatePrintOrder(id, { status: 'delivered' });
      usePhotographyStore.getState().createPrintOrder('gal_1', [{ size: '5x7', quantity: 1, finish: 'glossy', price: 15 }]);
      expect(usePhotographyStore.getState().getPrintOrdersByStatus('delivered')).toHaveLength(1);
      expect(usePhotographyStore.getState().getPrintOrdersByStatus('pending')).toHaveLength(1);
    });
  });

  describe('watermark preset CRUD', () => {
    it('should create a watermark preset with defaults', () => {
      const id = usePhotographyStore.getState().createWatermarkPreset('Default', '© ContinuaOS');
      expect(id).toMatch(/^watermark_/);
      const preset = usePhotographyStore.getState().watermarkPresets[id];
      expect(preset!.name).toBe('Default');
      expect(preset!.text).toBe('© ContinuaOS');
      expect(preset!.opacity).toBe(0.5);
      expect(preset!.position).toBe('bottom-right');
      expect(preset!.fontSize).toBe(24);
    });

    it('should update a watermark preset', () => {
      const id = usePhotographyStore.getState().createWatermarkPreset('W', 'Text');
      usePhotographyStore.getState().updateWatermarkPreset(id, { opacity: 0.8, position: 'center' });
      const preset = usePhotographyStore.getState().watermarkPresets[id];
      expect(preset!.opacity).toBe(0.8);
      expect(preset!.position).toBe('center');
    });

    it('should delete a watermark preset and clear active', () => {
      const id = usePhotographyStore.getState().createWatermarkPreset('W', 'Text');
      usePhotographyStore.getState().setActiveWatermarkPreset(id);
      usePhotographyStore.getState().deleteWatermarkPreset(id);
      expect(usePhotographyStore.getState().watermarkPresets[id]).toBeUndefined();
      expect(usePhotographyStore.getState().activeWatermarkPresetId).toBeNull();
    });
  });

  describe('getActiveWatermarkPreset / setActiveWatermarkPreset', () => {
    it('should set and get active watermark preset', () => {
      const id = usePhotographyStore.getState().createWatermarkPreset('W', 'Text');
      usePhotographyStore.getState().setActiveWatermarkPreset(id);
      expect(usePhotographyStore.getState().getActiveWatermarkPreset()?.id).toBe(id);
    });

    it('should return null when no active preset', () => {
      expect(usePhotographyStore.getState().getActiveWatermarkPreset()).toBeNull();
    });

    it('should clear active preset with null', () => {
      const id = usePhotographyStore.getState().createWatermarkPreset('W', 'Text');
      usePhotographyStore.getState().setActiveWatermarkPreset(id);
      usePhotographyStore.getState().setActiveWatermarkPreset(null);
      expect(usePhotographyStore.getState().activeWatermarkPresetId).toBeNull();
      expect(usePhotographyStore.getState().getActiveWatermarkPreset()).toBeNull();
    });
  });
});
