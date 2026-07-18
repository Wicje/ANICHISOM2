import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // In production, create a Stripe Customer Portal session:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const portalSession = await stripe.billingPortal.sessions.create({
    //   customer: session.user.id, // or stripeCustomerId
    //   return_url: `${origin}/settings/billing`,
    // });

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const portalUrl = `${origin}/settings/billing`;

    return NextResponse.json({
      ok: true,
      url: portalUrl,
      // url: portalSession.url,
    });
  } catch (error) {
    console.error('[Portal] Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create portal session' }, { status: 500 });
  }
}
