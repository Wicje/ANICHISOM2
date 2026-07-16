import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/login');
  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon') ||
    pathname.endsWith('.js') || pathname.endsWith('.css') || pathname.endsWith('.png') ||
    pathname.endsWith('.ico') || pathname.endsWith('.svg') || pathname.endsWith('.woff2');

  // Only refresh Supabase session for protected routes (not public or static)
  if (!isPublicRoute && !isStaticAsset) {
    const supabaseCookie = request.cookies.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
    if (!supabaseCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    // Session refresh only for protected routes
    const response = await updateSession(request);
    applyHeaders(response);
    return response;
  }

  // Public routes and static assets — no session check, no latency
  const response = NextResponse.next();
  applyHeaders(response);
  return response;
}

function applyHeaders(response: NextResponse) {
  const nonceArray = new Uint8Array(16);
  globalThis.crypto.getRandomValues(nonceArray);
  const nonce = btoa(String.fromCharCode(...nonceArray));

  response.headers.set('X-Nonce', nonce);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: http: https:",
    "frame-src 'self' https:",
    "media-src 'self' blob:",
  ].join('; '));
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)',
  ],
};
