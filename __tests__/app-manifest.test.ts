import { describe, it, expect } from 'vitest';
import { APP_MANIFEST, getManifestEntry, getAppsForRole, getAppsByCategory } from '@/lib/app-manifest';

describe('AppManifest', () => {
  it('has entries for all apps', () => {
    expect(APP_MANIFEST.length).toBeGreaterThan(0);
  });

  it('each entry has required fields', () => {
    APP_MANIFEST.forEach((app) => {
      expect(app.id).toBeTruthy();
      expect(app.icon).toBeTruthy();
      expect(app.title).toBeTruthy();
      expect(app.roles.length).toBeGreaterThan(0);
      expect(typeof app.isCore).toBe('boolean');
      expect(app.category).toBeTruthy();
    });
  });

  it('no duplicate IDs', () => {
    const ids = APP_MANIFEST.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getManifestEntry returns correct entry', () => {
    const entry = getManifestEntry('terminal');
    expect(entry).toBeDefined();
    expect(entry!.title).toBe('Terminal');
    expect(entry!.isCore).toBe(true);
  });

  it('getManifestEntry returns undefined for unknown', () => {
    expect(getManifestEntry('nonexistent')).toBeUndefined();
  });

  it('getAppsForRole returns apps matching role', () => {
    const adminApps = getAppsForRole('admin');
    expect(adminApps.length).toBeGreaterThan(0);
    adminApps.forEach((app) => {
      expect(app.roles).toContain('admin');
    });
  });

  it('getAppsByCategory returns correct category', () => {
    const systemApps = getAppsByCategory('system');
    expect(systemApps.length).toBeGreaterThan(0);
    systemApps.forEach((app) => {
      expect(app.category).toBe('system');
    });
  });

  it('core apps are marked correctly', () => {
    const coreApps = APP_MANIFEST.filter((a) => a.isCore);
    expect(coreApps.length).toBeGreaterThan(0);
    const coreIds = coreApps.map((a) => a.id);
    expect(coreIds).toContain('terminal');
    expect(coreIds).toContain('files');
    expect(coreIds).toContain('settings');
    expect(coreIds).toContain('store');
  });
});
