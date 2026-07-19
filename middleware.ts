import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon') ||
    pathname.endsWith('.js') || pathname.endsWith('.css') || pathname.endsWith('.png') ||
    pathname.endsWith('.ico') || pathname.endsWith('.svg') || pathname.endsWith('.woff2');

  // Static assets — no checks
  if (isStaticAsset) {
    const response = NextResponse.next();
    applyHeaders(response);
    return response;
  }

  // Public routes — no session check needed
  const isPublicRoute = pathname === '/' || pathname === '/waitlist' || pathname.startsWith('/auth') || pathname.startsWith('/login');
  if (isPublicRoute) {
    // If user has Supabase session and is on landing page, redirect to /os
    if (pathname === '/') {
      const supabaseCookie = request.cookies.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
      if (supabaseCookie) {
        const url = request.nextUrl.clone();
        url.pathname = '/os';
        return NextResponse.redirect(url);
      }
    }

    const response = NextResponse.next();
    applyHeaders(response);
    return response;
  }

  // Protected routes (including /os) — require Supabase session
  const supabaseCookie = request.cookies.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
  if (!supabaseCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Session refresh for protected routes
  const response = await updateSession(request);
  applyHeaders(response);
  return response;
}

function applyHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
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
