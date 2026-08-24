/**
 * Context Protocol — Pull
 *
 * GET /api/context/pull?domains=theme,browser&sinceVersion=5
 * Pull context for one or more domains.
 */

import { NextRequest } from 'next/server';
import { apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { getContextRepository } from '@/lib/context-kernel';
import {
  extractTokenFromRequest,
  verifyCapabilityToken,
} from '@/lib/capability-token';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    let userId: string;

    if (auth.ok) {
      userId = auth.userId;
    } else {
      // Ephemeral guest sessions authenticate with scoped capability tokens
      // minted during /connect pairing.
      const claims = await verifyCapabilityToken(extractTokenFromRequest(request));
      if (!claims) return auth.response;
      userId = claims.sub;
    }

    const { searchParams } = new URL(request.url);
    const domainsParam = searchParams.get('domains');
    const sinceVersion = searchParams.get('sinceVersion');

    const domains = domainsParam ? domainsParam.split(',').filter(Boolean) : undefined;
    const since = sinceVersion ? parseInt(sinceVersion, 10) : undefined;

    const repo = getContextRepository();
    const result = await repo.pull(userId, {
      domains,
      sinceVersion: since,
    });

    return apiOk(result);
  } catch (error) {
    console.error('[context/pull] Error:', error);
    return apiInternal();
  }
}
