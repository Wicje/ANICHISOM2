import { NextResponse, NextRequest } from 'next/server';
import { resolveSession } from '@/lib/session-store';

const PROXY_BASE = '/api/proxy';

// --- Security: Private IP / internal network blocking ---
const PRIVATE_IP_RANGES = [
  /^10\./,                          // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,                    // 192.168.0.0/16
  /^169\.254\./,                    // 169.254.0.0/16 (link-local / cloud metadata)
  /^127\./,                         // 127.0.0.0/8 (loopback)
  /^0\./,                           // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGN)
  /^::1$/,                          // IPv6 loopback
  /^fc/,                            // IPv6 unique local
  /^fe80:/,                         // IPv6 link-local
];

function isPrivateUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname;

    // Block non-HTTP schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;

    // Block localhost variants
    if (hostname === 'localhost' || hostname === 'localhost.localdomain') return true;

    // Block hostnames that look like internal names (no TLD or .local/.internal/.corp)
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.corp')) return true;

    // Check private IP ranges
    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(hostname)) return true;
    }

    return false;
  } catch {
    return true; // Invalid URL = blocked
  }
}

// --- Security: Rate limiting (in-memory, per IP) ---
const proxyRateLimits = new Map<string, { count: number; resetAt: number }>();
const PROXY_RATE_LIMIT_MAX = 60;       // 60 requests per window
const PROXY_RATE_LIMIT_WINDOW = 60000; // 1 minute window
const PROXY_RATE_LIMIT_MAX_KEYS = 10000;

function checkProxyRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = proxyRateLimits.get(ip);

  if (!record || now >= record.resetAt) {
    if (proxyRateLimits.size >= PROXY_RATE_LIMIT_MAX_KEYS) {
      cleanupProxyRateLimits();
      if (proxyRateLimits.size >= PROXY_RATE_LIMIT_MAX_KEYS) {
        const oldestKey = proxyRateLimits.keys().next().value;
        if (oldestKey) proxyRateLimits.delete(oldestKey);
      }
    }

    proxyRateLimits.set(ip, { count: 1, resetAt: now + PROXY_RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: PROXY_RATE_LIMIT_MAX - 1 };
  }

  if (record.count >= PROXY_RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: PROXY_RATE_LIMIT_MAX - record.count };
}

// Cleanup rate limit entries every 5 minutes
function cleanupProxyRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of proxyRateLimits.entries()) {
    if (now >= record.resetAt) proxyRateLimits.delete(key);
  }
}

const globalForProxy = globalThis as any;
if (!globalForProxy.__anichisom_proxy_rate_limit_cleanup_interval) {
  const interval = setInterval(cleanupProxyRateLimits, 5 * 60 * 1000);
  if (typeof interval === 'object' && 'unref' in interval) interval.unref();
  globalForProxy.__anichisom_proxy_rate_limit_cleanup_interval = interval;
}

// --- Security: Auth check (session cookie OR Supabase auth must exist) ---
function hasAuthSession(request: NextRequest): boolean {
  // Allow if session cookie exists (legacy dev auth)
  const sessionCookie = request.cookies.get('anichisom_session');
  if (sessionCookie?.value && resolveSession(sessionCookie.value)) return true;
  // Allow if Supabase auth cookie exists (sb-* cookies indicate Supabase session)
  const cookies = request.cookies.getAll();
  if (cookies.some(c => c.name.startsWith('sb-') && c.value)) return true;
  // Allow if Authorization header present
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return true;
  return false;
}

