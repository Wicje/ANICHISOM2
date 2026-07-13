/**
 * Tests for Google SSO Service — OAuth flow, token management, user info.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleSSOService } from '@/lib/services/google-sso.service';

// Mock localStorage
const localStorageMock: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => localStorageMock[key] || null),
  setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val; }),
  removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }),
});

const TEST_CONFIG = {
  clientId: 'test-client-id.apps.googleusercontent.com',
  redirectUri: 'http://localhost:3000/auth/callback',
  scopes: ['openid', 'email', 'profile'],
};

beforeEach(() => {
  Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]);
  vi.restoreAllMocks();
});

describe('GoogleSSOService', () => {
  describe('init', () => {
    it('should store config in localStorage', () => {
      GoogleSSOService.init(TEST_CONFIG);
      expect(localStorageMock['anichisom-google-sso']).toBeDefined();
      const stored = JSON.parse(localStorageMock['anichisom-google-sso']!);
      expect(stored.clientId).toBe(TEST_CONFIG.clientId);
      expect(stored.redirectUri).toBe(TEST_CONFIG.redirectUri);
    });

    it('should store scopes in config', () => {
      GoogleSSOService.init(TEST_CONFIG);
      const stored = JSON.parse(localStorageMock['anichisom-google-sso']!);
      expect(stored.scopes).toEqual(TEST_CONFIG.scopes);
    });
  });

  describe('getAuthUrl', () => {
    it('should generate URL with correct base', () => {
      GoogleSSOService.init(TEST_CONFIG);
      const url = GoogleSSOService.getAuthUrl();
      expect(url).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
    });

    it('should include all required query params', () => {
      GoogleSSOService.init(TEST_CONFIG);
      const url = GoogleSSOService.getAuthUrl();
      expect(url).toContain('client_id=test-client-id.apps.googleusercontent.com');
      expect(url).toContain('redirect_uri=' + encodeURIComponent(TEST_CONFIG.redirectUri));
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
    });

    it('should throw if not initialized', () => {
      expect(() => GoogleSSOService.getAuthUrl()).toThrow('Google SSO not initialized');
    });
  });

  describe('exchangeCode', () => {
    it('should exchange code for tokens and return GoogleUser', async () => {
      GoogleSSOService.init(TEST_CONFIG);

      const mockTokenResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
      };
      const mockUserInfo = {
        id: '12345',
        email: 'test@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify(mockTokenResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockUserInfo), { status: 200 }));

      const user = await GoogleSSOService.exchangeCode('auth-code');

      expect(user.id).toBe('12345');
      expect(user.email).toBe('test@gmail.com');
      expect(user.accessToken).toBe('mock-access-token');
      expect(user.refreshToken).toBe('mock-refresh-token');
      expect(user.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should throw on token exchange failure', async () => {
      GoogleSSOService.init(TEST_CONFIG);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }),
      );

      await expect(GoogleSSOService.exchangeCode('bad-code')).rejects.toThrow('Token exchange failed');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token and return updated GoogleUser', async () => {
      GoogleSSOService.init(TEST_CONFIG);

      const mockRefreshResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
      };
      const mockUserInfo = {
        id: '12345',
        email: 'test@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRefreshResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockUserInfo), { status: 200 }));

      const user = await GoogleSSOService.refreshToken('old-refresh-token');

      expect(user.accessToken).toBe('new-access-token');
      expect(user.refreshToken).toBe('old-refresh-token');
    });
  });

  describe('isExpired', () => {
    it('should return false for non-expired user', () => {
      const user = {
        id: '1',
        email: 'test@gmail.com',
        name: 'Test',
        picture: '',
        accessToken: 'token',
        expiresAt: Date.now() + 60000,
      };
      expect(GoogleSSOService.isExpired(user)).toBe(false);
    });

    it('should return true for expired user', () => {
      const user = {
        id: '1',
        email: 'test@gmail.com',
        name: 'Test',
        picture: '',
        accessToken: 'token',
        expiresAt: Date.now() - 1000,
      };
      expect(GoogleSSOService.isExpired(user)).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear stored config', () => {
      GoogleSSOService.init(TEST_CONFIG);
      expect(localStorageMock['anichisom-google-sso']).toBeDefined();

      GoogleSSOService.logout();
      expect(localStorageMock['anichisom-google-sso']).toBeUndefined();
    });
  });

  describe('default state', () => {
    it('should throw getAuthUrl when no config stored', () => {
      expect(() => GoogleSSOService.getAuthUrl()).toThrow();
    });
  });
});
