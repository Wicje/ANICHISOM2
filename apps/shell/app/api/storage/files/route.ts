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
import { getStorageConnector, getConnectedConnectors, getConfiguredConnectors, getRegisteredConnectors } from '@/lib/storage-connectors/connector-registry';
import { TokenStore } from '@/lib/storage-connectors/token-store';

export async function GET(request: NextRequest) {
  try {
    const providerId = request.nextUrl.searchParams.get('provider');
    const path = request.nextUrl.searchParams.get('path') || 'root';
    const pageToken = request.nextUrl.searchParams.get('pageToken') || undefined;

    let userId = 'guest';
    
    // If no specific provider, return status of all registered connectors without auth
    if (!providerId) {
      const registeredIds = getRegisteredConnectors();
      const connected = getConnectedConnectors(userId);

      const connectors = registeredIds.map(id => {
        const c = getStorageConnector(id);
        return {
          id: c.id,
          name: c.name,
          icon: c.icon,
          configured: c.isConfigured(),
          connected: connected.some(cc => cc.id === c.id),
          accountName: TokenStore.getAccountName(userId, c.id),
          capabilities: c.getCapabilities(),
        };
      });

      return apiOk({ connectors });
    }

    // List files from specific provider
    const authResult = await requireAuth(request, 'STORAGE');
    if (!authResult.ok) return authResult.response;
    userId = authResult.userId;

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
