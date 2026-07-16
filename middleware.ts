import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import crypto from 'crypto';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // Page-level auth guard: redirect unauthenticated users to login
  // API routes are excluded (handled by requireAuth/requireSession).
  // Static assets, login-adjacent routes, and auth callbacks are excluded.
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/login');
  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon') ||
    pathname.endsWith('.js') || pathname.endsWith('.css') || pathname.endsWith('.png') ||
    pathname.endsWith('.ico') || pathname.endsWith('.svg') || pathname.endsWith('.woff2');

  if (!isPublicRoute && !isStaticAsset) {
    // Check for Supabase session cookie
    const supabaseCookie = request.cookies.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
    if (!supabaseCookie) {
      // No session — redirect to root (which shows login/onboarding)
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // Generate per-request nonce for CSP
  const nonce = crypto.randomBytes(16).toString('base64');
  response.headers.set('X-Nonce', nonce);

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // CSP — Monaco is pre-bundled (local monaco-editor package), no unsafe-eval needed.
  // unsafe-inline kept for Next.js inline scripts and third-party style injection.
  // strict-dynamic allows any script loaded by a trusted (inline) script.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'strict-dynamic'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: http: https:",
    "frame-src 'self' https:",
    "media-src 'self' blob:",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)',
  ],
};
