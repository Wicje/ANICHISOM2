import { AuthProvider, AuthUser, AuthSession } from './auth-provider';

/**
 * Supabase Auth Provider
 * 
 * For users who prefer Supabase for database + authentication.
 * Supports email/password, OAuth, magic links, and other Supabase Auth methods.
 */
export class SupabaseAuthProvider implements AuthProvider {
  private supabase: any;

  constructor() {
    // Lazy-load Supabase to avoid errors if not configured
    try {
      const { createClient } = require('@supabase/supabase-js');
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
    } catch {
      console.warn('Supabase not configured. Using Supabase provider requires NEXT_PUBLIC_SUPABASE_* env vars');
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.supabase) return null;

    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) return null;

    return {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email,
      avatarUrl: user.user_metadata?.avatar_url,
    };
  }

  async login(credentials: { email: string; password: string }): Promise<AuthSession> {
    if (!this.supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;

    return {
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
        email: data.user.email,
        avatarUrl: data.user.user_metadata?.avatar_url,
      },
      token: data.session?.access_token,
      expiresAt: data.session?.expires_at ? new Date(data.session.expires_at * 1000) : undefined,
    };
  }

  async logout(): Promise<void> {
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
  }

  async isSessionValid(): Promise<boolean> {
    if (!this.supabase) return false;
    const { data: { session } } = await this.supabase.auth.getSession();
    return session !== null;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (!this.supabase) {
      return () => {};
    }

    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        if (session?.user) {
          callback({
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email,
            avatarUrl: session.user.user_metadata?.avatar_url,
          });
        } else {
          callback(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }

  async createUser(data: { email: string; password: string }): Promise<AuthUser> {
    if (!this.supabase) {
      throw new Error('Supabase not configured');
    }

    const { data: user, error } = await this.supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;

    return {
      id: user.user?.id || '',
      name: data.email.split('@')[0],
      email: data.email,
    };
  }
}
