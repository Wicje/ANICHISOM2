/**
 * Plugin API — Single plugin operations
 *
 * GET    /api/plugins/[id]  — Get a specific plugin by ID
 * DELETE /api/plugins/[id]  — Remove a plugin (auth required, publisher only)
 *
 * Uses Supabase for persistence.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requireSession,
  apiOk,
  apiNotFound,
  apiForbidden,
  apiInternal,
} from '@/lib/api-helpers';
import { createClient } from '@/utils/supabase/server';

// ─── GET /api/plugins/[id] — Get a single plugin ───────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('plugins')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return apiNotFound('Plugin not found');
    }

    return apiOk({ plugin: data });
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
    const supabase = await createClient();

    // Check plugin exists and publisher ownership
    const { data: plugin, error: fetchError } = await supabase
      .from('plugins')
      .select('developer')
      .eq('id', id)
      .single();

    if (fetchError || !plugin) {
      return apiNotFound('Plugin not found');
    }

    // Only the publisher or an admin can delete
    if (plugin.developer !== userId && userRole !== 'admin') {
      return apiForbidden('Forbidden — you are not the publisher of this plugin');
    }

    const { error: deleteError } = await supabase
      .from('plugins')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[plugins/id] DELETE Supabase error:', deleteError.message);
      return apiInternal();
    }

    return apiOk({ message: 'Plugin removed successfully' });
  } catch (error) {
    console.error('[plugins/id] DELETE Error:', error);
    return apiInternal();
  }
}