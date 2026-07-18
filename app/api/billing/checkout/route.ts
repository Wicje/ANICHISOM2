import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Pricing lookup — maps tier ID + interval to Stripe Price ID
// In production, these would come from your Stripe dashboard
const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
  },
  team: {
    monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || 'price_team_monthly',
    yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || 'price_team_yearly',
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { tierId, interval = 'monthly' } = await request.json();

    if (!tierId || !PRICE_IDS[tierId]) {
      return NextResponse.json({ ok: false, error: 'Invalid tier' }, { status: 400 });
    }

    if (tierId === 'free') {
      return NextResponse.json({ ok: false, error: 'Free tier does not require checkout' }, { status: 400 });
    }

    const priceId = PRICE_IDS[tierId]?.[interval];
    if (!priceId) {
      return NextResponse.json({ ok: false, error: 'Invalid interval' }, { status: 400 });
    }

    // In production, create a Stripe Checkout Session here:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const checkoutSession = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   customer_email: session.user.email,
    //   line_items: [{ price: priceId, quantity: 1 }],
    //   success_url: `${origin}/settings/billing?success=true`,
    //   cancel_url: `${origin}/settings/billing?canceled=true`,
    //   metadata: { userId: session.user.id, tierId },
    // });

    // For now, return a mock checkout URL
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const checkoutUrl = `${origin}/settings/billing?success=true&tier=${tierId}`;

    return NextResponse.json({
      ok: true,
      url: checkoutUrl,
      // sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create checkout session' }, { status: 500 });
  }
}
