import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import crypto from 'crypto';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

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
