/**
 * Workspace Persistence API — save, list, get, delete workspace snapshots.
 *
 * Uses the existing context_records table with domain = workspace_snapshot_{id}.
 */

import { NextRequest } from 'next/server';
import { checkRouteRateLimit, apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';

// POST /api/workspaces/save — save a workspace snapshot
export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'WORKSPACE_SAVE');
    if (rl) return rl;

    const session = await requireSession(request);
    if (!session.ok) return session.response;

    const body = await request.json();
    const { workspace } = body;

    if (!workspace || !workspace.id || !workspace.name) {
      return apiError('Invalid workspace: id and name required');
    }

    // Limit workspace payload to 512KB
    const payloadSize = JSON.stringify(workspace).length;
    if (payloadSize > 512 * 1024) {
      return apiError('Workspace data too large (max 512KB)');
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

    const domain = `workspace_snapshot_${workspace.id}`;

    // Upsert to context_records
    const { error } = await supabase
      .from('context_records')
      .upsert({
        user_id: session.userId,
        domain,
        data: workspace,
        version: (workspace.syncedAt || Date.now()).toString(),
        schema_version: '1.0',
        deleted: false,
      }, {
        onConflict: 'user_id,domain',
      });

    if (error) {
      console.error('[workspace/save] Supabase error:', error);
      return apiInternal('Failed to save workspace');
    }

    return apiOk({ saved: true, domain });
  } catch (error) {
    console.error('[workspace/save] Unexpected error:', error);
    return apiInternal();
  }
}
