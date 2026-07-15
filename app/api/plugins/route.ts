/**
 * Plugin API — Marketplace listing and publishing
 *
 * GET  /api/plugins         — List all published plugins (optional ?search= & ?category=)
 * POST /api/plugins         — Publish a new plugin (auth required)
 */

import { NextRequest } from 'next/server';
import { requireAuth, checkRouteRateLimit, apiOk, apiError, apiInternal } from '@/lib/api-helpers';
import { getPluginStore, PluginListing } from './store';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'PLUGINS');
    if (rl) return rl;

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search')?.toLowerCase();
    const category = searchParams.get('category');

    const store = getPluginStore();
    let results = Array.from(store.values());

    if (category && category !== 'All') {
      results = results.filter(p => p.category === category);
    }

    if (searchQuery) {
      results = results.filter(p =>
        p.name.toLowerCase().includes(searchQuery) ||
        p.description.toLowerCase().includes(searchQuery) ||
        p.tags.some(t => t.toLowerCase().includes(searchQuery)) ||
        p.author.toLowerCase().includes(searchQuery)
      );
    }

    return apiOk({ plugins: results, total: results.length });
  } catch (error) {
    console.error('[plugins] GET Error:', error);
    return apiInternal();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'PLUGINS');
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const requiredFields = ['id', 'name', 'version', 'description', 'author', 'category', 'runtime', 'permissions'];
    for (const field of requiredFields) {
      if (!(field in body)) {
        return apiError(`Missing required field: ${field}`);
      }
    }

    if (!['iframe', 'native'].includes(body.runtime)) {
      return apiError('runtime must be "iframe" or "native"');
    }

    const store = getPluginStore();
    if (store.has(body.id)) {
      return apiError(`Plugin with id "${body.id}" already exists`, 409);
    }

    // Validate entryUrl for SSRF if iframe runtime
    if (body.runtime === 'iframe' && body.entryUrl) {
      try {
        const entryUrl = new URL(body.entryUrl);
        if (entryUrl.protocol !== 'https:') {
          return apiError('entryUrl must use HTTPS', 400);
        }
        // Block private/internal IPs
        const hostname = entryUrl.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' ||
            hostname.startsWith('10.') || hostname.startsWith('192.168.') ||
            hostname.startsWith('172.') || hostname.endsWith('.local') ||
            hostname.endsWith('.internal')) {
          return apiError('entryUrl cannot point to private/internal addresses', 400);
        }
      } catch {
        return apiError('Invalid entryUrl format', 400);
      }
    }

    const listing: PluginListing = {
      id: body.id,
      name: body.name,
      version: body.version,
      description: body.description,
      author: body.author,
      category: body.category,
      permissions: body.permissions || [],
      runtime: body.runtime,
      entryUrl: body.runtime === 'iframe' ? body.entryUrl : undefined,
      roles: body.roles || ['admin', 'filmmaker', 'technician', 'designer', 'client', 'user'],
      tags: body.tags || [],
      source: 'marketplace',
      rating: 0,
      installCount: 0,
      publishedAt: Date.now(),
      publisherId: auth.session.uniqueId,
    };

    store.set(listing.id, listing);

    return apiOk({ plugin: listing, message: 'Plugin published successfully' }, 201);
  } catch (error) {
    console.error('[plugins] POST Error:', error);
    return apiInternal();
  }
}
