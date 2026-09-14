/**
 * Storage Disconnect — removes a user's connected cloud storage provider
 *
 * DELETE /api/storage/disconnect/[provider]
 */

import { NextRequest } from 'next/server';
import {
  requireSession,
  apiOk,
  apiNotFound,
  apiInternal,
} from '@/lib/api-helpers';
import { getStorageConnector } from '@/lib/storage-connectors/connector-registry';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;

    const authResult = await requireSession(request);
    if (!authResult.ok) return authResult.response;

    const userId = authResult.userId;

    let connector;
    try {
      connector = getStorageConnector(provider);
    } catch {
      return apiNotFound(`Unknown provider: ${provider}`);
    }

    await connector.disconnect(userId);

    return apiOk({ disconnected: provider });
  } catch (error) {
    console.error('[storage/disconnect] Error:', error);
    return apiInternal();
  }
}
