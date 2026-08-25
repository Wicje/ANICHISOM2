/**
 * Context Protocol — Stats
 *
 * GET /api/context/stats
 * Get storage stats for the current user.
 */

import { apiOk, apiInternal, requireSession } from '@/lib/api-helpers';
import { getContextRepository } from '@/lib/context-kernel';
import { authorize, PERSONAL_DEFAULT_SCOPES } from '@/lib/authz';

export async function GET(request: Request) {
  try {
    const auth = await requireSession(request as any);
    if (!auth.ok) return auth.response;

    const decision = authorize(
      { userId: auth.userId, ws: 'Continua OS', scopes: PERSONAL_DEFAULT_SCOPES },
      'context.read',
      { type: 'context', owner: auth.userId }
    );
    if (!decision.ok) return apiInternal('Forbidden');

    const repo = getContextRepository();
    const stats = await repo.getStats(auth.userId);

    return apiOk(stats);
  } catch (error) {
    console.error('[context/stats] Error:', error);
    return apiInternal();
  }
}
