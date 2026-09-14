/**
 * Workspace Protocol — Events
 *
 * GET /api/workspaces/events?workspaceId=xxx
 * GET /api/workspaces/events?workspaceId=xxx&entityId=xxx
 */
import { NextRequest } from 'next/server';
import { apiOk, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerAdapter } from '@/lib/supabase-adapter';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { eventAdapter } = createServerAdapter(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const entityId = searchParams.get('entityId');

    if (!workspaceId) return apiOk([]);

    const events = entityId
      ? await eventAdapter.getByEntity(workspaceId, entityId)
      : await eventAdapter.getByWorkspace(workspaceId);

    return apiOk(events);
  } catch (error) {
    console.error('[workspaces/events] Error:', error);
    return apiInternal();
  }
}
