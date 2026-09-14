/**
 * Storage Connect — initiates OAuth2 connection for a storage provider
 *
 * GET /api/storage/connect/[provider]
 *
 * Returns the OAuth authorization URL for the user to visit.
 * After authorization, Google/Dropbox redirects to /api/storage/callback/[provider].
 */

import { NextRequest } from 'next/server';
import {
  requireSession,
  apiOk,
  apiError,
  apiNotFound,
  apiInternal,
} from '@/lib/api-helpers';
import { getStorageConnector } from '@/lib/storage-connectors/connector-registry';
import { storeOAuthState } from '@/lib/storage-connectors/token-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;

    const authResult = await requireSession(request);
    if (!authResult.ok) return authResult.response;

    const userId = authResult.userId;

    // Get connector
    let connector;
    try {
      connector = getStorageConnector(provider);
    } catch {
      return apiNotFound(`Unknown storage provider: ${provider}`);
    }

    if (!connector.isConfigured()) {
      return apiError(`Provider "${provider}" is not configured on this server. Check environment variables.`, 503);
    }

    // Generate redirect URL for callback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/api/storage/callback/${provider}`;

    // Generate OAuth authorization URL
    const connectResult = await connector.connect(userId, redirectUrl);

    if (connectResult.state) {
      storeOAuthState(connectResult.state, userId, provider);
    }

    const response = apiOk({
      authUrl: connectResult.authUrl,
      state: connectResult.state,
      provider,
    });

    if (connectResult.state) {
      response.cookies.set(`oauth_state_${provider}`, connectResult.state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('[storage/connect] Error:', error);
    return apiInternal();
  }
}
