import { NextResponse, NextRequest } from 'next/server';

const PROXY_BASE = '/api/proxy';

function rewriteUrls(html: string, baseUrl: string): string {
  const parsedBase = new URL(baseUrl);

  // Rewrite absolute URLs in href/src/action attributes to go through proxy
  html = html.replace(
    /(href|src|action|data-src|poster)=["'](https?:\/\/[^"']+)["']/gi,
    (_, attr, url) => `${attr}="${PROXY_BASE}?url=${encodeURIComponent(url)}"`
  );

  // Rewrite relative URLs — resolve against base, then route through proxy
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

  // Inject <base href> as fallback for any URLs we missed
  const baseTag = `<base href="${parsedBase.origin}${parsedBase.pathname}">`;
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${baseTag}`);
  } else if (html.includes('<HEAD>')) {
    html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
  } else {
    html = baseTag + html;
  }

  // Break frame-busting scripts
  html = html.replace(/window\.top\./g, 'window.');
  html = html.replace(/window\.parent\./g, 'window.');
  html = html.replace(/top\.location/g, 'self.location');
  html = html.replace(/parent\.location/g, 'self.location');
  html = html.replace(/if\s*\(\s*window\.self\s*!==\s*window\.top\s*\)/gi, 'if(false)');

  return html;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const parsedUrl = new URL(targetUrl);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch page: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';

    // HTML — rewrite URLs and strip frame-blocking headers
    if (contentType.includes('text/html')) {
      let html = await response.text();
      html = rewriteUrls(html, targetUrl);

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src *; img-src * data: blob: http: https:; style-src * 'unsafe-inline'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *;",
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // CSS — rewrite url() references to go through proxy
    if (contentType.includes('text/css')) {
      let css = await response.text();
      css = css.replace(
        /url\(["']?(https?:\/\/[^"')\s]+)["']?\)/gi,
        (_, url) => `url("${PROXY_BASE}?url=${encodeURIComponent(url)}")`
      );
      // Relative url() — resolve against base
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
          'Access-Control-Allow-Origin': '*',
          'X-Frame-Options': 'ALLOWALL',
        },
      });
    }

    // JS — serve with permissive CORS so iframe scripts can fetch
    if (contentType.includes('javascript') || contentType.includes('application/x-javascript')) {
      const js = await response.text();
      return new NextResponse(js, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'X-Frame-Options': 'ALLOWALL',
        },
      });
    }

    // Images, fonts, media, etc. — proxy the binary content
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
        'X-Frame-Options': 'ALLOWALL',
      },
    });
  } catch (error: any) {
    return new NextResponse(`Proxy error: ${error.message}`, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
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
          'X-Frame-Options': 'ALLOWALL',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const respBody = await response.arrayBuffer();
    return new NextResponse(respBody, {
      headers: {
        'Content-Type': respContentType,
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
      },
    });
  } catch (error: any) {
    return new NextResponse(`Proxy error: ${error.message}`, { status: 500 });
  }
}
