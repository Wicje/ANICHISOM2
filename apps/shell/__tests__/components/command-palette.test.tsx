import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { mockUseOS } = vi.hoisted(() => ({
  mockUseOS: vi.fn(() => ({
    openWindow: vi.fn(),
    windows: [],
    focusWindow: vi.fn(),
    installedApps: ['terminal', 'browser'],
    currentUser: { id: 'u1', name: 'Test', role: 'admin' },
  })),
}));

vi.mock('@/lib/os-context', () => ({
  useOS: mockUseOS,
}));

vi.mock('@/lib/web-app-catalog', () => ({
  WEB_APP_CATALOG: [],
}));

vi.mock('@/lib/app-manifest', () => ({
  APP_MANIFEST: [
    { id: 'terminal', title: 'Terminal', icon: () => <svg />, category: 'utility', isCore: true, roles: ['admin', 'user'] },
    { id: 'browser', title: 'Browser', icon: () => <svg />, category: 'utility', isCore: true, roles: ['admin', 'user'] },
    { id: 'files', title: 'Files', icon: () => <svg />, category: 'utility', isCore: false, roles: ['admin'] },
  ],
}));

vi.mock('@/lib/stores/file.store', () => ({
  useFileStore: {
    getState: () => ({
      resolveSmartRoute: () => null,
    }),
  },
}));

vi.mock('@/lib/fs', () => ({
  FS: {
    readDir: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('lucide-react', () => {
  const MockIcon = (props: any) => <svg {...props} />;
  return {
    Terminal: MockIcon, Folder: MockIcon, Globe: MockIcon, Sparkles: MockIcon,
    Image: MockIcon, Search: MockIcon, Archive: MockIcon, Clipboard: MockIcon,
    AppWindow: MockIcon, File: MockIcon, Music: MockIcon, Layout: MockIcon,
    Sun: MockIcon, Moon: MockIcon, Maximize2: MockIcon, Minimize2: MockIcon,
    Trash2: MockIcon, Settings: MockIcon, Volume2: MockIcon, VolumeX: MockIcon,
    Bell: MockIcon, Eye: MockIcon, Camera: MockIcon, Code: MockIcon,
  };
});

vi.mock('@/lib/stores/theme.store', () => ({
  useThemeStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = { colorMode: 'dark', muted: false, volume: 80 };
      return selector ? selector(state) : state;
    }),
    { getState: vi.fn(() => ({ colorMode: 'dark', muted: false, volume: 80 })) }
  ),
}));

vi.mock('@/lib/stores/window.store', () => ({
  useWindowStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = { windows: [], minimizeWindow: vi.fn(), closeWindow: vi.fn() };
      return selector ? selector(state) : state;
    }),
    { getState: vi.fn(() => ({ windows: [], minimizeWindow: vi.fn(), closeWindow: vi.fn() })) }
  ),
}));

vi.mock('@/lib/stores/notification.store', () => ({
  useNotificationStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = { notifications: [], clearAll: vi.fn() };
      return selector ? selector(state) : state;
    }),
    { getState: vi.fn(() => ({ notifications: [], clearAll: vi.fn() })) }
  ),
}));

vi.mock('@/lib/stores/focus.store', () => ({
  useFocusStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = { enabled: false, toggle: vi.fn() };
      return selector ? selector(state) : state;
    }),
    { getState: vi.fn(() => ({ enabled: false, toggle: vi.fn() })) }
  ),
}));

vi.mock('@/lib/stores/screenshot.store', () => ({
  useScreenshotStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = { active: false, start: vi.fn() };
      return selector ? selector(state) : state;
    }),
    { getState: vi.fn(() => ({ active: false, start: vi.fn() })) }
  ),
}));

vi.mock('@/lib/stores/clipboard.store', () => ({
  useClipboardUIStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = { isOpen: false, toggle: vi.fn() };
      return selector ? selector(state) : state;
    }),
    { getState: vi.fn(() => ({ isOpen: false, toggle: vi.fn() })) }
  ),
}));

import { CommandPalette } from '@/components/command-palette';

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOS.mockReturnValue({
      openWindow: vi.fn(),
      windows: [],
      focusWindow: vi.fn(),
      installedApps: ['terminal', 'browser'],
      currentUser: { id: 'u1', name: 'Test', role: 'admin' },
    });
  });

  it('renders nothing when closed (initial state)', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('renders empty content when closed', () => {
    const { container } = render(<CommandPalette />);
    expect(container.innerHTML).toBe('');
  });

  it('registers a keyboard event handler on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<CommandPalette />);
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    addSpy.mockRestore();
  });

  it('registers the os:open-spotlight custom event handler', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<CommandPalette />);
    expect(addSpy).toHaveBeenCalledWith('os:open-spotlight', expect.any(Function));
    addSpy.mockRestore();
  });

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<CommandPalette />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('os:open-spotlight', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('calls useOS to get window management functions', () => {
    render(<CommandPalette />);
    expect(mockUseOS).toHaveBeenCalled();
  });
});
