import { AuthProvider, AuthUser, AuthSession } from './auth-provider';
import { Pool } from 'pg';

/**
 * Custom PostgreSQL Auth Provider
 * 
 * For self-hosted deployments using PostgreSQL with unique ID authentication.
 * No password required - users login with their unique ID.
 */
export class CustomAuthProvider implements AuthProvider {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    // In a real app, this would check the session cookie
    // For now, returns null - os-context handles the session check
    return null;
  }

  async login(credentials: { uniqueId: string }): Promise<AuthSession> {
    const { uniqueId } = credentials;

    const result = await this.pool.query(
      'SELECT id, unique_id, role FROM users WHERE unique_id = $1',
      [uniqueId]
    );

    if (result.rows.length === 0) {
      // Create new user with this unique ID
      const newUser = await this.pool.query(
        'INSERT INTO users (unique_id, role) VALUES ($1, $2) RETURNING id, unique_id, role',
        [uniqueId, 'user']
      );
      const user = newUser.rows[0];
      return {
        user: {
          id: user.id,
          name: user.unique_id,
          role: user.role,
        },
      };
    }

    const user = result.rows[0];
    return {
      user: {
        id: user.id,
        name: user.unique_id,
        role: user.role,
      },
    };
  }

  async logout(): Promise<void> {
    // Session invalidation handled by API endpoint
  }

  async isSessionValid(): Promise<boolean> {
    // Checked via /api/auth/session endpoint
    return true;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    // Polling-based check via API
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          callback(data.user);
        } else {
          callback(null);
        }
      } catch {
        callback(null);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }
}
