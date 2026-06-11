import { AuthProvider } from './auth-provider';
import { CustomAuthProvider } from './custom-provider';
import { FirebaseAuthProvider } from './firebase-provider';
import { SupabaseAuthProvider } from './supabase-provider';

/**
 * Auth Provider Factory
 * 
 * Instantiates the correct auth provider based on AUTH_PROVIDER environment variable.
 * Supports: custom, firebase, supabase
 * 
 * Usage:
 *   const provider = getAuthProvider();
 *   const user = await provider.getCurrentUser();
 */

let cachedProvider: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  // Return cached instance
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerName = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'custom';

  switch (providerName.toLowerCase()) {
    case 'firebase':
      cachedProvider = new FirebaseAuthProvider();
      break;

    case 'supabase':
      cachedProvider = new SupabaseAuthProvider();
      break;

    case 'custom':
      cachedProvider = new CustomAuthProvider();
      break;

    default:
      throw new Error(
        `Unknown auth provider: ${providerName}. ` +
        'Supported providers: custom, firebase, supabase'
      );
  }

  return cachedProvider;
}

/**
 * Clear the cached provider (useful for testing)
 */
export function clearProviderCache(): void {
  cachedProvider = null;
}

/**
 * Get the name of the current auth provider
 */
export function getAuthProviderName(): string {
  return process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'custom';
}
