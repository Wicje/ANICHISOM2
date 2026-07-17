import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { OSWindow } from '@/lib/stores/window.store';

const mockCloseWindow = vi.fn();
const mockMinimizeWindow = vi.fn();
const mockMaximizeWindow = vi.fn();
const mockFocusWindow = vi.fn();
const mockUpdateWindowDimensions = vi.fn();

vi.mock('@/lib/hooks/use-window-actions', () => ({
  useWindowActions: vi.fn(() => ({
    windows: [],
    highestZIndex: 20,
    openWindow: vi.fn(),
    closeWindow: mockCloseWindow,
    focusWindow: mockFocusWindow,
    minimizeWindow: mockMinimizeWindow,
    maximizeWindow: mockMaximizeWindow,
    updateWindowDimensions: mockUpdateWindowDimensions,
    updateWindowData: vi.fn(),
  })),
}));

vi.mock('@/lib/stores/theme.store', () => ({
  useThemeStore: Object.assign(
    vi.fn(() => ({ performanceMode: 'light', aeroSnap: true, animationsEnabled: true, glassmorphism: true })),
    { getState: vi.fn(() => ({ performanceMode: 'light', aeroSnap: true, animationsEnabled: true, glassmorphism: true })) }
  ),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(function MockMotionDiv(props: any, ref: any) {
      const { initial, animate, drag, dragControls, dragListener, dragMomentum, onDragEnd, onPointerDown, style, className, children, ...rest } = props;
      return (
        <div ref={ref} style={style} className={className} onPointerDown={onPointerDown} {...rest}>
          {children}
        </div>
      );
    }),
  },
  useDragControls: vi.fn(() => ({ start: vi.fn() })),
  useReducedMotion: vi.fn(() => false),
}));

vi.mock('lucide-react', () => ({
  X: (p: any) => <svg data-testid="icon-x" {...p} />,
  Minus: (p: any) => <svg data-testid="icon-minus" {...p} />,
  Maximize2: (p: any) => <svg data-testid="icon-maximize" {...p} />,
  Square: (p: any) => <svg data-testid="icon-square" {...p} />,
  Lock: (p: any) => <svg data-testid="icon-lock" {...p} />,
}));

vi.mock('@/lib/file-lock-manager', () => ({
  getFileLockManager: vi.fn(() => ({
    isLocked: vi.fn(() => ({ locked: false, userId: null })),
  })),
}));

import { WindowFrame } from '@/components/window-frame';

function makeWindow(overrides: Partial<OSWindow> = {}): OSWindow {
  return {
    id: 'win-1',
    appId: 'terminal',
    title: 'Terminal',
    isMinimized: false,
    isMaximized: false,
    zIndex: 15,
    width: 800,
    height: 600,
    x: 100,
    y: 100,
    ...overrides,
  };
}

describe('WindowFrame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children and title', () => {
    render(
      <WindowFrame osWindow={makeWindow()}>
        <p>App Content</p>
      </WindowFrame>
    );
    expect(screen.getByText('App Content')).toBeTruthy();
    expect(screen.getByText('Terminal')).toBeTruthy();
  });

  it('renders as a dialog with aria-label', () => {
    render(
      <WindowFrame osWindow={makeWindow({ title: 'My App' })}>
        <span>content</span>
      </WindowFrame>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-label')).toBe('My App');
  });

  it('calls closeWindow when close button is clicked', () => {
    render(
      <WindowFrame osWindow={makeWindow({ id: 'win-close' })}>
        <span>content</span>
      </WindowFrame>
    );
    fireEvent.click(screen.getByLabelText('Close window'));
    expect(mockCloseWindow).toHaveBeenCalledWith('win-close');
  });

  it('calls minimizeWindow when minimize button is clicked', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <WindowFrame osWindow={makeWindow({ id: 'win-min' })}>
        <span>content</span>
      </WindowFrame>
    );
    fireEvent.click(screen.getByLabelText('Minimize window'));
    expect(mockMinimizeWindow).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(mockMinimizeWindow).toHaveBeenCalledWith('win-min');
    vi.useRealTimers();
  });

  it('calls maximizeWindow when maximize button is clicked', () => {
    render(
      <WindowFrame osWindow={makeWindow({ id: 'win-max' })}>
        <span>content</span>
      </WindowFrame>
    );
    fireEvent.click(screen.getByLabelText('Maximize window'));
    expect(mockMaximizeWindow).toHaveBeenCalledWith('win-max');
  });

  it('hides when isMinimized is true', () => {
    const { container } = render(
      <WindowFrame osWindow={makeWindow({ isMinimized: true })}>
        <span>Hidden Content</span>
      </WindowFrame>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.display).toBe('none');
  });

  it('calls focusWindow on pointer down', () => {
    render(
      <WindowFrame osWindow={makeWindow({ id: 'win-focus' })}>
        <span>content</span>
      </WindowFrame>
    );
    fireEvent.pointerDown(screen.getByRole('dialog'));
    expect(mockFocusWindow).toHaveBeenCalledWith('win-focus');
  });
});
