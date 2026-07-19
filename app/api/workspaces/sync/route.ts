/**
 * Workspace Protocol — Sync
 *
 * POST /api/workspaces/sync
 * Syncs desktop state to server for cross-device access.
 */
import { NextRequest } from 'next/server';
import { apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { desktopState } = body;

    if (!desktopState || typeof desktopState !== 'object') {
      return apiError('desktopState is required');
    }

    // Desktop state sync is handled by Context Kernel via /api/context/save
    // This endpoint exists for backward compatibility with os-context.tsx
    return apiOk({ synced: true, userId: auth.userId });
  } catch (error) {
    console.error('[workspaces/sync] Error:', error);
    return apiInternal();
  }
}
