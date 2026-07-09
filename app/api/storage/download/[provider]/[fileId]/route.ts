/**
 * Storage Download — proxies file downloads from cloud storage
 *
 * GET /api/storage/download/[provider]/[fileId]
 *
 * Fetches file content from cloud storage and streams it to the client.
 * This avoids CORS issues and keeps OAuth tokens server-side (privacy-first).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/session-store';
import { getStorageConnector } from '@/lib/storage-connectors/connector-registry';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string; fileId: string }> },
) {
  try {
    const { provider, fileId } = await params;

    // Auth check
    const sessionCookie = request.cookies.get('anichisom_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sessionData = resolveSession(sessionCookie.value);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Get connector
    let connector;
    try {
      connector = getStorageConnector(provider);
    } catch {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 404 });
    }

    if (!(await connector.isConnected(sessionData.userId))) {
      return NextResponse.json({ error: `Provider "${provider}" not connected.` }, { status: 403 });
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
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
