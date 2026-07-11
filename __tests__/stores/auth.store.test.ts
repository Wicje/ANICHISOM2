import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/lib/stores/auth.store';

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      currentUser: null,
    });
  });

  it('starts with no user', () => {
    expect(useAuthStore.getState().currentUser).toBeNull();
  });

  it('setCurrentUser sets the user', () => {
    useAuthStore.getState().setCurrentUser({
      id: '1',
      name: 'testuser',
      role: 'admin',
    });
    expect(useAuthStore.getState().currentUser).toEqual({
      id: '1',
      name: 'testuser',
      role: 'admin',
    });
  });

  it('setCurrentUser with null clears user', () => {
    useAuthStore.getState().setCurrentUser({
      id: '1',
      name: 'testuser',
      role: 'user',
    });
    useAuthStore.getState().setCurrentUser(null);
    expect(useAuthStore.getState().currentUser).toBeNull();
  });
});
