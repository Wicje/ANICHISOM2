import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// ─── Mock child components to avoid deep render trees ────────────────
vi.mock('@/components/command-palette', () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}));

vi.mock('@/components/window-frame', () => ({
  WindowFrame: ({ children }: any) => <div data-testid="window-frame">{children}</div>,
}));

vi.mock('@/components/desktop/menu-bar', () => ({
  MenuBar: () => <div data-testid="menu-bar" />,
}));

vi.mock('@/components/desktop/dock', () => ({
  Dock: () => <div data-testid="dock" />,
}));

vi.mock('@/components/desktop/launchpad', () => ({
  Launchpad: () => <div data-testid="launchpad" />,
}));

vi.mock('@/components/desktop/mission-control', () => ({
  MissionControl: () => <div data-testid="mission-control" />,
}));

vi.mock('@/components/desktop/control-center', () => ({
  ControlCenter: () => <div data-testid="control-center" />,
}));

vi.mock('@/components/desktop/lock-screen', () => ({
  LockScreen: () => <div data-testid="lock-screen" />,
}));

vi.mock('@/components/desktop/context-menu', () => ({
  ContextMenu: () => <div data-testid="context-menu" />,
}));

vi.mock('@/components/desktop/widgets', () => ({
  WidgetsLayer: () => <div data-testid="widgets-layer" />,
}));

vi.mock('@/components/desktop/window-switcher', () => ({
  WindowSwitcher: () => <div data-testid="window-switcher" />,
}));

vi.mock('@/components/desktop/desktop-icons', () => ({
  DesktopIcons: () => <div data-testid="desktop-icons" />,
}));

vi.mock('@/components/desktop/snapshots-menu', () => ({
  SnapshotsMenu: () => <div data-testid="snapshots-menu" />,
}));

vi.mock('@/components/apps/onboarding-wizard', () => ({
  __esModule: true,
  default: () => <div data-testid="onboarding-wizard" />,
}));

vi.mock('@/components/apps/feedback-widget', () => ({
  __esModule: true,
  default: () => <div data-testid="feedback-widget" />,
}));

vi.mock('@/components/login-screen', () => ({
  __esModule: true,
  LoginScreen: () => <div data-testid="login-screen" />,
  default: () => <div data-testid="login-screen" />,
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn().mockResolvedValue(undefined),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  })),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  })),
}));

vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('motion/react', () => ({
  motion: { div: React.forwardRef((p: any, r: any) => <div ref={r} {...p} />) },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useDragControls: vi.fn(() => ({ start: vi.fn() })),
  useReducedMotion: vi.fn(() => false),
}));

vi.mock('lucide-react', () => new Proxy({}, { get: () => (p: any) => <svg {...p} /> }));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// ─── Mock stores (use vi.hoisted so variables are available in vi.mock factories) ──
const { authStoreState } = vi.hoisted(() => ({
  authStoreState: {
    currentUser: { id: 'u1', name: 'Test', role: 'admin' } as { id: string; name: string; role: string } | null,
    sessionChecked: true,
    setCurrentUser: vi.fn(),
    logout: vi.fn(),
    wipeSession: vi.fn(),
    checkSession: vi.fn().mockResolvedValue(undefined),
  },
}));

const { onboardingStoreState } = vi.hoisted(() => ({
  onboardingStoreState: {
    onboarding: { completed: true, selectedRole: 'admin' as string | null, selectedApps: [] as string[], customApps: [] as string[] },
  },
}));

const defaultWindow = {
  windows: [],
  highestZIndex: 10,
  openWindow: vi.fn(),
  closeWindow: vi.fn(),
  focusWindow: vi.fn(),
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  updateWindowDimensions: vi.fn(),
  applyWorkspaceLayout: vi.fn(),
  setWindows: vi.fn(),
};

const defaultTheme = {
  wallpaper: 'test-wallpaper.jpg',
  themeColor: '#000',
  fontFamily: '"ABeeZee", system-ui, sans-serif',
  screenShader: 'none',
  performanceMode: 'light' as const,
  colorMode: 'light' as const,
  setPerformanceMode: vi.fn(),
  setColorMode: vi.fn(),
  hydrateColorMode: vi.fn().mockResolvedValue(undefined),
};

const defaultWorkspace = {
  activeWorkspace: 0,
  installedApps: [],
  recentApps: [],
  snapshots: [],
  setActiveWorkspace: vi.fn(),
  saveSnapshot: vi.fn(),
  restoreSnapshot: vi.fn(),
};

const mockGetAppPrivacy = vi.fn(() => ({ level: 'shared' as const }));

vi.mock('@/lib/stores/auth.store', () => ({
  useAuthStore: Object.assign(
    vi.fn(() => authStoreState),
    { getState: vi.fn(() => authStoreState) }
  ),
}));

vi.mock('@/lib/stores/window.store', () => ({
  useWindowStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = { ...defaultWindow };
      return selector ? selector(state) : state;
    }),
    { getState: vi.fn(() => defaultWindow) }
  ),
}));

vi.mock('@/lib/stores/theme.store', () => ({
  useThemeStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = { ...defaultTheme };
      return selector ? selector(state) : state;
    }),
    { getState: vi.fn(() => defaultTheme) }
  ),
}));

vi.mock('@/lib/stores/workspace.store', () => ({
  useWorkspaceStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = { ...defaultWorkspace };
      return selector ? selector(state) : state;
    }),
    { getState: vi.fn(() => defaultWorkspace) }
  ),
}));

