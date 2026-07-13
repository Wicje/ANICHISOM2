import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useHardwareStore } from '@/lib/stores/hardware.store';

describe('HardwareStore', () => {
  beforeEach(() => {
    useHardwareStore.setState({
      components: {},
      schematics: {},
      firmwareVersions: {},
      suppliers: {},
      activeSchematicId: null,
    });
    vi.clearAllTimers();
  });

  // ─── Default State ───────────────────────────────────────────────

  describe('default state', () => {
    it('should have empty records for all entities', () => {
      const s = useHardwareStore.getState();
      expect(s.components).toEqual({});
      expect(s.schematics).toEqual({});
      expect(s.firmwareVersions).toEqual({});
      expect(s.suppliers).toEqual({});
      expect(s.activeSchematicId).toBeNull();
    });
  });

  // ─── Component CRUD ──────────────────────────────────────────────

  describe('createComponent', () => {
    it('should create a component and return its ID', () => {
      const id = useHardwareStore.getState().createComponent(
        'ESP32', 'mcu', '30kΩ', 'QFN-48', 'Espressif', 3.50,
      );
      expect(id).toMatch(/^hw_/);
      const comp = useHardwareStore.getState().components[id];
      expect(comp).toBeDefined();
      expect(comp!.name).toBe('ESP32');
      expect(comp!.type).toBe('mcu');
      expect(comp!.manufacturer).toBe('Espressif');
      expect(comp!.unitCost).toBe(3.50);
    });
  });

  describe('updateComponent', () => {
    it('should update component fields', () => {
      const id = useHardwareStore.getState().createComponent(
        'R1', 'passive', '10kΩ', '0402', 'Yageo', 0.01,
      );
      useHardwareStore.getState().updateComponent(id, { unitCost: 0.02, footprint: '0603' });
      const comp = useHardwareStore.getState().components[id];
      expect(comp!.unitCost).toBe(0.02);
      expect(comp!.footprint).toBe('0603');
      expect(comp!.name).toBe('R1');
    });

    it('should not create new components for unknown IDs', () => {
      useHardwareStore.getState().updateComponent('nonexistent', { name: 'X' });
      expect(useHardwareStore.getState().components['nonexistent']).toBeUndefined();
    });
  });

  describe('deleteComponent', () => {
    it('should remove a component', () => {
      const id = useHardwareStore.getState().createComponent(
        'Temp', 'sensor', 'NTC', '0805', 'Murata', 0.50,
      );
      useHardwareStore.getState().deleteComponent(id);
      expect(useHardwareStore.getState().components[id]).toBeUndefined();
    });
  });

  describe('getComponentsByType', () => {
    it('should filter components by type', () => {
      useHardwareStore.getState().createComponent('ESP32', 'mcu', 'X', 'QFN-48', 'Espressif', 3.50);
      useHardwareStore.getState().createComponent('R1', 'passive', '10kΩ', '0402', 'Yageo', 0.01);
      useHardwareStore.getState().createComponent('ADC', 'ic', 'ADS1115', 'QFN-16', 'TI', 2.00);
      useHardwareStore.getState().createComponent('R2', 'passive', '4.7kΩ', '0402', 'Yageo', 0.01);
      const passives = useHardwareStore.getState().getComponentsByType('passive');
      expect(passives).toHaveLength(2);
      expect(passives.every((c) => c.type === 'passive')).toBe(true);
    });

    it('should return empty array when no matches', () => {
      useHardwareStore.getState().createComponent('ESP32', 'mcu', 'X', 'QFN-48', 'Espressif', 3.50);
      expect(useHardwareStore.getState().getComponentsByType('connector')).toHaveLength(0);
    });
  });

  // ─── Schematic CRUD ─────────────────────────────────────────────

  describe('createSchematic', () => {
    it('should create a schematic and return its ID', () => {
      const id = useHardwareStore.getState().createSchematic('Main Board', 'Primary MCU board');
      expect(id).toMatch(/^hw_/);
      const sch = useHardwareStore.getState().schematics[id];
      expect(sch!.name).toBe('Main Board');
      expect(sch!.description).toBe('Primary MCU board');
      expect(sch!.componentIds).toEqual([]);
      expect(sch!.connections).toEqual([]);
    });
  });

  describe('updateSchematic', () => {
    it('should update schematic and bump updatedAt', () => {
      const id = useHardwareStore.getState().createSchematic('Old Name');
      const origTs = useHardwareStore.getState().schematics[id]!.updatedAt;
      useHardwareStore.getState().updateSchematic(id, { name: 'New Name' });
      const sch = useHardwareStore.getState().schematics[id]!;
      expect(sch.name).toBe('New Name');
      expect(sch.updatedAt).toBeGreaterThanOrEqual(origTs);
    });

    it('should not create new schematics for unknown IDs', () => {
      useHardwareStore.getState().updateSchematic('nonexistent', { name: 'X' });
      expect(useHardwareStore.getState().schematics['nonexistent']).toBeUndefined();
    });
  });

  describe('deleteSchematic', () => {
    it('should remove a schematic', () => {
      const id = useHardwareStore.getState().createSchematic('Doomed');
      useHardwareStore.getState().deleteSchematic(id);
      expect(useHardwareStore.getState().schematics[id]).toBeUndefined();
    });

    it('should clear activeSchematicId if deleting active schematic', () => {
      const id = useHardwareStore.getState().createSchematic('Active');
      useHardwareStore.getState().setActiveSchematic(id);
      expect(useHardwareStore.getState().activeSchematicId).toBe(id);
      useHardwareStore.getState().deleteSchematic(id);
      expect(useHardwareStore.getState().activeSchematicId).toBeNull();
    });
  });

  describe('getSchematicComponents', () => {
    it('should return components linked to a schematic', () => {
      const c1 = useHardwareStore.getState().createComponent(
        'ESP32', 'mcu', 'X', 'QFN-48', 'Espressif', 3.50,
      );
      const c2 = useHardwareStore.getState().createComponent(
        'R1', 'passive', '10kΩ', '0402', 'Yageo', 0.01,
      );
      const schId = useHardwareStore.getState().createSchematic('Test');
      useHardwareStore.getState().updateSchematic(schId, { componentIds: [c1, c2] });
      const comps = useHardwareStore.getState().getSchematicComponents(schId);
      expect(comps).toHaveLength(2);
      expect(comps.map((c) => c.id)).toContain(c1);
      expect(comps.map((c) => c.id)).toContain(c2);
    });

    it('should return empty array for unknown schematic', () => {
      expect(useHardwareStore.getState().getSchematicComponents('nope')).toEqual([]);
    });
  });

  describe('setActiveSchematic', () => {
    it('should set and clear active schematic', () => {
      const id = useHardwareStore.getState().createSchematic('Board A');
      useHardwareStore.getState().setActiveSchematic(id);
      expect(useHardwareStore.getState().activeSchematicId).toBe(id);
      useHardwareStore.getState().setActiveSchematic(null);
      expect(useHardwareStore.getState().activeSchematicId).toBeNull();
    });
  });

  // ─── Firmware CRUD ──────────────────────────────────────────────

  describe('createFirmware', () => {
    it('should create firmware with draft status', () => {
      const id = useHardwareStore.getState().createFirmware('Sensor FW', '1.0.0', 'Initial release');
      expect(id).toMatch(/^hw_/);
      const fw = useHardwareStore.getState().firmwareVersions[id];
      expect(fw!.name).toBe('Sensor FW');
      expect(fw!.version).toBe('1.0.0');
      expect(fw!.status).toBe('draft');
    });
  });

  describe('updateFirmware', () => {
    it('should update firmware status', () => {
      const id = useHardwareStore.getState().createFirmware('FW', '0.1.0');
      useHardwareStore.getState().updateFirmware(id, { status: 'staged' });
      expect(useHardwareStore.getState().firmwareVersions[id]!.status).toBe('staged');
    });

    it('should not create new firmware for unknown IDs', () => {
      useHardwareStore.getState().updateFirmware('nonexistent', { name: 'X' });
      expect(useHardwareStore.getState().firmwareVersions['nonexistent']).toBeUndefined();
    });
  });

  describe('deleteFirmware', () => {
    it('should remove firmware', () => {
      const id = useHardwareStore.getState().createFirmware('FW', '0.1.0');
      useHardwareStore.getState().deleteFirmware(id);
      expect(useHardwareStore.getState().firmwareVersions[id]).toBeUndefined();
    });
  });

  describe('getDeployedFirmware', () => {
    it('should return the deployed firmware', () => {
      const id1 = useHardwareStore.getState().createFirmware('Draft', '0.1.0');
      const id2 = useHardwareStore.getState().createFirmware('Live', '1.0.0');
      useHardwareStore.getState().updateFirmware(id2, {
        status: 'deployed',
        deployedAt: Date.now(),
      });
      const deployed = useHardwareStore.getState().getDeployedFirmware();
      expect(deployed).not.toBeNull();
      expect(deployed!.id).toBe(id2);
    });

    it('should return null when no firmware is deployed', () => {
      useHardwareStore.getState().createFirmware('Draft', '0.1.0');
      expect(useHardwareStore.getState().getDeployedFirmware()).toBeNull();
    });
  });

  // ─── Supplier CRUD ──────────────────────────────────────────────

  describe('addSupplier', () => {
    it('should add a supplier with linked=false', () => {
      const id = useHardwareStore.getState().addSupplier('Mouser', 'distributor');
      expect(id).toMatch(/^hw_/);
      const sup = useHardwareStore.getState().suppliers[id];
      expect(sup!.name).toBe('Mouser');
      expect(sup!.type).toBe('distributor');
      expect(sup!.linked).toBe(false);
    });
  });

  describe('deleteSupplier', () => {
    it('should remove a supplier', () => {
      const id = useHardwareStore.getState().addSupplier('DigiKey', 'distributor');
      useHardwareStore.getState().deleteSupplier(id);
      expect(useHardwareStore.getState().suppliers[id]).toBeUndefined();
    });
  });

  describe('linkSupplier / unlinkSupplier', () => {
    it('should link and unlink a supplier', () => {
      const id = useHardwareStore.getState().addSupplier('PCBWay', 'fab-house');
      useHardwareStore.getState().linkSupplier(id);
      const linked = useHardwareStore.getState().suppliers[id]!;
      expect(linked.linked).toBe(true);
      expect(linked.lastSync).toBeGreaterThan(0);

      useHardwareStore.getState().unlinkSupplier(id);
      expect(useHardwareStore.getState().suppliers[id]!.linked).toBe(false);
    });

    it('should not re-link an already linked supplier', () => {
      const id = useHardwareStore.getState().addSupplier('JLCPCB', 'fab-house');
      useHardwareStore.getState().linkSupplier(id);
      const ts = useHardwareStore.getState().suppliers[id]!.lastSync;
      useHardwareStore.getState().linkSupplier(id);
      expect(useHardwareStore.getState().suppliers[id]!.lastSync).toBe(ts);
    });
  });
});
