/**
 * Waitlist API — Collect beta access requests
 *
 * POST /api/waitlist — Submit email for beta access
 * GET  /api/waitlist — List all waitlist entries (admin only)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { apiOk, apiError, apiInternal, checkRouteRateLimit } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'AUTH_LOGIN');
    if (rl) return rl;

    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return apiError('Valid email address required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const supabase = await createClient();

    // Check if already on waitlist
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id, status')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      if (existing.status === 'invited') {
        return apiError('You already have an invite. Check your email.');
      }
      if (existing.status === 'approved') {
        return apiError('Your access has already been approved. Check your email for the invite code.');
      }
      return apiOk({ message: 'You are already on the waitlist. We will notify you when spots open up.', status: existing.status });
    }

    const { error } = await supabase.from('waitlist').insert({
      email: normalizedEmail,
      name: name?.trim() || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[waitlist] Insert error:', error.message);
      return apiInternal('Failed to join waitlist');
    }

    return apiOk({ message: 'Added to waitlist. We will reach out when a spot opens up.' });
  } catch (error) {
    console.error('[waitlist] Error:', error);
    return apiInternal();
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError('Unauthorized', 401);
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return apiError('Forbidden', 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, invited, rejected

    let query = supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return apiInternal('Failed to fetch waitlist');
    }

    return apiOk({ entries: data || [], total: data?.length || 0 });
  } catch (error) {
    console.error('[waitlist] GET error:', error);
    return apiInternal();
  }
}
