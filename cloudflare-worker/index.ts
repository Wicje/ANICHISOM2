/**
 * Continua Cloudflare Worker Proxy
 *
 * Edge proxy that strips iframe-blocking headers, rewrites URLs,
 * injects SPA runtime shim, and serves any site inside Continua's browser.
 *
 * Deploy: npx wrangler deploy
 * Usage: https://your-worker.workers.dev/proxy?url=https://example.com
 */

interface Env {
  ALLOWED_ORIGINS: string;
  PROXY_PATH: string;
  RATE_LIMIT_MAX: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

/**
 * Enforce Supabase RLS in Cloudflare Worker (Issue 57)
 * Never use SUPABASE_SERVICE_ROLE_KEY; forward user Authorization Bearer JWT.
 */
export function getAuthenticatedSupabaseClient(authHeader: string | null, env: Env) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: missing or invalid Bearer token');
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase client unconfigured in worker environment');
  }
  // User JWT is forwarded so Row-Level Security rules apply strictly to auth.uid()
  return {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: authHeader,
    },
    url: env.SUPABASE_URL,
  };
}

// ─── SSRF Protection ────────────────────────────────────────────────────────

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^127\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./,
  /^::1$/,
  /^fc/,
  /^fe80:/,
];

function normalizeHostname(hostname: string): string {
  let h = hostname.replace(/^\[|\]$/g, '');
  const mappedMatch = h.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
  if (mappedMatch) return mappedMatch[1]!;
  const embedded = h.match(/(?:^|:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (embedded) return embedded[1]!;
  return h;
}

function isPrivateUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = normalizeHostname(parsed.hostname);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    if (hostname === 'localhost' || hostname === 'localhost.localdomain') return true;
    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.corp')) return true;
    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(hostname)) return true;
    }
    
    // Block internal application path prefixes (Issue 67)
    const lowerPath = parsed.pathname.toLowerCase();
    if (
      lowerPath.startsWith('/api/internal') ||
      lowerPath.startsWith('/_next/data') ||
      lowerPath.startsWith('/_next/static') ||
      lowerPath.includes('.env') ||
      lowerPath.includes('/api/storage/callback')
    ) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

// ─── Rate Limiting (in-memory per-isolate) ──────────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, max: number, windowSeconds: number): boolean {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(ip);

  if (!record || now >= record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= max) return false;
  record.count++;
  return true;
}

// ─── HTML URL Rewriting ─────────────────────────────────────────────────────

