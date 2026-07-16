/**
 * Plugin API — Marketplace listing and publishing
 *
 * GET  /api/plugins         — List all published plugins (optional ?search= & ?category=)
 * POST /api/plugins         — Publish a new plugin (auth required)
 */

import { NextRequest } from 'next/server';
import { requireAuth, checkRouteRateLimit, apiOk, apiError, apiInternal } from '@/lib/api-helpers';
import { createClient } from '@/utils/supabase/server';
import { getPluginStore, PluginListing } from './store';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'PLUGINS');
    if (rl) return rl;

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search')?.toLowerCase();
    const category = searchParams.get('category');

    let results = await getPluginStore();

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
    const auth = await requireAuth(request, 'PLUGINS');
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const requiredFields = ['name', 'description'];
    for (const field of requiredFields) {
      if (!(field in body)) {
        return apiError(`Missing required field: ${field}`);
      }
    }

    // Validate entryUrl for SSRF if iframe runtime
    if (body.runtime === 'iframe' && body.entryUrl) {
      try {
        const entryUrl = new URL(body.entryUrl);
        if (entryUrl.protocol !== 'https:') {
          return apiError('entryUrl must use HTTPS', 400);
        }
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

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('plugins')
      .insert({
        name: body.name,
        description: body.description || '',
        developer: auth.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[plugins] POST Supabase error:', error.message);
      return apiInternal();
    }

    return apiOk({ plugin: data, message: 'Plugin published successfully' }, 201);
  } catch (error) {
    console.error('[plugins] POST Error:', error);
    return apiInternal();
  }
}
