/**
 * Storage Download — proxies file downloads from cloud storage
 *
 * GET /api/storage/download/[provider]/[fileId]
 *
 * Fetches file content from cloud storage and streams it to the client.
 * This avoids CORS issues and keeps OAuth tokens server-side (privacy-first).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requireSession,
  apiNotFound,
  apiForbidden,
  apiInternal,
} from '@/lib/api-helpers';
import { getStorageConnector } from '@/lib/storage-connectors/connector-registry';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string; fileId: string }> },
) {
  try {
    const { provider, fileId } = await params;

    const authResult = requireSession(request);
    if (!authResult.ok) return authResult.response;

    const sessionData = authResult.session;

    // Get connector
    let connector;
    try {
      connector = getStorageConnector(provider);
    } catch {
      return apiNotFound(`Unknown provider: ${provider}`);
    }

    if (!(await connector.isConnected(sessionData.userId))) {
      return apiForbidden(`Provider "${provider}" not connected.`);
    }

    // Read file content from cloud storage
    const content = await connector.readFile(sessionData.userId, fileId);

    // Determine content type
    const contentType = content.mimeType || 'application/octet-stream';

    // Return file content as response
    return new NextResponse(content.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${content.name}"`,
        'Content-Length': String(content.size),
        'Cache-Control': 'private, max-age=3600',
        'X-Provider': provider,
        'X-File-Id': fileId,
      },
    });
  } catch (error) {
    console.error('[storage/download] Error:', error);
    return apiInternal('Download failed');
  }
}
