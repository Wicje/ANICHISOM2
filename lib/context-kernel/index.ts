/**
 * Context Kernel — Barrel Export
 *
 * Import everything from '@/lib/context-kernel' to access the protocol.
 */

export * from './types';
export * from './repository';
export * from './conflict';
export { SupabaseContextRepository } from './supabase-driver';

/**
 * Get the context repository instance.
 * Currently returns Supabase driver. Swap this to change backends.
 *
 * In the future, this could be:
 * - DirectPostgresRepository
 * - SelfHostedSupabaseRepository
 * - RustBackendRepository
 * - etc.
 */
export { getContextRepository } from './registry';
