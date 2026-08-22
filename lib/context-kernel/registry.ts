import type { ContextRepository } from './repository';
import { SupabaseContextRepository } from './supabase-driver';
import { MemoryContextRepository } from './memory-driver';

export type ContextDriverType = 'supabase' | 'memory';

let instance: ContextRepository | null = null;
let currentDriverType: ContextDriverType = 'supabase';

/**
 * Creates a driver instance by type.
 */
export function createContextDriver(type: ContextDriverType = 'supabase'): ContextRepository {
  switch (type) {
    case 'memory':
      return new MemoryContextRepository();
    case 'supabase':
    default:
      return new SupabaseContextRepository();
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
  currentDriverType = 'supabase';
}
