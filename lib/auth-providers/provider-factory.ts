/**
 * Auth Provider Factory — Lazy Dynamic Imports
 *
 * Only the selected provider is imported at runtime. This prevents
 * Supabase and pg from being bundled when only one is needed.
 *
 * Usage:
 *   const provider = await getAuthProvider();
 */

import type { AuthProvider } from './auth-provider';

let cachedProvider: AuthProvider | null = null;

export async function getAuthProvider(): Promise<AuthProvider> {
  if (cachedProvider) return cachedProvider;

  const providerName = (process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'custom').toLowerCase();

  switch (providerName) {
    case 'supabase': {
      const { SupabaseAuthProvider } = await import('./supabase-provider');
      cachedProvider = new SupabaseAuthProvider();
      break;
    }
    case 'custom': {
      const { CustomAuthProvider } = await import('./custom-provider');
      cachedProvider = new CustomAuthProvider();
      break;
    }
    default:
      throw new Error(
        `Unknown auth provider: ${providerName}. ` +
        'Supported providers: custom, supabase'
      );
  }

  return cachedProvider;
}

export function clearProviderCache(): void {
  cachedProvider = null;
}

export function getAuthProviderName(): string {
  return process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'custom';
}
