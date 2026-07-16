/**
 * Plugin API — Single plugin operations
 *
 * GET    /api/plugins/[id]  — Get a specific plugin by ID
 * DELETE /api/plugins/[id]  — Remove a plugin (auth required, publisher only)
 *
 * Shares the in-memory store from app/api/plugins/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requireSession,
  apiOk,
  apiNotFound,
  apiForbidden,
  apiInternal,
} from '@/lib/api-helpers';

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
      return apiNotFound('Plugin not found');
    }

    return apiOk({ plugin });
  } catch (error) {
    console.error('[plugins/id] GET Error:', error);
    return apiInternal();
  }
}

// ─── DELETE /api/plugins/[id] — Remove a plugin ────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireSession(request);
    if (!authResult.ok) return authResult.response;

    const userId = authResult.userId;
    const userRole = authResult.userRole;

    const { id } = await params;
    const store = getPluginStore();
    const plugin = store.get(id);

    if (!plugin) {
      return apiNotFound('Plugin not found');
    }

    // Only the publisher or an admin can delete
    if (plugin.publisherId !== userId && userRole !== 'admin') {
      return apiForbidden('Forbidden — you are not the publisher of this plugin');
    }

    store.delete(id);

    return apiOk({ message: 'Plugin removed successfully' });
  } catch (error) {
    console.error('[plugins/id] DELETE Error:', error);
    return apiInternal();
  }
}