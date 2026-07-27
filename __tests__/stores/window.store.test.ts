import { describe, it, expect, beforeEach } from 'vitest';
import { useWindowStore } from '@/lib/stores/window.store';

describe('WindowStore', () => {
  beforeEach(() => {
    useWindowStore.setState({ windows: [], highestZIndex: 10 });
  });

  it('starts with empty windows', () => {
    expect(useWindowStore.getState().windows).toEqual([]);
    expect(useWindowStore.getState().highestZIndex).toBe(10);
  });

  it('openWindow adds a window', () => {
    useWindowStore.getState().openWindow('terminal', 'My Terminal');
    const { windows } = useWindowStore.getState();
    expect(windows).toHaveLength(1);
    expect(windows[0]!.appId).toBe('terminal');
    expect(windows[0]!.title).toBe('My Terminal');
    expect(windows[0]!.isMinimized).toBe(false);
    expect(windows[0]!.isMaximized).toBe(false);
  });

  it('openWindow increments zIndex', () => {
    useWindowStore.getState().openWindow('terminal');
    useWindowStore.getState().openWindow('browser');
    const { windows, highestZIndex } = useWindowStore.getState();
    expect(windows).toHaveLength(2);
    expect(highestZIndex).toBe(12);
    expect(windows[0]!.zIndex).toBeLessThan(windows[1]!.zIndex);
  });

  it('closeWindow removes window', () => {
    useWindowStore.getState().openWindow('terminal');
    const { windows } = useWindowStore.getState();
    const id = windows[0]!.id;
    useWindowStore.getState().closeWindow(id);
    expect(useWindowStore.getState().windows).toHaveLength(0);
  });

  it('focusWindow brings to front', () => {
    useWindowStore.getState().openWindow('terminal');
    useWindowStore.getState().openWindow('browser');
    const { windows } = useWindowStore.getState();
    const terminalId = windows.find((w) => w.appId === 'terminal')!.id;
    useWindowStore.getState().focusWindow(terminalId);
    const { windows: updated } = useWindowStore.getState();
    const terminal = updated.find((w) => w.appId === 'terminal')!;
    expect(terminal.zIndex).toBe(useWindowStore.getState().highestZIndex);
    expect(terminal.isMinimized).toBe(false);
  });

  it('minimizeWindow sets isMinimized true', () => {
    useWindowStore.getState().openWindow('terminal');
    const { windows } = useWindowStore.getState();
    useWindowStore.getState().minimizeWindow(windows[0]!.id);
    expect(useWindowStore.getState().windows[0]!.isMinimized).toBe(true);
  });

  it('maximizeWindow toggles isMaximized', () => {
    useWindowStore.getState().openWindow('terminal');
    const { windows } = useWindowStore.getState();
    useWindowStore.getState().maximizeWindow(windows[0]!.id);
    expect(useWindowStore.getState().windows[0]!.isMaximized).toBe(true);
    useWindowStore.getState().maximizeWindow(windows[0]!.id);
    expect(useWindowStore.getState().windows[0]!.isMaximized).toBe(false);
  });

  it('updateWindowDimensions updates position and size', () => {
    useWindowStore.getState().openWindow('terminal');
    const { windows } = useWindowStore.getState();
    useWindowStore.getState().updateWindowDimensions(windows[0]!.id, 50, 50, 1000, 700);
    const updated = useWindowStore.getState().windows[0]!;
    expect(updated.x).toBe(50);
    expect(updated.y).toBe(50);
    expect(updated.width).toBe(1000);
    expect(updated.height).toBe(700);
  });

  it('updateWindowData merges data', () => {
    useWindowStore.getState().openWindow('terminal');
    const { windows } = useWindowStore.getState();
    useWindowStore.getState().updateWindowData(windows[0]!.id, { fileId: 'abc' });
    useWindowStore.getState().updateWindowData(windows[0]!.id, { extra: 123 });
    const updated = useWindowStore.getState().windows[0]!;
    expect(updated.data).toEqual({ fileId: 'abc', extra: 123 });
  });

  it('setWindows replaces windows and updates highest zIndex', () => {
    useWindowStore.getState().setWindows([
      {
        id: 'test-1',
        appId: 'terminal',
        title: 'T',
        isMinimized: false,
        isMaximized: false,
        zIndex: 15,
        width: 400,
        height: 300,
        x: 0,
        y: 0,
      },
    ]);
    expect(useWindowStore.getState().windows).toHaveLength(1);
    expect(useWindowStore.getState().highestZIndex).toBe(15);
  });

  it('single-instance apps prevent duplicate windows', () => {
    useWindowStore.getState().openWindow('terminal', 'First');
    useWindowStore.getState().openWindow('terminal', 'Second');
    expect(useWindowStore.getState().windows).toHaveLength(1);
    expect(useWindowStore.getState().windows[0]!.title).toBe('First');
  });

  it('non-single-instance apps allow duplicates', () => {
    useWindowStore.getState().openWindow('code', 'First');
    useWindowStore.getState().openWindow('code', 'Second');
    expect(useWindowStore.getState().windows).toHaveLength(2);
  });
});
