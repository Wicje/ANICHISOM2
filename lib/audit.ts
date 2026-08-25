/**
 * Audit Log — Lightweight helper for logging workspace/team actions.
 *
 * Inserts into the audit_log table. Non-blocking — failures are logged
 * but never thrown (audit is observability, not enforcement).
 */
import { createAdminClient, isSupabaseAdminConfigured } from '@/utils/supabase/admin';

export type AuditAction =
  | 'workspace.share'
  | 'workspace.unshare'
  | 'workspace.delete'
  | 'workspace.restore'
  | 'workspace.create'
  | 'device.register'
  | 'device.trust_change'
  | 'device.revoke'
  | 'org.member_add'
  | 'org.member_remove'
  | 'org.member_role_change';

export interface AuditEntry {
  userId: string;
  orgId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;

  try {
    const supabase = createAdminClient();
    await supabase.from('audit_log').insert({
      user_id: entry.userId,
      org_id: entry.orgId || null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      details: entry.details || {},
      ip_address: entry.ipAddress || null,
    });
  } catch (err) {
    // Audit failures are never critical — log and move on
    console.error('[audit] Failed to log:', err);
  }
}
