import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, value, rating, delta, id, url, userAgent, timestamp } = body;

    if (!name || typeof value !== 'number') {
      return NextResponse.json({ ok: false, error: 'Invalid metrics' }, { status: 400 });
    }

    // In production, store in Supabase or send to analytics
    // For now, log to console
    if (process.env.NODE_ENV === 'production') {
      console.log(`[Vitals] ${name}: ${value.toFixed(1)}ms (${rating}) — ${url}`);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to process metrics' }, { status: 500 });
  }
}
