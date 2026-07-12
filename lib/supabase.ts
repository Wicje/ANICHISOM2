/**
 * Supabase Client Singleton
 *
 * Single entry point for all Supabase operations.
 * Replaces the Firebase client entirely.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }
  _client = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: { persistSession: false },
  });
  return _client;
}

/** Shorthand — prefer this over getSupabase() in most cases */
export const db = typeof window !== 'undefined'
  ? (() => { try { return getSupabase(); } catch { return null as any; } })()
  : null;
