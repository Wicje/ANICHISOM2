/**
 * Plugin API — Marketplace listing and publishing
 *
 * GET  /api/plugins         — List all published plugins (optional ?search= & ?category=)
 * POST /api/plugins         — Publish a new plugin (auth required)
 *
 * In-memory store for development. Swap to Firestore/PostgreSQL for production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/session-store';
import { getPluginStore, PluginListing } from './store';

// ─── GET /api/plugins — List all published plugins ──────────────────────

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({ plugins: results, total: results.length });
  } catch (error) {
    console.error('[plugins] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/plugins — Publish a new plugin ──────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const sessionCookie = request.cookies.get('anichisom_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sessionData = resolveSession(sessionCookie.value);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['id', 'name', 'version', 'description', 'author', 'category', 'runtime', 'permissions'];
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Validate runtime
    if (!['iframe', 'native'].includes(body.runtime)) {
      return NextResponse.json({ error: 'runtime must be "iframe" or "native"' }, { status: 400 });
    }

    // Check for duplicate ID
    const store = getPluginStore();
    if (store.has(body.id)) {
      return NextResponse.json({ error: `Plugin with id "${body.id}" already exists` }, { status: 409 });
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
      publisherId: sessionData.uniqueId,
    };

    store.set(listing.id, listing);

    return NextResponse.json({ plugin: listing, message: 'Plugin published successfully' }, { status: 201 });
  } catch (error) {
    console.error('[plugins] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}