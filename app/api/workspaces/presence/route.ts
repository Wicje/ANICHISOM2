/**
 * Workspace Protocol — Presence
 *
 * GET /api/workspaces/presence?workspaceId=xxx
 * POST /api/workspaces/presence — Update presence
 */
import { NextRequest } from 'next/server';
import { apiOk, apiInternal, requireSession } from '@/lib/api-helpers';
import { createServerAdapter } from '@/lib/supabase-adapter';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { presenceAdapter } = createServerAdapter(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) return apiOk([]);

    const users = await presenceAdapter.getOnlineUsers(workspaceId);
    return apiOk(users);
  } catch (error) {
    console.error('[workspaces/presence] Error:', error);
    return apiInternal();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { presenceAdapter } = createServerAdapter(request);
    const body = await request.json();
    const { workspaceId, isOnline, ...presence } = body;

    if (!workspaceId) return apiOk({ updated: false });

    await presenceAdapter.update(auth.userId, workspaceId, {
      isOnline: isOnline ?? true,
      ...presence,
    });

    return apiOk({ updated: true });
  } catch (error) {
    console.error('[workspaces/presence] Error:', error);
    return apiInternal();
  }
}
