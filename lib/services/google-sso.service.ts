/**
 * Google SSO Service — OAuth2 authentication with Google.
 *
 * Non-React service layer. Manages OAuth flow, token exchange,
 * token refresh, and user profile retrieval.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface SSOConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

// ─── Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'anichisom-google-sso';

function loadStorage(): SSOConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStorage(config: SSOConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function clearStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Google SSO Service ────────────────────────────────────────────────

export const GoogleSSOService = {
  /**
   * Store Google OAuth config (client ID, redirect URI, scopes).
   */
  init(config: SSOConfig): void {
    saveStorage(config);
  },

  /**
   * Generate Google OAuth2 authorization URL.
   */
  getAuthUrl(): string {
    const config = loadStorage();
    if (!config) {
      throw new Error('Google SSO not initialized. Call init() first.');
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /**
   * Exchange authorization code for tokens via POST to Google's token endpoint.
   */
  async exchangeCode(code: string): Promise<GoogleUser> {
    const config = loadStorage();
    if (!config) {
      throw new Error('Google SSO not initialized. Call init() first.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_description || 'Token exchange failed');
    }

    const tokens = await response.json();
    const userInfo = await this.getUserInfo(tokens.access_token);

    return {
      ...userInfo,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    };
  },

  /**
   * Refresh expired access token.
   */
  async refreshToken(refreshToken: string): Promise<GoogleUser> {
    const config = loadStorage();
    if (!config) {
      throw new Error('Google SSO not initialized. Call init() first.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.clientId,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_description || 'Token refresh failed');
    }

    const tokens = await response.json();
    const userInfo = await this.getUserInfo(tokens.access_token);

    return {
      ...userInfo,
      accessToken: tokens.access_token,
      refreshToken,
      expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    };
  },

  /**
   * Fetch user profile from Google's userinfo endpoint.
   */
  async getUserInfo(accessToken: string): Promise<Omit<GoogleUser, 'accessToken' | 'refreshToken' | 'expiresAt'>> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  },

  /**
   * Check if a user's token is expired.
   */
  isExpired(user: GoogleUser): boolean {
    return Date.now() >= user.expiresAt;
  },

  /**
   * Clear stored tokens / config.
   */
  logout(): void {
    clearStorage();
  },
};
