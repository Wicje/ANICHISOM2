/**
 * Context Kernel — Barrel Export
 *
 * Import everything from '@/lib/context-kernel' to access the protocol.
 */

export * from './types';
export * from './repository';
export * from './conflict';
export * from './vector-clock';
export * from './delta-sync';
export * from './graph';
export { MemoryContextRepository } from './memory-driver';
export { getContextRepository, setContextRepository, resetContextRepository, createContextDriver } from './registry';
export type { ContextDriverType } from './registry';
