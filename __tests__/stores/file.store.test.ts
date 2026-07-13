/**
 * Tests for File Zustand store — multi-source navigation, smart routing, version history.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useFileStore } from '@/lib/stores/file.store';

beforeEach(() => {
  useFileStore.setState({
    currentSource: 'opfs',
    currentPath: '/',
    files: [],
    selectedFiles: new Set(),
    viewMode: 'list',
    sortBy: 'name',
    sortDir: 'asc',
    searchQuery: '',
    connectedSources: ['opfs'],
    localFolderName: null,
    versionHistory: [],
  });
});

describe('FileStore', () => {
  describe('Source navigation', () => {
    it('should set current source and reset path/selection', () => {
      const { setCurrentSource } = useFileStore.getState();
      setCurrentSource('onedrive');
      expect(useFileStore.getState().currentSource).toBe('onedrive');
      expect(useFileStore.getState().currentPath).toBe('/');
      expect(useFileStore.getState().selectedFiles.size).toBe(0);
    });

    it('should set current path', () => {
      const { setCurrentPath } = useFileStore.getState();
      setCurrentPath('/Documents/Projects');
      expect(useFileStore.getState().currentPath).toBe('/Documents/Projects');
    });

    it('should clear selection when path changes', () => {
      const { setFiles, toggleFileSelection, setCurrentPath } = useFileStore.getState();
      setFiles([{ id: '1', name: 'a.txt', path: '/', source: 'opfs', mimeType: 'text/plain', size: 100, isFolder: false }]);
      toggleFileSelection('1');
      setCurrentPath('/new');
      expect(useFileStore.getState().selectedFiles.size).toBe(0);
    });
  });

  describe('Files', () => {
    it('should set files', () => {
      const { setFiles } = useFileStore.getState();
      setFiles([
        { id: '1', name: 'readme.md', path: '/', source: 'opfs', mimeType: 'text/markdown', size: 1024, isFolder: false },
        { id: '2', name: 'src', path: '/', source: 'opfs', mimeType: '', size: 0, isFolder: true },
      ]);
      expect(useFileStore.getState().files).toHaveLength(2);
    });

    it('should toggle file selection', () => {
      const { setFiles, toggleFileSelection } = useFileStore.getState();
      setFiles([{ id: '1', name: 'a.txt', path: '/', source: 'opfs', mimeType: 'text/plain', size: 100, isFolder: false }]);
      toggleFileSelection('1');
      expect(useFileStore.getState().selectedFiles.has('1')).toBe(true);
      toggleFileSelection('1');
      expect(useFileStore.getState().selectedFiles.has('1')).toBe(false);
    });

    it('should select all files', () => {
      const { setFiles, selectAllFiles } = useFileStore.getState();
      setFiles([
        { id: '1', name: 'a.txt', path: '/', source: 'opfs', mimeType: 'text/plain', size: 100, isFolder: false },
        { id: '2', name: 'b.txt', path: '/', source: 'opfs', mimeType: 'text/plain', size: 200, isFolder: false },
      ]);
      selectAllFiles();
      expect(useFileStore.getState().selectedFiles.size).toBe(2);
    });

    it('should clear selection', () => {
      const { setFiles, selectAllFiles, clearSelection } = useFileStore.getState();
      setFiles([
        { id: '1', name: 'a.txt', path: '/', source: 'opfs', mimeType: 'text/plain', size: 100, isFolder: false },
        { id: '2', name: 'b.txt', path: '/', source: 'opfs', mimeType: 'text/plain', size: 200, isFolder: false },
      ]);
      selectAllFiles();
      clearSelection();
      expect(useFileStore.getState().selectedFiles.size).toBe(0);
    });
  });

  describe('View mode and sorting', () => {
    it('should set view mode', () => {
      const { setViewMode } = useFileStore.getState();
      setViewMode('grid');
      expect(useFileStore.getState().viewMode).toBe('grid');
    });

    it('should set sort by', () => {
      const { setSortBy } = useFileStore.getState();
      setSortBy('size');
      expect(useFileStore.getState().sortBy).toBe('size');
    });

    it('should toggle sort dir', () => {
      const { toggleSortDir } = useFileStore.getState();
      expect(useFileStore.getState().sortDir).toBe('asc');
      toggleSortDir();
      expect(useFileStore.getState().sortDir).toBe('desc');
    });

    it('should set search query', () => {
      const { setSearchQuery } = useFileStore.getState();
      setSearchQuery('readme');
      expect(useFileStore.getState().searchQuery).toBe('readme');
    });
  });

  describe('Connected sources', () => {
    it('should connect a source', () => {
      const { connectSource } = useFileStore.getState();
      connectSource('onedrive');
      expect(useFileStore.getState().connectedSources).toContain('onedrive');
    });

    it('should not duplicate connections', () => {
      const { connectSource } = useFileStore.getState();
      connectSource('opfs');
      expect(useFileStore.getState().connectedSources.filter(s => s === 'opfs')).toHaveLength(1);
    });

    it('should disconnect a source', () => {
      const { connectSource, disconnectSource } = useFileStore.getState();
      connectSource('onedrive');
      disconnectSource('onedrive');
      expect(useFileStore.getState().connectedSources).not.toContain('onedrive');
    });
  });

  describe('Smart routing', () => {
    it('should resolve image to moodboard', () => {
      const { resolveSmartRoute } = useFileStore.getState();
      expect(resolveSmartRoute('image/png', 'photo.png')).toBe('moodboard');
    });

    it('should resolve video to media player', () => {
      const { resolveSmartRoute } = useFileStore.getState();
      expect(resolveSmartRoute('video/mp4', 'clip.mp4')).toBe('media-player');
    });

    it('should resolve text to code editor', () => {
      const { resolveSmartRoute } = useFileStore.getState();
      expect(resolveSmartRoute('text/plain', 'readme.txt')).toBe('code-editor');
    });

    it('should resolve PDF to pdf reader', () => {
      const { resolveSmartRoute } = useFileStore.getState();
      expect(resolveSmartRoute('application/pdf', 'doc.pdf')).toBe('pdf-reader');
    });

    it('should return null for unknown types', () => {
      const { resolveSmartRoute } = useFileStore.getState();
      expect(resolveSmartRoute('application/octet-stream', 'data.bin')).toBeNull();
    });

    it('should add and remove custom route', () => {
      const { addSmartRoute, removeSmartRoute, resolveSmartRoute } = useFileStore.getState();
      addSmartRoute({ pattern: '*.blend', appId: 'blender-viewer', label: 'Open in Blender' });
      expect(resolveSmartRoute('application/octet-stream', 'model.blend')).toBe('blender-viewer');
      removeSmartRoute('*.blend');
      expect(resolveSmartRoute('application/octet-stream', 'model.blend')).toBeNull();
    });
  });

  describe('Version history', () => {
    it('should add a version entry', () => {
      const { addVersionEntry } = useFileStore.getState();
      addVersionEntry({
        fileId: 'file-1',
        filePath: '/test.txt',
        source: 'opfs',
        label: 'v1',
        size: 1024,
        mimeType: 'text/plain',
      });
      const history = useFileStore.getState().versionHistory;
      expect(history).toHaveLength(1);
      expect(history[0]!.fileId).toBe('file-1');
      expect(history[0]!.label).toBe('v1');
    });

    it('should get version history for a file', () => {
      const { addVersionEntry, getVersionHistory } = useFileStore.getState();
      addVersionEntry({ fileId: 'file-1', filePath: '/a.txt', source: 'opfs', label: 'v1', size: 100, mimeType: 'text/plain' });
      addVersionEntry({ fileId: 'file-2', filePath: '/b.txt', source: 'opfs', label: 'v1', size: 200, mimeType: 'text/plain' });
      addVersionEntry({ fileId: 'file-1', filePath: '/a.txt', source: 'opfs', label: 'v2', size: 150, mimeType: 'text/plain' });
      expect(getVersionHistory('file-1')).toHaveLength(2);
      expect(getVersionHistory('file-2')).toHaveLength(1);
    });

    it('should cap version history at 500', () => {
      const { addVersionEntry } = useFileStore.getState();
      for (let i = 0; i < 510; i++) {
        addVersionEntry({ fileId: 'f', filePath: '/x', source: 'opfs', label: `v${i}`, size: 10, mimeType: 'text/plain' });
      }
      expect(useFileStore.getState().versionHistory.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Filtered files', () => {
    it('should filter by search query', () => {
      const { setFiles, setSearchQuery, getFilteredFiles } = useFileStore.getState();
      setFiles([
        { id: '1', name: 'readme.md', path: '/', source: 'opfs', mimeType: 'text/plain', size: 100, isFolder: false },
        { id: '2', name: 'index.ts', path: '/', source: 'opfs', mimeType: 'text/plain', size: 200, isFolder: false },
      ]);
      setSearchQuery('readme');
      expect(getFilteredFiles()).toHaveLength(1);
      expect(getFilteredFiles()[0]!.name).toBe('readme.md');
    });

    it('should sort folders first', () => {
      const { setFiles, getFilteredFiles } = useFileStore.getState();
      setFiles([
        { id: '1', name: 'file.txt', path: '/', source: 'opfs', mimeType: 'text/plain', size: 100, isFolder: false },
        { id: '2', name: 'folder', path: '/', source: 'opfs', mimeType: '', size: 0, isFolder: true },
      ]);
      const filtered = getFilteredFiles();
      expect(filtered[0]!.isFolder).toBe(true);
    });
  });
});
