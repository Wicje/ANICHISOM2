/**
 * Workspace Protocol — Sync
 *
 * POST /api/workspaces/sync
 * Syncs desktop state to server for cross-device access.
 */
import { NextRequest } from 'next/server';
import { apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { SupabaseContextRepository } from '@/lib/context-kernel/supabase-driver';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { desktopState, workspaceId, deviceId } = body;

    if (!desktopState || typeof desktopState !== 'object') {
      return apiError('desktopState is required');
    }

    // Sanitize client-supplied window objects (Issue 58)
    const sanitizedWindows = Array.isArray(desktopState.windows)
      ? desktopState.windows.map((win: any) => {
          const { id, appId, title, position, size, isMinimized, isMaximized } = win;
          // Strip sensitive auth tokens, passwords, or raw secrets from win.data
          const safeData = win.data ? { ...win.data } : {};
          delete safeData.password;
          delete safeData.secret;
          delete safeData.authToken;
          delete safeData.apiKey;
          return { id, appId, title, position, size, isMinimized, isMaximized, data: safeData };
        })
      : [];

    // Save sanitized windows state to Context Repository (Issue 73)
    const repo = new SupabaseContextRepository();
    await repo.save({
      userId: auth.userId,
      domain: `workspace:${workspaceId || 'default'}`,
      data: { windows: sanitizedWindows, updatedAt: new Date().toISOString() },
      version: typeof body.version === 'number' ? body.version : 1,
      deviceId: deviceId || 'web-client',
    });

    return apiOk({
      synced: true,
      userId: auth.userId,
      workspaceId: workspaceId || 'default',
      itemCount: sanitizedWindows.length,
    });
  } catch (error) {
    console.error('[workspaces/sync] Error:', error);
    return apiInternal();
  }
}
