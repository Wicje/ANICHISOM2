/**
 * Storage Files — lists files from connected cloud storage providers
 *
 * GET /api/storage/files?provider=...&path=...&pageToken=...
 *
 * Returns cloud files that appear in the Files app alongside local files.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  apiOk,
  apiNotFound,
  apiForbidden,
  apiInternal,
} from '@/lib/api-helpers';
import { getStorageConnector, getConnectedConnectors, getConfiguredConnectors } from '@/lib/storage-connectors/connector-registry';
import { TokenStore } from '@/lib/storage-connectors/token-store';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'STORAGE');
    if (!authResult.ok) return authResult.response;

    const userId = authResult.userId;

    const providerId = request.nextUrl.searchParams.get('provider');
    const path = request.nextUrl.searchParams.get('path') || 'root';
    const pageToken = request.nextUrl.searchParams.get('pageToken') || undefined;

    // If no specific provider, return status of all configured connectors
    if (!providerId) {
      const configured = getConfiguredConnectors();
      const connected = getConnectedConnectors(userId);

      const connectors = configured.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        configured: true,
        connected: connected.some(cc => cc.id === c.id),
        accountName: TokenStore.getAccountName(userId, c.id),
        capabilities: c.getCapabilities(),
      }));

      return apiOk({ connectors });
    }

    // List files from specific provider
    let connector;
    try {
      connector = getStorageConnector(providerId);
    } catch {
      return apiNotFound(`Unknown provider: ${providerId}`);
    }

    if (!(await connector.isConnected(userId))) {
      return apiForbidden(`Provider "${providerId}" is not connected for your account.`);
    }

    const result = await connector.listFiles(userId, path, pageToken);

    return apiOk({
      provider: providerId,
      files: result.files,
      nextPageToken: result.nextPageToken,
    });
  } catch (error) {
    console.error('[storage/files] Error:', error);
    return apiInternal();
  }
}
