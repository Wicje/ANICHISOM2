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
  const icon = (p: any) => <svg {...p} />;
  return {
    Terminal: icon, Folder: icon, Globe: icon, Sparkles: icon,
    Image: icon, Search: icon, Archive: icon, Clipboard: icon,
    AppWindow: icon, File: icon, Music: icon, Layout: icon,
  };
});

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