vi.mock('@/lib/stores/privacy.store', () => ({
  usePrivacyStore: Object.assign(
    vi.fn((selector?: any) => {
      return selector ? selector({ getAppPrivacy: mockGetAppPrivacy }) : { getAppPrivacy: mockGetAppPrivacy };
    }),
    { getState: vi.fn(() => ({ getAppPrivacy: mockGetAppPrivacy })) }
  ),
}));

vi.mock('@/lib/stores/onboarding.store', () => ({
  useOnboardingStore: Object.assign(
    vi.fn(() => onboardingStoreState),
    {
      getState: vi.fn(() => onboardingStoreState),
      hydrate: vi.fn(),
    }
  ),
}));

vi.mock('@/lib/stores/notification.store', () => ({
  useNotificationStore: Object.assign(
    vi.fn(() => ({ addNotification: vi.fn() })),
    { getState: vi.fn(() => ({ addNotification: vi.fn() })) }
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (p: any) => <div data-testid="skeleton" {...p} />,
  CardSkeleton: () => <div data-testid="card-skeleton" />,
  PageSkeleton: () => <div data-testid="page-skeleton" />,
  BootSplash: () => null,
}));

vi.mock('@/lib/plugin-registry', () => ({
  subscribe: vi.fn(() => vi.fn()),
  getAllPlugins: vi.fn(() => []),
  loadInstallStates: vi.fn(),
  registerBuiltinPlugins: vi.fn(),
  persistInstallStates: vi.fn(),
  isPluginActive: vi.fn(() => false),
}));

vi.mock('@/lib/app-manifest', () => ({
  APP_MANIFEST: [],
  resolveAppComponent: vi.fn(() => Promise.resolve(() => <div />)),
}));

vi.mock('@/lib/fs', () => ({
  FS: {
    read: vi.fn(() => Promise.resolve(null)),
    readDir: vi.fn(() => Promise.resolve([])),
    write: vi.fn(() => Promise.resolve()),
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────
import { Desktop } from '@/components/desktop';

describe('Desktop', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    authStoreState.currentUser = { id: 'u1', name: 'Test', role: 'admin' };
    authStoreState.sessionChecked = true;
    onboardingStoreState.onboarding = { completed: true, selectedRole: 'admin', selectedApps: [], customApps: [] };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the onboarding wizard when no user is logged in and onboarding not completed', async () => {
    authStoreState.currentUser = null;
    authStoreState.sessionChecked = true;
    onboardingStoreState.onboarding = { completed: false, selectedRole: null, selectedApps: [], customApps: [] };
    render(<Desktop />);
    await act(async () => { vi.advanceTimersByTime(2500); });
    await waitFor(() => expect(screen.getByTestId('onboarding-wizard')).toBeTruthy());
  });

  it('renders LoginScreen when no user is logged in and onboarding is completed', async () => {
    authStoreState.currentUser = null;
    authStoreState.sessionChecked = true;
    onboardingStoreState.onboarding = { completed: true, selectedRole: 'admin', selectedApps: [], customApps: [] };
    render(<Desktop />);
    await act(async () => { vi.advanceTimersByTime(2500); });
    const innerDiv = document.querySelector('.fixed.inset-0');
    expect(innerDiv).toBeTruthy();
    expect(screen.getByTestId('login-screen')).toBeTruthy();
    expect(screen.queryByTestId('menu-bar')).toBeNull();
  });

  it('renders the full desktop shell when a user is logged in', async () => {
    render(<Desktop />);
    await act(async () => { vi.advanceTimersByTime(2500); });
    expect(screen.getByTestId('menu-bar')).toBeTruthy();
    expect(screen.getByTestId('dock')).toBeTruthy();
    expect(screen.getByTestId('command-palette')).toBeTruthy();
    expect(screen.getByTestId('desktop-icons')).toBeTruthy();
    expect(screen.getByTestId('widgets-layer')).toBeTruthy();
    expect(screen.getByTestId('toaster')).toBeTruthy();
  });

  it('renders the feedback widget when onboarding is completed', async () => {
    render(<Desktop />);
    await act(async () => { vi.advanceTimersByTime(2500); });
    expect(screen.getByTestId('feedback-widget')).toBeTruthy();
  });

  it('does not render launchpad or mission control by default', async () => {
    render(<Desktop />);
    await act(async () => { vi.advanceTimersByTime(2500); });
    expect(screen.queryByTestId('launchpad')).toBeNull();
    expect(screen.queryByTestId('mission-control')).toBeNull();
  });

  it('does not render the lock screen initially', async () => {
    render(<Desktop />);
    await act(async () => { vi.advanceTimersByTime(2500); });
    expect(screen.queryByTestId('lock-screen')).toBeNull();
  });

  it('sets the fontFamily style on the root element', async () => {
    render(<Desktop />);
    await act(async () => { vi.advanceTimersByTime(2500); });
    const root = document.querySelector('.fixed.inset-0') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.fontFamily).toBe('"ABeeZee", system-ui, sans-serif');
  });

  it('includes the wallpaper in the rendered output', async () => {
    render(<Desktop />);
    await act(async () => { vi.advanceTimersByTime(2500); });
    const allDivs = document.querySelectorAll('div');
    const bgDiv = Array.from(allDivs).find(
      (d) => d.className.includes('bg-cover') && d.className.includes('bg-center')
    );
    expect(bgDiv).toBeTruthy();
    expect(bgDiv?.getAttribute('style')).toContain('test-wallpaper.jpg');
  });
});
