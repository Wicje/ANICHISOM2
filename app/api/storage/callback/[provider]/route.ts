/**
 * Storage OAuth Callback — handles OAuth2 redirect from storage providers
 *
 * GET /api/storage/callback/[provider]?code=...&state=...
 *
 * Exchanges the OAuth code for tokens and stores them server-side.
 * Returns an HTML page that sends a postMessage to the parent frame
 * (the OS browser window) so the FileManager can refresh, then closes itself.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getStorageConnector } from '@/lib/storage-connectors/connector-registry';

function makeResultPage(provider: string, success: boolean, accountName?: string, error?: string) {
  const payload = JSON.stringify({ provider, success, accountName, error });
  const escapedPayload = payload.replace(/</g, '\\u003c');
  return new NextResponse(
    `<!DOCTYPE html><html><head><title>Cloud Connected</title></head><body>
<script>
try {
  window.parent.postMessage(${escapedPayload}, '*');
  window.parent.postMessage({ type: 'storage-oauth-callback', provider: '${provider}', success: ${success}${accountName ? `, accountName: '${accountName.replace(/'/g, "\\'")}'` : ''}${error ? `, error: '${error}'` : ''} }, '*');
} catch(e) {}
document.body.innerHTML = '<div style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;color:#666"><div style="text-align:center"><h2 style="color:${success ? '#22c55e' : '#ef4444'}">${success ? 'Connected!' : 'Failed'}</h2><p>${success ? accountName || provider + ' connected successfully.' : error || 'Connection failed.'}</p><p style="font-size:12px;color:#999">You can close this tab.</p></div></div>';
</script>
</body></html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return makeResultPage(provider, false, undefined, `OAuth error: ${error}`);
    }

    if (!code) {
      return makeResultPage(provider, false, undefined, 'No authorization code received');
    }

    // Validate session via Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() { /* read-only */ },
        },
      },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return makeResultPage(provider, false, undefined, 'Session expired — please log in again');
    }

    // Get connector and handle callback
    let connector;
    try {
      connector = getStorageConnector(provider);
    } catch {
      return makeResultPage(provider, false, undefined, `Unknown provider: ${provider}`);
    }

    const result = await connector.handleCallback(user.id, code, state ?? undefined);

    return makeResultPage(provider, true, result.accountName);
  } catch (error) {
    console.error('[storage/callback] Error:', error);
    return makeResultPage(provider, false, undefined, 'Callback failed — please try again');
  }
}
