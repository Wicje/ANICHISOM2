import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LoginScreen } from '@/components/login-screen';
import { useAuthStore } from '@/lib/stores/auth.store';

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
const mockSignInWithPassword = vi.fn().mockResolvedValue({
  data: {
    user: {
      id: 'user-123',
      email: 'alex@example.com',
      user_metadata: { name: 'Alex Developer', role: 'user' },
    },
  },
  error: null,
});
const mockSignUp = vi.fn().mockResolvedValue({
  data: {
    user: {
      id: 'user-456',
      email: 'newuser@example.com',
      user_metadata: { name: 'New User', role: 'user' },
    },
    session: {
      user: {
        id: 'user-456',
        email: 'newuser@example.com',
        user_metadata: { name: 'New User', role: 'user' },
      },
    },
  },
  error: null,
});

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  })),
}));

describe('LoginScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ currentUser: null });
  });

  it('renders login screen with direct sign in and SSO options', () => {
    render(<LoginScreen />);

    expect(screen.getByText(/Continua/i)).toBeTruthy();
    expect(screen.getByPlaceholderText('you@email.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your password')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeTruthy();
    expect(screen.getByText(/Continue with Google/i)).toBeTruthy();
    expect(screen.getByText(/Continue with GitHub/i)).toBeTruthy();

    // Verify beta invite restrictions and waitlist links are NOT present
    expect(screen.queryByPlaceholderText(/invite code/i)).toBeNull();
    expect(screen.queryByText(/Request access/i)).toBeNull();
  });

  it('switches to open signup mode without requiring invite code', () => {
    render(<LoginScreen />);

    const modeSwitchBtn = screen.getByText(/Don't have an account\? Sign up/i);
    fireEvent.click(modeSwitchBtn);

    // Verify signup inputs
    expect(screen.getByPlaceholderText('Your name')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@email.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('Min 6 characters')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeTruthy();

    // Verify invite code is NOT requested in signup mode
    expect(screen.queryByPlaceholderText(/invite code/i)).toBeNull();
    expect(screen.queryByText(/Invite Code/i)).toBeNull();
  });

  it('allows open signup without invite validation', async () => {
    render(<LoginScreen />);

    // Switch to signup
    fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));

    // Fill in signup form
    fireEvent.change(screen.getByPlaceholderText('Your name'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@email.com'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Min 6 characters'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Jane Doe',
            role: 'user',
          },
        },
      });
      expect(useAuthStore.getState().currentUser?.email).toBe('newuser@example.com');
    });
  });

  it('allows direct sign in with credentials', async () => {
    render(<LoginScreen />);

    fireEvent.change(screen.getByPlaceholderText('you@email.com'), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your password'), {
      target: { value: 'supersecret' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'supersecret',
      });
      expect(useAuthStore.getState().currentUser?.id).toBe('user-123');
    });
  });
});
