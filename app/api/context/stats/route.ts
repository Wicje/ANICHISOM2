/**
 * Context Protocol — Stats
 *
 * GET /api/context/stats
 * Get storage stats for the current user.
 */

import { apiOk, apiInternal, requireSession } from '@/lib/api-helpers';
import { getContextRepository } from '@/lib/context-kernel';

export async function GET(request: Request) {
  try {
    const auth = await requireSession(request as any);
    if (!auth.ok) return auth.response;

    const repo = getContextRepository();
    const stats = await repo.getStats(auth.userId);

    return apiOk(stats);
  } catch (error) {
    console.error('[context/stats] Error:', error);
    return apiInternal();
  }
}
