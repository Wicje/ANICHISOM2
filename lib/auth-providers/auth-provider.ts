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
