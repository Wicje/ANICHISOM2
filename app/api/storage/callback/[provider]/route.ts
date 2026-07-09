/**
 * Storage OAuth Callback — handles OAuth2 redirect from storage providers
 *
 * GET /api/storage/callback/[provider]?code=...&state=...
 *
 * Exchanges the OAuth code for tokens and stores them server-side.
 * Redirects user back to the Files app with connection status.
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
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/files?storage_error=${error}`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(`/files?storage_error=no_code`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      );
    }

    // We need userId — for the callback, we use the state parameter to identify the user
    // In a production system, the state would be a signed JWT or encrypted userId
    // For dev, we use a simpler approach: the session cookie is still valid during redirect
    // So we re-validate the session
    const sessionCookie = request.cookies.get('anichisom_session');
    let userId: string;

    if (sessionCookie && sessionCookie.value) {
      const sessionData = resolveSession(sessionCookie.value);
      if (sessionData) {
        userId = sessionData.userId;
      } else {
        return NextResponse.redirect(
          new URL(`/files?storage_error=session_expired`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
        );
      }
    } else {
      return NextResponse.redirect(
        new URL(`/files?storage_error=not_authenticated`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      );
    }

    // Get connector and handle callback
    let connector;
    try {
      connector = getStorageConnector(provider);
    } catch {
      return NextResponse.redirect(
        new URL(`/files?storage_error=unknown_provider`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      );
    }

    const result = await connector.handleCallback(userId, code, state);

    // Redirect back to Files app with success
    return NextResponse.redirect(
      new URL(`/files?storage_connected=${provider}&account=${encodeURIComponent(result.accountName || provider)}`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  } catch (error) {
    console.error('[storage/callback] Error:', error);
    return NextResponse.redirect(
      new URL(`/files?storage_error=callback_failed`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }
}
