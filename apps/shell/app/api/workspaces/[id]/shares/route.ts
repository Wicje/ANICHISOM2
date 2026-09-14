/**
 * Workspace Shares API — GET /api/workspaces/[id]/shares
 *
 * Returns all shares for a workspace owned by or shared with the current user.
 */

import { NextRequest } from 'next/server';
import { checkRouteRateLimit, apiOk, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';
import { authorize, PERSONAL_DEFAULT_SCOPES } from '@/lib/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRouteRateLimit(request, 'WORKSPACE_LIST');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const decision = authorize(
      { userId: session.userId, ws: 'Continua OS', scopes: PERSONAL_DEFAULT_SCOPES },
      'context.read',
      { type: 'context', owner: session.userId }
    );
    if (!decision.ok) return apiInternal('Forbidden');

    const { id } = await params;
    const workspaceDomain = `workspace_snapshot_${id}`;

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

    // Get shares where user is the owner OR the recipient
    const { data, error } = await supabase
      .from('workspace_shares')
      .select('id, workspace_id, shared_by, shared_with, permission, created_at')
      .eq('workspace_id', workspaceDomain)
      .or(`shared_by.eq.${session.userId},shared_with.eq.${session.userId}`);

    if (error) {
      console.error('[workspace/shares] Error:', error);
      return apiInternal('Failed to load shares');
    }

    return apiOk(data || []);
  } catch (error) {
    console.error('[workspace/shares] Unexpected error:', error);
    return apiInternal();
  }
}