// --- URL rewriting ---
function rewriteUrls(html: string, baseUrl: string): string {
  const parsedBase = new URL(baseUrl);

  html = html.replace(
    /(href|src|action|data-src|poster)=["'](https?:\/\/[^"']+)["']/gi,
    (_, attr, url) => `${attr}="${PROXY_BASE}?url=${encodeURIComponent(url)}"`
  );

  html = html.replace(
    /(href|src|action)=["'](\/[^"']*|[a-zA-Z0-9_][^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|mp4|webm|mp3|ogg|json|xml))["']/gi,
    (_, attr, relPath, _ext) => {
      try {
        const resolved = new URL(relPath, parsedBase.origin + parsedBase.pathname).href;
        return `${attr}="${PROXY_BASE}?url=${encodeURIComponent(resolved)}"`;
      } catch {
        return `${attr}="${relPath}"`;
      }
    }
  );

  const baseTag = `<base href="${parsedBase.origin}${parsedBase.pathname}">`;
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${baseTag}`);
  } else if (html.includes('<HEAD>')) {
    html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
  } else {
    html = baseTag + html;
  }

  // Break frame-busting scripts — only for proxied content, not universal
  html = html.replace(/window\.top\./g, 'window.');
  html = html.replace(/window\.parent\./g, 'window.');
  html = html.replace(/top\.location/g, 'self.location');
  html = html.replace(/parent\.location/g, 'self.location');
  html = html.replace(/if\s*\(\s*window\.self\s*!==\s*window\.top\s*\)/gi, 'if(false)');

  return html;
}

// --- Shared security checks for GET and POST ---
function validateProxyRequest(request: NextRequest): { targetUrl: string; error?: NextResponse } {
  // Auth check — must have a session cookie
  if (!hasAuthSession(request)) {
    return {
      targetUrl: '',
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  // Rate limit check — parse rightmost IP from x-forwarded-for (trusted on Vercel)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor
    ? forwardedFor.split(',').pop()?.trim() || 'unknown'
    : request.headers.get('x-client-ip') || 'unknown';
  const rateCheck = checkProxyRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return {
      targetUrl: '',
      error: NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { status: 429 }
      ),
    };
  }

  // Parse target URL
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  if (!targetUrl) {
    return {
      targetUrl: '',
      error: NextResponse.json({ error: 'Missing url parameter' }, { status: 400 }),
    };
  }

  // Private IP / SSRF blocking
  if (isPrivateUrl(targetUrl)) {
    return {
      targetUrl: '',
      error: NextResponse.json({ error: 'Access to internal networks is blocked' }, { status: 403 }),
    };
  }

  // Validate URL format
  try {
    new URL(targetUrl);
  } catch {
    return {
      targetUrl: '',
      error: NextResponse.json({ error: 'Invalid URL format' }, { status: 400 }),
    };
  }

  return { targetUrl };
}

// Build CSP header for proxied content — restrict to the proxied domain, not wildcard
function buildProxyCSP(proxiedOrigin: string): string {
  return [
    `default-src ${proxiedOrigin} 'unsafe-inline' data: blob:`,
    `frame-src ${proxiedOrigin}`,
    `img-src ${proxiedOrigin} data: blob: http: https:`,
    `style-src ${proxiedOrigin} 'unsafe-inline'`,
    `script-src ${proxiedOrigin} 'unsafe-inline'`,
    `connect-src ${proxiedOrigin} ws: wss:`,
  ].join('; ');
}

export async function GET(request: NextRequest) {
  const validation = validateProxyRequest(request);
  if (validation.error) return validation.error;
  const targetUrl = validation.targetUrl;

  try {
    const parsedUrl = new URL(targetUrl);
    const proxiedOrigin = parsedUrl.origin;

    // Follow redirects manually to re-validate each URL against SSRF checks
    let currentUrl = targetUrl;
    let response: Response | null = null;
    const MAX_REDIRECTS = 5;

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      if (isPrivateUrl(currentUrl)) {
        return new NextResponse(JSON.stringify({
          error: true,
          message: `Redirect blocked: ${currentUrl} is a private/internal URL (SSRF protection)`,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Proxy-Error': 'true' },
        });
      }

      response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'manual',
      });

      // If not a redirect, break and use this response
      if (response.status < 300 || response.status >= 400) break;

      // Get redirect location
      const location = response.headers.get('location');
      if (!location) break;

      // Resolve relative redirects
      try {
        currentUrl = new URL(location, currentUrl).href;
      } catch {
        break; // Invalid redirect URL
      }
    }

    if (!response) {
      return new NextResponse(JSON.stringify({
        error: true,
        message: 'Failed to fetch: no response',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Proxy-Error': 'true' },
      });
    }

    if (!response.ok) {
      return new NextResponse(JSON.stringify({
        error: true,
        status: response.status,
        statusText: response.statusText,
        message: `Failed to load: ${response.status} ${response.statusText}`,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Proxy-Error': 'true',
          'X-Proxy-Status': String(response.status),
        },
      });
    }

    const contentType = response.headers.get('content-type') || '';
    const finalUrl = response.url || targetUrl;

    // HTML — rewrite URLs with restricted CSP
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Check for common block responses (sites returning auth walls or error pages)
      const isLikelyBlocked = html.includes('X-Frame-Options') ||
        html.includes('frame-ancestors') && html.includes("'none'") ||
        response.headers.get('x-frame-options');

      html = rewriteUrls(html, finalUrl);

      const headers: Record<string, string> = {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': buildProxyCSP(proxiedOrigin),
        'Access-Control-Allow-Origin': proxiedOrigin,
        'X-Proxy-Final-Url': finalUrl,
      };

      return new NextResponse(html, { headers });
    }

    // CSS — rewrite url() references
    if (contentType.includes('text/css')) {
      let css = await response.text();
      css = css.replace(
        /url\(["']?(https?:\/\/[^"')\s]+)["']?\)/gi,
        (_, url) => `url("${PROXY_BASE}?url=${encodeURIComponent(url)}")`
      );
      css = css.replace(
        /url\(["']?(\/[^"')\s]+)["']?\)/gi,
        (_, relPath) => {
          try {
            const resolved = new URL(relPath, parsedUrl.origin).href;
            return `url("${PROXY_BASE}?url=${encodeURIComponent(resolved)}")`;
          } catch {
            return `url("${relPath}")`;
          }
        }
      );

      return new NextResponse(css, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': proxiedOrigin,
        },
      });
    }

    // JS
    if (contentType.includes('javascript') || contentType.includes('application/x-javascript')) {
      const js = await response.text();
      return new NextResponse(js, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': proxiedOrigin,
        },
      });
    }

    // JSON (API responses)
    if (contentType.includes('application/json')) {
      const json = await response.text();
      return new NextResponse(json, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': proxiedOrigin,
        },
      });
    }

    // Images, fonts, media — proxy binary content
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': proxiedOrigin,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    return new NextResponse(JSON.stringify({
      error: true,
      message: `Proxy error: ${message}`,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Error': 'true',
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const validation = validateProxyRequest(request);
  if (validation.error) return validation.error;
  const targetUrl = validation.targetUrl;

  try {
    const parsedUrl = new URL(targetUrl);
    const proxiedOrigin = parsedUrl.origin;

    const contentType = request.headers.get('content-type') || '';
    const body = await request.text();

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': contentType,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      body,
    });

    const respContentType = response.headers.get('content-type') || '';

    if (respContentType.includes('text/html')) {
      let html = await response.text();
      html = rewriteUrls(html, targetUrl);

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': buildProxyCSP(proxiedOrigin),
          'Access-Control-Allow-Origin': proxiedOrigin,
        },
      });
    }

    const respBody = await response.arrayBuffer();
    return new NextResponse(respBody, {
      headers: {
        'Content-Type': respContentType,
        'Access-Control-Allow-Origin': proxiedOrigin,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    return new NextResponse(`Proxy error: ${message}`, { status: 500 });
  }
}