function rewriteHtmlUrls(html: string, baseUrl: string, proxyPath: string): string {
  const parsedBase = new URL(baseUrl);

  // Rewrite absolute URLs in common attributes
  html = html.replace(
    /(href|src|action|data-src|poster)=["'](https?:\/\/[^"']+)["']/gi,
    (_, attr, url) => `${attr}="${proxyPath}?url=${encodeURIComponent(url)}"`
  );

  // Rewrite relative URLs
  html = html.replace(
    /(href|src|action)=["'](\/[^"']*|[a-zA-Z0-9_][^"']*\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|mp4|webm|mp3|ogg|json|xml|map))["']/gi,
    (_, attr, relPath) => {
      try {
        const resolved = new URL(relPath, parsedBase.origin + parsedBase.pathname).href;
        return `${attr}="${proxyPath}?url=${encodeURIComponent(resolved)}"`;
      } catch {
        return `${attr}="${relPath}"`;
      }
    }
  );

  // Rewrite srcset
  html = html.replace(
    /srcset=["']([^"']+)["']/gi,
    (_, srcsetValue) => {
      const rewritten = srcsetValue.replace(
        /(https?:\/\/\S+)/g,
        (url: string) => `${proxyPath}?url=${encodeURIComponent(url)}`
      );
      return `srcset="${rewritten}"`;
    }
  );

  // Rewrite inline style url() references
  html = html.replace(
    /style=["']([^"']*url\([^)]+\)[^"']*)["']/gi,
    (_, styleContent) => {
      const rewritten = styleContent.replace(
        /url\(["']?(https?:\/\/[^"')\s]+)["']?\)/gi,
        (_, url) => `url("${proxyPath}?url=${encodeURIComponent(url)}")`
      );
      return `style="${rewritten}"`;
    }
  );

  // Add <base> tag for relative URL resolution
  const baseTag = `<base href="${parsedBase.origin}${parsedBase.pathname}">`;
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${baseTag}`);
  } else if (html.includes('<HEAD>')) {
    html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
  } else {
    html = baseTag + html;
  }

  return html;
}

// ─── CSS URL Rewriting ──────────────────────────────────────────────────────

function rewriteCssUrls(css: string, baseUrl: string, proxyPath: string): string {
  const parsedBase = new URL(baseUrl);

  css = css.replace(
    /url\(["']?(https?:\/\/[^"')\s]+)["']?\)/gi,
    (_, url) => `url("${proxyPath}?url=${encodeURIComponent(url)}")`
  );

  css = css.replace(
    /url\(["']?(\/[^"')\s]+)["']?\)/gi,
    (_, relPath) => {
      try {
        const resolved = new URL(relPath, parsedBase.origin).href;
        return `url("${proxyPath}?url=${encodeURIComponent(resolved)}")`;
      } catch {
        return `url("${relPath}")`;
      }
    }
  );

  return css;
}

// ─── Frame-Buster Neutralization ────────────────────────────────────────────

function neutralizeFrameBusters(html: string): string {
  html = html.replace(/window\.top\./g, 'window.');
  html = html.replace(/window\.parent\./g, 'window.');
  html = html.replace(/top\.location/g, 'self.location');
  html = html.replace(/parent\.location/g, 'self.location');
  html = html.replace(/if\s*\(\s*window\.self\s*!==\s*window\.top\s*\)/gi, 'if(false)');
  html = html.replace(/if\s*\(\s*self\s*!==\s*top\s*\)/gi, 'if(false)');
  html = html.replace(/document\.domain\s*=\s*['"][^'"]*['"]/g, '/* frame-bust removed */');
  html = html.replace(/top\s*!==\s*self/gi, 'false');
  html = html.replace(/self\s*!==\s*top/gi, 'false');
  // Remove meta CSP and X-Frame-Options tags
  html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi, '');
  html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*content\s*=\s*["'][^"']*frame-ancestors[^"']*["'][^>]*>/gi, '');
  return html;
}

// ─── SPA Runtime Shim ───────────────────────────────────────────────────────

function getSpaShim(proxyPath: string): string {
  return `<script data-continua-proxy="true">
