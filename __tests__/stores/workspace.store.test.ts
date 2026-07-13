import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';

describe('WorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaceMode: 'private',
      activeWorkspace: 0,
      installedApps: [],
      recentApps: [],
      snapshots: [],
      workspaceId: 'personal',
      workspaces: [],
      mode: 'create',
    });
  });

  it('starts with defaults', () => {
    const state = useWorkspaceStore.getState();
    expect(state.workspaceMode).toBe('private');
    expect(state.activeWorkspace).toBe(0);
    expect(state.installedApps).toEqual([]);
    expect(state.recentApps).toEqual([]);
    expect(state.snapshots).toEqual([]);
    expect(state.workspaceId).toBe('personal');
    expect(state.mode).toBe('create');
  });

  it('installApp adds appId', () => {
    useWorkspaceStore.getState().installApp('terminal');
    expect(useWorkspaceStore.getState().installedApps).toContain('terminal');
  });

  it('installApp does not duplicate', () => {
    useWorkspaceStore.getState().installApp('terminal');
    useWorkspaceStore.getState().installApp('terminal');
    expect(useWorkspaceStore.getState().installedApps).toHaveLength(1);
  });

  it('uninstallApp removes appId', () => {
    useWorkspaceStore.getState().installApp('terminal');
    useWorkspaceStore.getState().installApp('browser');
    useWorkspaceStore.getState().uninstallApp('terminal');
    expect(useWorkspaceStore.getState().installedApps).toEqual(['browser']);
  });

  it('addRecentApp moves to front and limits to 5', () => {
    const store = useWorkspaceStore.getState();
    store.addRecentApp('a');
    store.addRecentApp('b');
    store.addRecentApp('c');
    store.addRecentApp('d');
    store.addRecentApp('e');
    store.addRecentApp('f');
    expect(useWorkspaceStore.getState().recentApps).toEqual(['f', 'e', 'd', 'c', 'b']);
  });

  it('addRecentApp deduplicates', () => {
    const store = useWorkspaceStore.getState();
    store.addRecentApp('a');
    store.addRecentApp('b');
    store.addRecentApp('a');
    expect(useWorkspaceStore.getState().recentApps).toEqual(['a', 'b']);
  });

  it('saveSnapshot creates snapshot with windows', () => {
    useWorkspaceStore.getState().saveSnapshot('test', [
      {
        id: 'w1',
        appId: 'terminal',
        title: 'T',
        isMinimized: false,
        isMaximized: false,
        zIndex: 10,
        width: 400,
        height: 300,
        x: 0,
        y: 0,
      },
    ]);
    const { snapshots } = useWorkspaceStore.getState();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.name).toBe('test');
    expect(snapshots[0]!.windows).toHaveLength(1);
  });

  it('restoreSnapshot returns matching snapshot', () => {
    useWorkspaceStore.getState().saveSnapshot('snap1', []);
    const { snapshots } = useWorkspaceStore.getState();
    const result = useWorkspaceStore.getState().restoreSnapshot(snapshots[0]!.id);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('snap1');
  });

  it('restoreSnapshot returns null for unknown id', () => {
    expect(useWorkspaceStore.getState().restoreSnapshot('nonexistent')).toBeNull();
  });

  it('setWorkspaceMode updates mode', () => {
    useWorkspaceStore.getState().setWorkspaceMode('agency');
    expect(useWorkspaceStore.getState().workspaceMode).toBe('agency');
  });

  it('setActiveWorkspace updates active workspace', () => {
    useWorkspaceStore.getState().setActiveWorkspace(2);
    expect(useWorkspaceStore.getState().activeWorkspace).toBe(2);
  });

  it('setMode updates mode', () => {
    useWorkspaceStore.getState().setMode('review');
    expect(useWorkspaceStore.getState().mode).toBe('review');
  });
});
