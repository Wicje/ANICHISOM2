import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Stripe webhook signature verification would go here
// For now, this is a placeholder that handles key events

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = body.type;

    // In production, verify the webhook signature:
    // const sig = request.headers.get('stripe-signature');
    // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    const supabase = await createClient();

    switch (eventType) {
      case 'checkout.session.completed': {
        const session = body.data?.object;
        const userId = session?.metadata?.userId;
        const tierId = session?.metadata?.tierId;

        if (userId && tierId) {
          // Update user's subscription in Supabase
          const { error } = await supabase
            .from('users')
            .update({
              subscription_tier: tierId,
              subscription_status: 'active',
              subscription_id: session.subscription,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) {
            console.error('[Webhook] Failed to update user subscription:', error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = body.data?.object;
        const userId = subscription?.metadata?.userId;
        const status = subscription?.status;

        if (userId) {
          const { error } = await supabase
            .from('users')
            .update({
              subscription_status: status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) {
            console.error('[Webhook] Failed to update subscription status:', error);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = body.data?.object;
        const userId = subscription?.metadata?.userId;

        if (userId) {
          const { error } = await supabase
            .from('users')
            .update({
              subscription_tier: 'free',
              subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) {
            console.error('[Webhook] Failed to cancel subscription:', error);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = body.data?.object;
        const userId = invoice?.metadata?.userId;

        if (userId) {
          const { error } = await supabase
            .from('users')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) {
            console.error('[Webhook] Failed to update payment failed status:', error);
          }
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ ok: false, error: 'Webhook handler failed' }, { status: 500 });
  }
}
