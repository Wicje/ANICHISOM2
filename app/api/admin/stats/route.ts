import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET — Admin dashboard stats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // Fetch stats in parallel
    const [
      { count: totalUsers },
      { count: activeUsers24h },
      { count: totalApps },
      { count: pendingReviews },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('marketplace_apps').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('marketplace_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    return NextResponse.json({
      ok: true,
      totalUsers: totalUsers || 0,
      activeUsers24h: activeUsers24h || 0,
      totalApps: totalApps || 0,
      pendingReviews: pendingReviews || 0,
    });
  } catch (error) {
    console.error('[Admin Stats] Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
