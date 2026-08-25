/**
 * Workspace Delete API — DELETE /api/workspaces/[id]
 */

import { NextRequest } from 'next/server';
import { checkRouteRateLimit, apiOk, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';
import { authorize, PERSONAL_DEFAULT_SCOPES } from '@/lib/authz';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRouteRateLimit(request, 'WORKSPACE_DELETE');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const decision = authorize(
      { userId: session.userId, ws: 'Continua OS', scopes: PERSONAL_DEFAULT_SCOPES },
      'context.write',
      { type: 'context', owner: session.userId }
    );
    if (!decision.ok) return apiInternal('Forbidden');

    const { id } = await params;

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

    const domain = `workspace_snapshot_${id}`;

    const { error } = await supabase
      .from('context_records')
      .update({ deleted: true })
      .eq('user_id', session.userId)
      .eq('domain', domain);

    if (error) {
      console.error('[workspace/delete] Error:', error);
      return apiInternal('Failed to delete workspace');
    }

    return apiOk({ deleted: true });
  } catch (error) {
    console.error('[workspace/delete] Unexpected error:', error);
    return apiInternal();
  }
}
