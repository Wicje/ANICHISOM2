/**
 * Supabase Admin (Service Role) Client
 *
 * Server-only. Bypasses RLS — use exclusively from API routes that
 * enforce their own auth + rate limiting. Never import from client code.
 */
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Prefer the new secret key; fall back to the legacy service-role name.
const SUPABASE_ADMIN_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ADMIN_KEY);
}

let adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase admin credentials are not configured');
  }
  if (!adminClient) {
    adminClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ADMIN_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClient;
}
