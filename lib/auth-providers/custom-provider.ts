import type { AuthProvider, AuthUser, AuthSession } from './auth-provider';

/**
 * Custom PostgreSQL Auth Provider — Lazy Pool
 *
 * The `pg` Pool is only created on first query, not at import time.
 * This avoids crashing the client bundle if pg is accidentally imported.
 */
export class CustomAuthProvider implements AuthProvider {
  private _pool: any = null;

  private async getPool() {
    if (this._pool) return this._pool;
    const { Pool } = await import('pg');
    this._pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });
    return this._pool;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return null;
  }

  async login(credentials: { uniqueId: string }): Promise<AuthSession> {
    const pool = await this.getPool();
    const { uniqueId } = credentials;

    const result = await pool.query(
      'SELECT id, unique_id, role FROM users WHERE unique_id = $1',
      [uniqueId]
    );

    if (result.rows.length === 0) {
      const newUser = await pool.query(
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
    return true;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
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
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }
}
