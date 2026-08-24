import type { ContextRepository } from './repository';
import { MemoryContextRepository } from './memory-driver';
import { isSupabaseAdminConfigured } from '@/utils/supabase/admin';

export type ContextDriverType = 'supabase' | 'memory';

/**
 * Supabase requires the service-role key for server-side context writes
 * (capability-token requests carry no user cookies, so RLS would block
 * them). Without admin credentials we degrade to the in-memory driver —
 * same pattern as lib/pairing-store.ts.
 */
function resolveDefaultDriver(): ContextDriverType {
  return isSupabaseAdminConfigured() ? 'supabase' : 'memory';
}

let instance: ContextRepository | null = null;
let currentDriverType: ContextDriverType = resolveDefaultDriver();

/**
 * Creates a driver instance by type.
 */
export function createContextDriver(type: ContextDriverType = 'supabase'): ContextRepository {
  switch (type) {
    case 'memory':
      return new MemoryContextRepository();
    case 'supabase':
    default: {
      const { SupabaseContextRepository } = require('./supabase-driver');
      return new SupabaseContextRepository();
    }
  }
}

/**
 * Get the context repository singleton.
 * Returns driver configured in current environment (defaults to Supabase).
 */
export function getContextRepository(type?: ContextDriverType): ContextRepository {
  if (type && type !== currentDriverType) {
    currentDriverType = type;
    instance = createContextDriver(type);
    return instance;
  }

  if (!instance) {
    instance = createContextDriver(currentDriverType);
  }
  return instance;
}

/**
 * Override the repository instance (for testing or custom driver swapping).
 */
export function setContextRepository(repo: ContextRepository): void {
  instance = repo;
}

/**
 * Reset to default (useful for testing).
 */
export function resetContextRepository(): void {
  instance = null;
  currentDriverType = resolveDefaultDriver();
}
