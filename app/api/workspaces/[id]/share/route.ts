/**
 * Workspace Share API — POST /api/workspaces/[id]/share
 *
 * Shares a workspace with another user by email.
 */

import { NextRequest } from 'next/server';
import { checkRouteRateLimit, apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';
import { authorize, PERSONAL_DEFAULT_SCOPES } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rl = checkRouteRateLimit(request, 'WORKSPACE_SAVE');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const decision = authorize(
      { userId: session.userId, ws: 'Continua OS', scopes: PERSONAL_DEFAULT_SCOPES },
      'context.write',
      { type: 'context', owner: session.userId }
    );
    if (!decision.ok) return apiError('Forbidden', 403);

    const body = await request.json();
    const { email, permission = 'view' } = body as { email?: string; permission?: string };

    if (!email || typeof email !== 'string') {
      return apiError('Email is required');
    }

    if (!['view', 'edit'].includes(permission)) {
      return apiError('Permission must be "view" or "edit"');
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      },
    );

    const { data: targetUser, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (lookupError || !targetUser) {
      return apiError('User not found', 404);
    }

    // Verify workspace ownership
    const domain = `workspace_snapshot_${id}`;
    const { data: ownerCheck } = await supabase
      .from('context_records')
      .select('id')
      .eq('user_id', session.userId)
      .eq('domain', domain)
      .eq('deleted', false)
      .single();

    if (!ownerCheck) {
      return apiError('Workspace not found', 404);
    }

    const { data: share, error: insertError } = await supabase
      .from('workspace_shares')
      .insert({
        workspace_id: `workspace_snapshot_${id}`,
        shared_by: session.userId,
        shared_with: targetUser.id,
        permission,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return apiError('Workspace already shared with this user', 409);
      }
      console.error('[workspace/share] Supabase error:', insertError);
      return apiInternal('Failed to share workspace');
    }

    // Audit log
    logAudit({
      userId: session.userId,
      action: 'workspace.share',
      resourceType: 'workspace',
      resourceId: id,
      details: { sharedWith: targetUser.id, email, permission },
    });

    return apiOk(share);
  } catch (error) {
    console.error('[workspace/share] Unexpected error:', error);
    return apiInternal();
  }
}
