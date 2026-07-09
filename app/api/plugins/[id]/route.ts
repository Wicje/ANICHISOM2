/**
 * Plugin API — Single plugin operations
 *
 * GET    /api/plugins/[id]  — Get a specific plugin by ID
 * DELETE /api/plugins/[id]  — Remove a plugin (auth required, publisher only)
 *
 * Shares the in-memory store from app/api/plugins/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/session-store';

// Re-export the plugin store type
interface PluginListing {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  permissions: string[];
  runtime: 'iframe' | 'native';
  entryUrl?: string;
  roles: string[];
  tags: string[];
  source: string;
  rating: number;
  installCount: number;
  publishedAt: number;
  publisherId: string;
}

// Shared in-memory store — import not possible from sibling route, so we
// use a module-level singleton that both routes import.
// This is a dev-only approach; production swaps to Firestore.
import { getPluginStore } from '../store';

// ─── GET /api/plugins/[id] — Get a single plugin ───────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getPluginStore();
    const plugin = store.get(id);

    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    return NextResponse.json({ plugin });
  } catch (error) {
    console.error('[plugins/id] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/plugins/[id] — Remove a plugin ────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const store = getPluginStore();
    const plugin = store.get(id);

    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    // Only the publisher or an admin can delete
    if (plugin.publisherId !== sessionData.uniqueId && sessionData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — you are not the publisher of this plugin' }, { status: 403 });
    }

    store.delete(id);

    return NextResponse.json({ message: 'Plugin removed successfully' });
  } catch (error) {
    console.error('[plugins/id] DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}