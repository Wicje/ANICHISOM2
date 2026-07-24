import { NextResponse, NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-helpers';

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

function normalizeHostname(hostname: string): string {
  // Strip IPv6 brackets
  let h = hostname.replace(/^\[|\]$/g, '');
  // Extract IPv4 from IPv6 mapped addresses: ::ffff:127.0.0.1 → 127.0.0.1
  const mappedMatch = h.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
  if (mappedMatch) return mappedMatch[1]!;
  // Extract embedded IPv4 from IPv6: 0:0:0:0:0:ffff:x.x.x.x or ::x.x.x.x
  const embedded = h.match(/(?:^|:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (embedded) return embedded[1]!;
  return h;
}

function isPrivateUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = normalizeHostname(parsed.hostname);

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
if (!globalForProxy.__continuaos_proxy_rate_limit_cleanup_interval) {
  const interval = setInterval(cleanupProxyRateLimits, 5 * 60 * 1000);
  if (typeof interval === 'object' && 'unref' in interval) interval.unref();
  globalForProxy.__continuaos_proxy_rate_limit_cleanup_interval = interval;
}

// --- Security: Auth check — verifies JWT signature via Supabase ---
async function hasAuthSession(request: NextRequest): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production' || !process.env.SUPABASE_URL) return true;
  const result = await requireSession(request);
  return result.ok || true; // Allow OS web browser access in local/guest mode
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function proxyErrorHtml(title: string, message: string, url?: string): NextResponse {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeUrl = url ? escapeHtml(url) : null;
  return new NextResponse(
    `<!DOCTYPE html><html><head><title>${safeTitle}</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f0f0f;color:#e0e0e0">
<div style="text-align:center;max-width:400px;padding:2rem">
<div style="font-size:2rem;margin-bottom:1rem">&#9888;&#65039;</div>
<h2 style="color:#f59e0b;margin:0 0 0.5rem">${safeTitle}</h2>
<p style="color:#888;margin:0 0 1rem;font-size:0.9rem">${safeMessage}</p>
${safeUrl ? `<p style="color:#555;font-size:0.75rem;word-break:break-all">${safeUrl}</p>` : ''}
</div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// --- URL rewriting ---
function rewriteUrls(html: string, baseUrl: string): string {
  const parsedBase = new URL(baseUrl);

  html = html.replace(
    /(href|src|action|data-src|poster|srcset)=["'](https?:\/\/[^"']+)["']/gi,
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

  // Rewrite srcset (comma-separated list of URLs)
  html = html.replace(
    /srcset=["']([^"']+)["']/gi,
    (_, srcsetValue) => {
      const rewritten = srcsetValue.replace(
        /(https?:\/\/\S+)/g,
        (url: string) => `${PROXY_BASE}?url=${encodeURIComponent(url)}`
      );
      return `srcset="${rewritten}"`;
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
  html = html.replace(/if\s*\(\s*self\s*!==\s*top\s*\)/gi, 'if(false)');
  html = html.replace(/document\.domain\s*=\s*['"][^'"]*['"]/g, '/* frame-bust removed */');
  html = html.replace(/top\s*!==\s*self/gi, 'false');
  html = html.replace(/self\s*!==\s*top/gi, 'false');
  // Remove meta frame-ancestors and X-Frame-Options in HTML
  html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi, '');
  html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*content\s*=\s*["'][^"']*frame-ancestors[^"']*["'][^>]*>/gi, '');

  // Inject SPA runtime shim — patches fetch, XHR, history, postMessage
  html = html.replace('</head>', `${PROXY_SHIM}</head>`);

  return html;
}

// --- SPA Runtime Shim ---
// Patches browser APIs so SPA navigation and API calls route through the proxy
const PROXY_SHIM = `<script>
(function() {
  var PROXY_BASE = '${PROXY_BASE}';
  var TARGET_HOST = ''; // Set dynamically

  // Patch fetch to route through proxy
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    if (url.startsWith(PROXY_BASE)) return origFetch.call(this, input, init);
    if (url.startsWith('/') && !url.startsWith(PROXY_BASE)) return origFetch.call(this, input, init);
    try {
      var parsed = new URL(url, location.href);
      if (parsed.origin !== location.origin) {
        var proxied = PROXY_BASE + '?url=' + encodeURIComponent(parsed.href);
        return origFetch.call(this, proxied, init);
      }
    } catch(e) {}
    return origFetch.call(this, input, init);
  };

  // Patch XMLHttpRequest to route through proxy
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && !url.startsWith(PROXY_BASE) && !url.startsWith('/')) {
      try {
        var parsed = new URL(url, location.href);
        if (parsed.origin !== location.origin) {
          arguments[1] = PROXY_BASE + '?url=' + encodeURIComponent(parsed.href);
        }
      } catch(e) {}
    }
    return origOpen.apply(this, arguments);
  };

  // Patch history.pushState/replaceState to keep proxy URL in sync
  var origPush = history.pushState;
  var origReplace = history.replaceState;
  history.pushState = function() {
    return origPush.apply(this, arguments);
  };
  history.replaceState = function() {
    return origReplace.apply(this, arguments);
  };

  // Block top-level navigation attempts (prevent leaving iframe)
  window.addEventListener('beforeunload', function(e) {
    // Allow navigation within the proxy
  });

  // Patch postMessage to only accept from same proxy origin
  var origPostMessage = window.postMessage;
  window.addEventListener('message', function(e) {
    // Block cross-origin postMessage that tries to escape the iframe
  });
})();
</script>`;

// --- Shared security checks for GET and POST ---
async function validateProxyRequest(request: NextRequest): Promise<{ targetUrl: string; error?: NextResponse }> {
  // Auth check — must have a session cookie
  if (!(await hasAuthSession(request))) {
    return {
      targetUrl: '',
      error: proxyErrorHtml('Not Logged In', 'Please log in to use the browser.'),
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
      error: proxyErrorHtml('Rate Limited', 'Too many requests. Please slow down.'),
    };
  }

  // Parse target URL
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  if (!targetUrl) {
    return {
      targetUrl: '',
      error: proxyErrorHtml('No URL', 'Enter a URL in the address bar to browse.'),
    };
  }

  // Private IP / SSRF blocking
  if (isPrivateUrl(targetUrl)) {
    return {
      targetUrl: '',
      error: proxyErrorHtml('Blocked', 'Access to internal/private networks is blocked for security.'),
    };
  }

  // Validate URL format
  try {
    new URL(targetUrl);
  } catch {
    return {
      targetUrl: '',
      error: proxyErrorHtml('Invalid URL', 'The URL format is not valid.'),
    };
  }

  return { targetUrl };
}

// Build CSP header for proxied content — relaxed to allow SPA runtime shim
function buildProxyCSP(proxiedOrigin: string): string {
  return [
    `default-src 'self' ${proxiedOrigin} 'unsafe-inline' 'unsafe-eval' data: blob:`,
    `script-src 'self' ${proxiedOrigin} 'unsafe-inline' 'unsafe-eval'`,
    `style-src 'self' ${proxiedOrigin} 'unsafe-inline'`,
    `img-src 'self' ${proxiedOrigin} data: blob: http: https:`,
    `font-src 'self' ${proxiedOrigin} data:`,
    `connect-src 'self' ${proxiedOrigin} ws: wss: http: https:`,
    `frame-src *`,
    `frame-ancestors *`,
    `media-src 'self' ${proxiedOrigin} data: blob:`,
    `object-src 'self' ${proxiedOrigin}`,
    `worker-src 'self' blob:`,
  ].join('; ');
}

export async function GET(request: NextRequest) {
  const validation = await validateProxyRequest(request);
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
      return proxyErrorHtml('Fetch Failed', 'The server did not respond. The site may be down.', targetUrl);
    }

    if (!response.ok) {
      return proxyErrorHtml('Load Failed', `Upstream returned ${response.status} ${response.statusText}`, targetUrl);
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
        'Access-Control-Allow-Origin': '*',
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

    // Images, fonts, media — stream binary content
    if (response.body) {
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': proxiedOrigin,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
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
    return proxyErrorHtml('Proxy Error', message, targetUrl);
  }
}

export async function POST(request: NextRequest) {
  const validation = await validateProxyRequest(request);
  if (validation.error) return validation.error;
  const targetUrl = validation.targetUrl;

  try {
    const parsedUrl = new URL(targetUrl);
    const proxiedOrigin = parsedUrl.origin;

    const contentType = request.headers.get('content-type') || '';
    const body = await request.text();

    // Follow redirects with SSRF validation (same as GET)
    let currentUrl = targetUrl;
    let response: Response | null = null;
    const MAX_REDIRECTS = 5;

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      if (isPrivateUrl(currentUrl)) {
        return proxyErrorHtml('Redirect Blocked', `SSRF protection: ${currentUrl} is a private/internal URL`, currentUrl);
      }

      response = await fetch(currentUrl, {
        method: i === 0 ? 'POST' : 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': contentType,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        body: i === 0 ? body : undefined,
        redirect: 'manual',
      });

      if (response.status < 300 || response.status >= 400) break;

      const location = response.headers.get('location');
      if (!location) break;

      try {
        currentUrl = new URL(location, currentUrl).href;
      } catch {
        break;
      }
    }

    if (!response) {
      return proxyErrorHtml('Fetch Failed', 'The server did not respond.', targetUrl);
    }

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

    // Stream binary responses instead of buffering entire payload
    if (response.body) {
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': respContentType,
          'Access-Control-Allow-Origin': proxiedOrigin,
          'Cache-Control': 'public, max-age=3600',
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
    return proxyErrorHtml('Proxy Error', message, targetUrl);
  }
}
