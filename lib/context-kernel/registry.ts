/**
 * Context Kernel — Repository Registry
 *
 * Provides the singleton repository instance.
 * Swap the driver here to change the entire backend.
 */

import type { ContextRepository } from './repository';
import { SupabaseContextRepository } from './supabase-driver';

let instance: ContextRepository | null = null;

/**
 * Get the context repository singleton.
 * Returns Supabase driver by default.
 */
export function getContextRepository(): ContextRepository {
  if (!instance) {
    instance = new SupabaseContextRepository();
  }
  return instance;
}

/**
 * Override the repository instance (for testing or driver swapping).
 */
export function setContextRepository(repo: ContextRepository): void {
  instance = repo;
}

/**
 * Reset to default (useful for testing).
 */
export function resetContextRepository(): void {
  instance = null;
}
