/**
 * Context Protocol — Pull
 *
 * GET /api/context/pull?domains=theme,browser&sinceVersion=5
 * Pull context for one or more domains.
 */

import { NextRequest } from 'next/server';
import { apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { getContextRepository } from '@/lib/context-kernel';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const domainsParam = searchParams.get('domains');
    const sinceVersion = searchParams.get('sinceVersion');

    const domains = domainsParam ? domainsParam.split(',').filter(Boolean) : undefined;
    const since = sinceVersion ? parseInt(sinceVersion, 10) : undefined;

    const repo = getContextRepository();
    const result = await repo.pull(auth.userId, {
      domains,
      sinceVersion: since,
    });

    return apiOk(result);
  } catch (error) {
    console.error('[context/pull] Error:', error);
    return apiInternal();
  }
}
