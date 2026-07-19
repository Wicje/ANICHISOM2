import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRouteRateLimit } from '@/lib/api-helpers';

// POST — Receive and store vitals metrics (rate-limited, anonymous OK)
export async function POST(request: NextRequest) {
  try {
    const rl = checkRouteRateLimit(request, 'VITALS');
    if (rl) return rl;

    const body = await request.json();
    const { name, value, rating, delta, id, url, userAgent, timestamp } = body;

    if (!name || typeof value !== 'number') {
      return NextResponse.json({ ok: false, error: 'Invalid metrics' }, { status: 400 });
    }

    // Store in Supabase
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('vitals_metrics').insert({
        id: id || crypto.randomUUID(),
        user_id: user?.id || null,
        name,
        value,
        rating,
        delta,
        url: url || null,
        user_agent: userAgent || null,
        recorded_at: new Date(timestamp || Date.now()).toISOString(),
      });
    } catch {
      // Non-fatal: vitals storage is best-effort
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to process metrics' }, { status: 500 });
  }
}

// GET — Query vitals metrics (admin only)
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

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric'); // CLS, LCP, INP, etc.
    const hours = parseInt(searchParams.get('hours') || '24');
    const limit = parseInt(searchParams.get('limit') || '100');

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('vitals_metrics')
      .select('*')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (metric) {
      query = query.eq('name', metric);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: 'Failed to fetch vitals' }, { status: 500 });
    }

    // Compute aggregates
    const metrics = data || [];
    const aggregated: Record<string, { avg: number; p75: number; p95: number; count: number; good: number; needsImprovement: number; poor: number }> = {};

    for (const m of metrics) {
      if (!aggregated[m.name]) {
        aggregated[m.name] = { avg: 0, p75: 0, p95: 0, count: 0, good: 0, needsImprovement: 0, poor: 0 };
      }
      const a = aggregated[m.name]!;
      a.count++;
      if (m.rating === 'good') a.good++;
      else if (m.rating === 'needs-improvement') a.needsImprovement++;
      else a.poor++;
    }

    // Calculate averages and percentiles
    for (const name of Object.keys(aggregated)) {
      const values = metrics.filter(m => m.name === name).map(m => m.value).sort((a, b) => a - b);
      const a = aggregated[name]!;
      a.avg = values.reduce((s, v) => s + v, 0) / values.length;
      a.p75 = values[Math.floor(values.length * 0.75)] || 0;
      a.p95 = values[Math.floor(values.length * 0.95)] || 0;
    }

    return NextResponse.json({ ok: true, metrics: aggregated, raw: metrics });
  } catch (error) {
    console.error('[Vitals API] Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch vitals' }, { status: 500 });
  }
}
