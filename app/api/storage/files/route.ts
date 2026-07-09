/**
 * Storage Files — lists files from connected cloud storage providers
 *
 * GET /api/storage/files?provider=...&path=...&pageToken=...
 *
 * Returns cloud files that appear in the Files app alongside local files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/session-store';
import { checkRateLimit } from '@/lib/auth-validation';
import { getStorageConnector, getConnectedConnectors, getConfiguredConnectors } from '@/lib/storage-connectors/connector-registry';
import { TokenStore } from '@/lib/storage-connectors/token-store';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const sessionCookie = request.cookies.get('anichisom_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sessionData = resolveSession(sessionCookie.value);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Rate limiting
    const rateCheck = checkRateLimit(`storage-files:${sessionData.userId}`, 60, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const providerId = request.nextUrl.searchParams.get('provider');
    const path = request.nextUrl.searchParams.get('path') || 'root';
    const pageToken = request.nextUrl.searchParams.get('pageToken') || undefined;

    // If no specific provider, return status of all configured connectors
    if (!providerId) {
      const configured = getConfiguredConnectors();
      const connected = getConnectedConnectors(sessionData.userId);

      const connectors = configured.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        configured: true,
        connected: connected.some(cc => cc.id === c.id),
        accountName: TokenStore.getAccountName(sessionData.userId, c.id),
        capabilities: c.getCapabilities(),
      }));

      return NextResponse.json({ connectors });
    }

    // List files from specific provider
    let connector;
    try {
      connector = getStorageConnector(providerId);
    } catch {
      return NextResponse.json({ error: `Unknown provider: ${providerId}` }, { status: 404 });
    }

    if (!(await connector.isConnected(sessionData.userId))) {
      return NextResponse.json({
        error: `Provider "${providerId}" is not connected for your account.`,
        needsConnection: true,
        connectUrl: `/api/storage/connect/${providerId}`,
      }, { status: 403 });
    }

    const result = await connector.listFiles(sessionData.userId, path, pageToken);

    return NextResponse.json({
      provider: providerId,
      files: result.files,
      nextPageToken: result.nextPageToken,
    });
  } catch (error) {
    console.error('[storage/files] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