(function() {
  var P = '${proxyPath}';

  // Patch fetch
  var OF = window.fetch;
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    if (url.startsWith(P) || url.startsWith('/')) return OF.call(this, input, init);
    try {
      var p = new URL(url, location.href);
      if (p.origin !== location.origin) return OF.call(this, P + '?url=' + encodeURIComponent(p.href), init);
    } catch(e) {}
    return OF.call(this, input, init);
  };

  // Patch XMLHttpRequest
  var OO = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && !url.startsWith(P) && !url.startsWith('/')) {
      try {
        var p = new URL(url, location.href);
        if (p.origin !== location.origin) arguments[1] = P + '?url=' + encodeURIComponent(p.href);
      } catch(e) {}
    }
    return OO.apply(this, arguments);
  };

  // Patch WebSocket — connect through proxy (if WS proxy endpoint exists)
  var OW = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    try {
      var p = new URL(url);
      if (p.origin !== location.origin) {
        url = P.replace('/proxy', '/ws') + '?url=' + encodeURIComponent(url);
      }
    } catch(e) {}
    return protocols ? new OW(url, protocols) : new OW(url);
  };
  window.WebSocket.prototype = OW.prototype;
})();
</script>`;
}

// ─── CSP for Proxied Content ────────────────────────────────────────────────

function buildCSP(proxiedOrigin: string): string {
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
    `worker-src 'self' blob:`,
  ].join('; ');
}

// ─── Main Request Handler ───────────────────────────────────────────────────

function getQueryParam(url: string, param: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get(param);
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const proxyPath = env.PROXY_PATH || '/proxy';
    const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
    const rateLimitMax = parseInt(env.RATE_LIMIT_MAX || '120');
    const rateLimitWindow = parseInt(env.RATE_LIMIT_WINDOW_SECONDS || '60');

    // ─── CORS preflight ───
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': allowedOrigins[0] || '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // ─── Origin check ───
    const origin = request.headers.get('origin') || '';
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin) && origin !== '') {
      return new Response('Forbidden', { status: 403 });
    }

    // ─── Health check ───
    if (url.pathname === '/health' || url.pathname === `${proxyPath}/health`) {
      return new Response(JSON.stringify({ status: 'ok', worker: 'continua-proxy' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ─── Proxy endpoint ───
    if (url.pathname === proxyPath || url.pathname === `${proxyPath}/`) {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('Missing ?url= parameter', { status: 400 });
      }

      // SSRF check
      if (isPrivateUrl(targetUrl)) {
        return new Response('Blocked: private/internal URL', { status: 403 });
      }

      // Rate limit (by CF-Connecting-IP or fallback)
      const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
      if (!checkRateLimit(clientIp, rateLimitMax, rateLimitWindow)) {
        return new Response('Rate limit exceeded', {
          status: 429,
          headers: { 'Retry-After': String(rateLimitWindow) },
        });
      }

      // Fetch target
      let response: Response;
      try {
        response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip',
          },
          redirect: 'follow',
        });
      } catch (e: any) {
        return new Response(`Fetch failed: ${e.message}`, { status: 502 });
      }

      const contentType = response.headers.get('content-type') || '';
      const finalUrl = response.url || targetUrl;

      // Build response headers — strip iframe-blocking headers
      const respHeaders = new Headers();
      respHeaders.set('Access-Control-Allow-Origin', origin || allowedOrigins[0] || '*');
      respHeaders.set('X-Proxy-Final-Url', finalUrl);
      // Do NOT set X-Frame-Options or frame-ancestors CSP

      // HTML — rewrite URLs, inject shim, strip frame-busters
      if (contentType.includes('text/html')) {
        let html = await response.text();
        html = rewriteHtmlUrls(html, finalUrl, proxyPath);
        html = neutralizeFrameBusters(html);

        // Inject SPA shim before </head>
        const shim = getSpaShim(proxyPath);
        html = html.replace('</head>', `${shim}</head>`);

        respHeaders.set('Content-Type', 'text/html; charset=utf-8');
        respHeaders.set('Content-Security-Policy', buildCSP(new URL(finalUrl).origin));

        return new Response(html, { headers: respHeaders, status: response.status });
      }

      // CSS — rewrite url() references
      if (contentType.includes('text/css')) {
        let css = await response.text();
        css = rewriteCssUrls(css, finalUrl, proxyPath);
        respHeaders.set('Content-Type', contentType);
        return new Response(css, { headers: respHeaders, status: response.status });
      }

      // Everything else — stream through
      respHeaders.set('Content-Type', contentType);
      respHeaders.set('Cache-Control', 'public, max-age=3600');

      return new Response(response.body, {
        headers: respHeaders,
        status: response.status,
      });
    }

    // ─── WebSocket proxy endpoint (for future use) ───
    if (url.pathname === '/ws' && request.headers.get('upgrade') === 'websocket') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl || isPrivateUrl(targetUrl)) {
        return new Response('Bad request', { status: 400 });
      }

      // Cloudflare Workers support WebSocket passthrough
      try {
        const wsResponse = await fetch(targetUrl, {
          headers: {
            ...Object.fromEntries(request.headers),
            'Upgrade': 'websocket',
          },
        });
        return wsResponse;
      } catch {
        return new Response('WebSocket upgrade failed', { status: 502 });
      }
    }

    return new Response('Continua Proxy Worker — use /proxy?url=https://...', { status: 404 });
  },
};
