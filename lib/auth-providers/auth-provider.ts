/**
 * Abstract Auth Provider Interface
 * 
 * All auth backends (Firebase, Supabase, Custom, etc.) implement this interface.
 * Allows os-context to work with ANY backend without knowing implementation details.
 * Users choose provider via AUTH_PROVIDER environment variable.
 */

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}

export interface AuthSession {
  user: AuthUser;
  token?: string;
  expiresAt?: Date;
}

export interface AuthProvider {
  // Get current authenticated user
  getCurrentUser(): Promise<AuthUser | null>;
  
  // Login/authenticate
  login(credentials: Record<string, any>): Promise<AuthSession>;
  
  // Logout
  logout(): Promise<void>;
  
  // Check if session is valid
  isSessionValid(): Promise<boolean>;
  
  // Subscribe to auth state changes
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  
  // Create new user
  createUser?(data: Record<string, any>): Promise<AuthUser>;
  
  // Update user
  updateUser?(userId: string, data: Record<string, any>): Promise<AuthUser>;
}

/**
 * Get the appropriate auth provider based on AUTH_PROVIDER env var
 */
export function getAuthProvider(): AuthProvider {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'custom';
  
  switch (provider.toLowerCase()) {
    case 'firebase':
      const { FirebaseAuthProvider } = require('./firebase-provider');
      return new FirebaseAuthProvider();
    
    case 'supabase':
      const { SupabaseAuthProvider } = require('./supabase-provider');
      return new SupabaseAuthProvider();
    
    case 'custom':
      const { CustomAuthProvider } = require('./custom-provider');
      return new CustomAuthProvider();
    
    default:
      throw new Error(`Unknown auth provider: ${provider}`);
  }
}
