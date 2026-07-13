/**
 * Supabase Client Singleton (Browser)
 *
 * Uses @supabase/ssr for proper session management.
 * Server-side usage should go through utils/supabase/server.ts instead.
 */
import { createClient } from '@/utils/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  _client = createClient();
  return _client;
}

/** Shorthand — prefer this over getSupabase() in most cases */
export const db = typeof window !== 'undefined'
  ? (() => { try { return getSupabase(); } catch { return null as any; } })()
  : null;
