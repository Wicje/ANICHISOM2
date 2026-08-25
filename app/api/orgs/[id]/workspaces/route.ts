/**
 * Org Workspaces API — GET /api/orgs/[id]/workspaces
 *
 * Returns all workspaces shared within an organization.
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

    const { id: orgId } = await params;

    const decision = authorize(
      { userId: session.userId, ws: 'Continua OS', scopes: PERSONAL_DEFAULT_SCOPES },
      'org.read',
      { type: 'org', orgId }
    );
    if (!decision.ok) return apiInternal('Forbidden');

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

    // Get workspace shares for this org
    const { data: shares, error: sharesError } = await supabase
      .from('workspace_shares')
      .select('workspace_id, shared_by, permission, created_at')
      .eq('org_id', orgId);

    if (sharesError) {
      console.error('[org/workspaces] Shares error:', sharesError);
      return apiInternal('Failed to load org workspaces');
    }

    if (!shares || shares.length === 0) {
      return apiOk([]);
    }

    // Fetch the actual workspace data for each shared workspace
    const workspaceIds = [...new Set(shares.map(s => s.workspace_id))];
    const { data: workspaces, error: wsError } = await supabase
      .from('context_records')
      .select('domain, data, updated_at')
      .in('domain', workspaceIds)
      .eq('deleted', false);

    if (wsError) {
      console.error('[org/workspaces] Workspace fetch error:', wsError);
      return apiInternal('Failed to load workspace data');
    }

    // Merge share info with workspace data
    const result = (workspaces || []).map(ws => {
      const shareInfo = shares.find(s => s.workspace_id === ws.domain);
      return {
        ...ws.data,
        sharedBy: shareInfo?.shared_by,
        permission: shareInfo?.permission,
        sharedAt: shareInfo?.created_at,
        syncedAt: ws.updated_at ? new Date(ws.updated_at).getTime() : undefined,
      };
    });

    return apiOk(result);
  } catch (error) {
    console.error('[org/workspaces] Unexpected error:', error);
    return apiInternal();
  }
}
