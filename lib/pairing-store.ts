/**
 * Ephemeral Pairing Session Store — server-side.
 *
 * Backed by Supabase (`pairing_sessions` table) in production so sessions
 * survive restarts and work across serverless instances. Falls back to an
 * in-memory map only when admin credentials are not configured (local dev).
 *
 * All access goes through API routes; never import this from client code.
 */
import { createAdminClient, isSupabaseAdminConfigured } from '@/utils/supabase/admin';

export const PAIRING_TTL_MS = 5 * 60 * 1000; // pairing window per PIN

export type PairingStatus = 'waiting' | 'approved';

export interface PairingRecord {
  pin: string;
  status: PairingStatus;
  workspace?: string | null;
  clientInfo?: string | null;
  userId?: string | null;
  capabilityToken?: string | null;
  capabilityTokenHash?: string | null;
  createdAt: string;
  expiresAt: string;
  approvedAt?: string | null;
}

const PIN_PATTERN = /^[A-Z2-9]{6}$/;

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && PIN_PATTERN.test(pin);
}

// ─── In-memory fallback (dev only) ───────────────────────────────────────

const memorySessions = new Map<string, PairingRecord>();

function memoryGet(pin: string): PairingRecord | null {
  const s = memorySessions.get(pin);
  if (!s) return null;
  if (Date.now() > new Date(s.expiresAt).getTime()) {
    memorySessions.delete(pin);
    return null;
  }
  return s;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Return the session for `pin`, creating a fresh waiting one when absent.
 * Returns null only when `pin` is malformed or creation failed.
 */
export async function getOrCreateSession(pin: string): Promise<PairingRecord | null> {
  if (!isValidPin(pin)) return null;

  if (!isSupabaseAdminConfigured()) {
    let s = memoryGet(pin);
    if (!s) {
      s = {
        pin,
        status: 'waiting',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + PAIRING_TTL_MS).toISOString(),
      };
      memorySessions.set(pin, s);
    }
    return s;
  }

  const supabase = createAdminClient();

  // Lazy purge of expired rows (cheap, indexed; keeps table tiny without pg_cron)
  void supabase
    .from('pairing_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .then(() => {}, () => {});

  const { data } = await supabase
    .from('pairing_sessions')
    .select('*')
    .eq('pin', pin)
    .maybeSingle();

  if (data) {
    if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
    return rowToRecord(data as PairingRow);
  }

  const insert = {
    pin,
    status: 'waiting' as const,
    expires_at: new Date(Date.now() + PAIRING_TTL_MS).toISOString(),
  };
  const { data: created, error } = await supabase
    .from('pairing_sessions')
    .insert(insert)
    .select('*')
    .single();

  if (error || !created) return null;
  return rowToRecord(created as PairingRow);
}

/** Mark a waiting session approved. Returns the updated record or null. */
export async function approveSession(
  pin: string,
  approval: {
    workspace?: string;
    clientInfo?: string;
    userId?: string;
    capabilityToken?: string;
    capabilityTokenHash?: string;
  }
): Promise<PairingRecord | null> {
  if (!isValidPin(pin)) return null;

  const now = new Date();
  const values = {
    status: 'approved' as const,
    workspace: approval.workspace ?? null,
    client_info: approval.clientInfo ?? null,
    user_id: approval.userId ?? null,
    capability_token: approval.capabilityToken ?? null,
    capability_token_hash: approval.capabilityTokenHash ?? null,
    approved_at: now.toISOString(),
  };

  if (!isSupabaseAdminConfigured()) {
    const existing = memoryGet(pin);
    if (!existing || existing.status === 'approved') return null;
    const updated: PairingRecord = {
      ...existing,
      status: 'approved',
      workspace: values.workspace,
      clientInfo: values.client_info,
      userId: values.user_id,
      capabilityToken: values.capability_token,
      capabilityTokenHash: values.capability_token_hash,
      approvedAt: values.approved_at,
    };
    memorySessions.set(pin, updated);
    return updated;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('pairing_sessions')
    .update(values)
    .eq('pin', pin)
    .eq('status', 'waiting')
    .gt('expires_at', now.toISOString())
    .select('*')
    .maybeSingle();

  return data ? rowToRecord(data as PairingRow) : null;
}

/** Fetch without side effects (used to re-check final status). */
export async function peekSession(pin: string): Promise<PairingRecord | null> {
  if (!isValidPin(pin)) return null;
  if (!isSupabaseAdminConfigured()) return memoryGet(pin);

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('pairing_sessions')
    .select('*')
    .eq('pin', pin)
    .maybeSingle();
  if (!data) return null;
  if (new Date((data as PairingRow).expires_at).getTime() < Date.now()) return null;
  return rowToRecord(data as PairingRow);
}

// ─── Row mapping ─────────────────────────────────────────────────────────

interface PairingRow {
  pin: string;
  status: PairingStatus;
  workspace: string | null;
  client_info: string | null;
  user_id: string | null;
  capability_token: string | null;
  capability_token_hash: string | null;
  created_at: string;
  expires_at: string;
  approved_at: string | null;
}

function rowToRecord(row: PairingRow): PairingRecord {
  return {
    pin: row.pin,
    status: row.status,
    workspace: row.workspace,
    clientInfo: row.client_info,
    userId: row.user_id,
    capabilityToken: row.capability_token,
    capabilityTokenHash: row.capability_token_hash,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    approvedAt: row.approved_at,
  };
}
