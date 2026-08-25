/**
 * Workspace Unshare API — POST /api/workspaces/[id]/unshare
 *
 * Removes a workspace share created by the current user.
 */

import { NextRequest } from 'next/server';
import { checkRouteRateLimit, apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';

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

    const body = await request.json();
    const { shareId } = body as { shareId?: string };

    if (!shareId || typeof shareId !== 'string') {
      return apiError('shareId is required');
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

    const { error } = await supabase
      .from('workspace_shares')
      .delete()
      .eq('id', shareId)
      .eq('shared_by', session.userId);

    if (error) {
      console.error('[workspace/unshare] Supabase error:', error);
      return apiInternal('Failed to unshare workspace');
    }

    return apiOk({ removed: true });
  } catch (error) {
    console.error('[workspace/unshare] Unexpected error:', error);
    return apiInternal();
  }
}
