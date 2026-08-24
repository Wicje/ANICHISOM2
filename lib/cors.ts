/**
 * Shared CORS helpers for the capability-token API surface
 * (pairing, context save, agent proxy).
 *
 * Behavior:
 *  - Requests without an Origin header (native daemon, curl, same-origin)
 *    get `*` — browsers are the only parties that enforce CORS anyway.
 *  - When CONTINUA_ALLOWED_ORIGINS is set (comma-separated), browser
 *    origins must match an entry; anything else gets no ACAO header and
 *    the browser blocks the response.
 *  - When unset (dev), all origins are echoed (`*`).
 */

export function buildCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const base = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };

  if (!origin) {
    return {
      ...base,
      'Access-Control-Allow-Origin': '*',
    };
  }

  const raw = process.env.CONTINUA_ALLOWED_ORIGINS;
  if (!raw) {
    return {
      ...base,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, x-capability-token',
    };
  }

  const allowed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!allowed.includes(origin)) {
    // No ACAO header -> browser refuses to read the response.
    return base;
  }

  return {
    ...base,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-capability-token',
  };
}
