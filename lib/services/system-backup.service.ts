import { FS } from '@/lib/fs';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useWindowStore } from '@/lib/stores/window.store';

export interface ContinuaBundle {
  version: string;
  exportedAt: number;
  system: {
    theme: any;
    workspace: any;
  };
  files: Array<{
    id: string;
    name: string;
    path?: string;
    content?: string;
    mimeType?: string;
    size?: number;
  }>;
}

export const SystemBackupService = {
  exportBundle: async (): Promise<void> => {
    try {
      const allFiles = await FS.readDir('');
      const themeState = {
        wallpaper: useThemeStore.getState().wallpaper,
        colorMode: useThemeStore.getState().colorMode,
        glassmorphism: useThemeStore.getState().glassmorphism,
        animationsEnabled: useThemeStore.getState().animationsEnabled,
        performanceMode: useThemeStore.getState().performanceMode,
      };

      const workspaceState = {
        mode: useWorkspaceStore.getState().mode,
      };

      const bundle: ContinuaBundle = {
        version: '2.0.0',
        exportedAt: Date.now(),
        system: {
          theme: themeState,
          workspace: workspaceState,
        },
        files: allFiles,
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `continua-os-backup-${dateStr}.continua`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Backup Exported', description: `Exported ${allFiles.length} files & system state`, type: 'success' }
        }));
      }
    } catch (err: any) {
      console.error('[SystemBackup] Export failed:', err);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Export Failed', description: err.message || 'Could not export backup', type: 'error' }
        }));
      }
    }
  },

  importBundle: async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const bundle: ContinuaBundle = JSON.parse(text);

      if (!bundle.version || !Array.isArray(bundle.files)) {
        throw new Error('Invalid .continua backup bundle format.');
      }

      // 1. Restore VFS files
      for (const f of bundle.files) {
        if (f.id && f.content !== undefined) {
          await FS.write(f.id, f.content, f.mimeType);
        }
      }

      // 2. Restore System Preferences
      if (bundle.system?.theme) {
        const t = bundle.system.theme;
        if (t.wallpaper) useThemeStore.getState().setWallpaper(t.wallpaper);
        if (t.colorMode) useThemeStore.getState().setColorMode(t.colorMode);
        if (typeof t.glassmorphism === 'boolean') useThemeStore.getState().setGlassmorphism(t.glassmorphism);
        if (typeof t.performanceMode === 'string') useThemeStore.getState().setPerformanceMode(t.performanceMode);
      }

      if (bundle.system?.workspace?.mode) {
        useWorkspaceStore.getState().setMode(bundle.system.workspace.mode);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('os:fs-changed', { detail: { path: '/' } }));
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Backup Restored', description: `Restored ${bundle.files.length} files & settings successfully`, type: 'success' }
        }));
      }

      return true;
    } catch (err: any) {
      console.error('[SystemBackup] Import failed:', err);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Restore Failed', description: err.message || 'Could not restore backup', type: 'error' }
        }));
      }
      return false;
    }
  }
};
