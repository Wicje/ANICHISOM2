import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockOpenWindow = vi.fn();
const mockFocusWindow = vi.fn();
const mockMinimizeWindow = vi.fn();

vi.mock('@/lib/hooks/use-window-actions', () => ({
  useWindowActions: vi.fn(() => ({
    windows: [],
    highestZIndex: 10,
    openWindow: mockOpenWindow,
    closeWindow: vi.fn(),
    focusWindow: mockFocusWindow,
    minimizeWindow: mockMinimizeWindow,
    maximizeWindow: vi.fn(),
    updateWindowDimensions: vi.fn(),
    updateWindowData: vi.fn(),
  })),
}));

vi.mock('@/lib/stores/theme.store', () => ({
  useThemeStore: Object.assign(
    vi.fn(() => ({ performanceMode: 'light' })),
    { getState: vi.fn(() => ({ performanceMode: 'light' })) }
  ),
}));

vi.mock('@/lib/stores/window.store', () => {
  const state = { windows: [], highestZIndex: 10 };
  const store = (selector?: any) => (typeof selector === 'function' ? selector(state) : state);
  store.getState = vi.fn(() => state);
  return { useWindowStore: store };
});

vi.mock('@/lib/stores/workspace.store', () => {
  const state = { activeWorkspace: 0, installedApps: ['terminal', 'browser'], recentApps: [] };
  const store = (selector?: any) => (typeof selector === 'function' ? selector(state) : state);
  store.getState = vi.fn(() => state);
  return { useWorkspaceStore: store };
});

vi.mock('lucide-react', () => ({
  Grid: (p: any) => <svg data-testid="icon-grid" {...p} />,
  Layers: (p: any) => <svg data-testid="icon-layers" {...p} />,
  Folder: (p: any) => <svg data-testid="icon-folder" {...p} />,
}));

vi.mock('@/lib/app-manifest', () => ({
  APP_MANIFEST: [
    { id: 'terminal', title: 'Terminal', icon: () => <svg data-testid="app-terminal" />, category: 'utility', isCore: true, roles: ['admin', 'user'] },
    { id: 'browser', title: 'Browser', icon: () => <svg data-testid="app-browser" />, category: 'utility', isCore: true, roles: ['admin', 'user'] },
    { id: 'files', title: 'Files', icon: () => <svg data-testid="app-files" />, category: 'utility', isCore: true, roles: ['admin', 'user'] },
  ],
}));

vi.mock('@/lib/plugin-registry', () => ({
  getAllPlugins: vi.fn(() => []),
  isPluginActive: vi.fn(() => false),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Auth store mock — use vi.hoisted so the variable is available inside vi.mock
const { authStoreFn } = vi.hoisted(() => ({
  authStoreFn: vi.fn(() => ({
    currentUser: { id: 'u1', name: 'Test', role: 'admin' },
  })),
}));

vi.mock('@/lib/stores/auth.store', () => ({
  useAuthStore: Object.assign(authStoreFn, {
    getState: vi.fn(() => ({ currentUser: { id: 'u1', name: 'Test', role: 'admin' } })),
  }),
}));

import { Dock } from '@/components/desktop/dock';

describe('Dock', () => {
  const defaultProps = {
    showLaunchpad: false,
    setShowLaunchpad: vi.fn(),
    showMissionControl: false,
    setShowMissionControl: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authStoreFn.mockReturnValue({
      currentUser: { id: 'u1', name: 'Test', role: 'admin' },
    });
  });

  it('renders the toolbar with Launchpad and Mission Control buttons', () => {
    render(<Dock {...defaultProps} />);
    expect(screen.getByRole('toolbar')).toBeTruthy();
    expect(screen.getByLabelText('Launchpad')).toBeTruthy();
    expect(screen.getByLabelText('Mission Control')).toBeTruthy();
  });

  it('renders app icons for installed core apps', () => {
    render(<Dock {...defaultProps} />);
    expect(screen.getByLabelText('Terminal')).toBeTruthy();
    expect(screen.getByLabelText('Browser')).toBeTruthy();
  });

  it('calls openWindow when clicking an app that has no open window', () => {
    render(<Dock {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Terminal'));
    expect(mockOpenWindow).toHaveBeenCalledWith('terminal');
  });

  it('calls setShowLaunchpad with toggle when Launchpad is clicked', () => {
    const setShowLaunchpad = vi.fn();
    render(<Dock {...defaultProps} setShowLaunchpad={setShowLaunchpad} />);
    fireEvent.click(screen.getByLabelText('Launchpad'));
    expect(setShowLaunchpad).toHaveBeenCalled();
  });

  it('calls setShowMissionControl when Mission Control is clicked', () => {
    const setShowMissionControl = vi.fn();
    render(<Dock {...defaultProps} setShowMissionControl={setShowMissionControl} />);
    fireEvent.click(screen.getByLabelText('Mission Control'));
    expect(setShowMissionControl).toHaveBeenCalled();
  });

  it('returns null when there is no current user', () => {
    authStoreFn.mockReturnValue({ currentUser: undefined as unknown as { id: string; name: string; role: string } });
    const { container } = render(<Dock {...defaultProps} />);
    expect(container.innerHTML).toBe('');
  });
});
