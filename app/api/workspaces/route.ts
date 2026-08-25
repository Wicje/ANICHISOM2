/**
 * Workspace List API — GET /api/workspaces
 *
 * Returns all workspace snapshots for the current user.
 */

import { NextRequest } from 'next/server';
import { checkRouteRateLimit, apiOk, apiUnauthorized, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'WORKSPACE_LIST');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

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

    const { data, error } = await supabase
      .from('context_records')
      .select('domain, data, version, updated_at')
      .eq('user_id', session.userId)
      .like('domain', 'workspace_snapshot_%')
      .eq('deleted', false)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[workspace/list] Supabase error:', error);
      return apiInternal('Failed to list workspaces');
    }

    const workspaces = (data || []).map(row => {
      const ws = row.data;
      if (typeof ws === 'object' && ws !== null) {
        return { ...ws, syncedAt: row.updated_at ? new Date(row.updated_at).getTime() : ws.syncedAt };
      }
      return ws;
    });

    return apiOk(workspaces);
  } catch (error) {
    console.error('[workspace/list] Unexpected error:', error);
    return apiInternal();
  }
}
