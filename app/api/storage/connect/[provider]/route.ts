/**
 * Storage Connect — initiates OAuth2 connection for a storage provider
 *
 * GET /api/storage/connect/[provider]
 *
 * Returns the OAuth authorization URL for the user to visit.
 * After authorization, Google/Dropbox redirects to /api/storage/callback/[provider].
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/session-store';
import { getStorageConnector } from '@/lib/storage-connectors/connector-registry';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;

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
      return NextResponse.json({ error: `Unknown storage provider: ${provider}` }, { status: 404 });
    }

    if (!connector.isConfigured()) {
      return NextResponse.json({ error: `Provider "${provider}" is not configured on this server. Check environment variables.` }, { status: 503 });
    }

    // Generate redirect URL for callback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/api/storage/callback/${provider}`;

    // Generate OAuth authorization URL
    const connectResult = await connector.connect(sessionData.userId, redirectUrl);

    return NextResponse.json({
      authUrl: connectResult.authUrl,
      state: connectResult.state,
      provider,
    });
  } catch (error) {
    console.error('[storage/connect] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
