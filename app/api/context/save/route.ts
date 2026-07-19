/**
 * Context Protocol — Save
 *
 * POST /api/context/save
 * Save a domain's context state.
 */

import { NextRequest } from 'next/server';
import { apiOk, apiError, apiInternal, requireSession } from '@/lib/api-helpers';
import { getContextRepository } from '@/lib/context-kernel';
import { isValidDomain } from '@/lib/context-kernel';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { domain, data, version, deviceId } = body;

    if (!domain || typeof domain !== 'string') {
      return apiError('domain is required');
    }
    if (!isValidDomain(domain)) {
      return apiError(`Invalid domain: ${domain}`);
    }
    if (version === undefined || typeof version !== 'number') {
      return apiError('version is required (number)');
    }
    if (!deviceId || typeof deviceId !== 'string') {
      return apiError('deviceId is required');
    }

    const repo = getContextRepository();
    const result = await repo.save({
      userId: auth.userId,
      domain,
      data,
      version,
      deviceId,
    });

    return apiOk(result);
  } catch (error) {
    console.error('[context/save] Error:', error);
    return apiInternal();
  }
}
