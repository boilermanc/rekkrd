import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Disable body parsing for webhook signature verification
export const config = {
  api: { bodyParser: false },
};

function mapStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    trialing: 'trialing',
    active: 'active',
    canceled: 'canceled',
    past_due: 'past_due',
    incomplete: 'incomplete',
    incomplete_expired: 'expired',
    unpaid: 'past_due',
  };
  return map[stripeStatus] || 'incomplete';
}

async function getTierFromSubscription(subscription: Stripe.Subscription): Promise<string> {
  const item = subscription.items.data[0];
  if (!item) return 'collector';

  const productId = typeof item.price.product === 'string'
    ? item.price.product
    : item.price.product.id;

  const product = await stripe.products.retrieve(productId);
  return product.metadata?.tier || 'collector';
}

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) {
          console.warn('Webhook: no supabase_user_id in subscription metadata');
          break;
        }

        const tier = await getTierFromSubscription(subscription);

        // Access period timestamps from items or subscription object
        const subAny = subscription as unknown as Record<string, unknown>;
        const periodStart = typeof subAny.current_period_start === 'number'
          ? new Date(subAny.current_period_start * 1000).toISOString()
          : null;
        const periodEnd = typeof subAny.current_period_end === 'number'
          ? new Date(subAny.current_period_end * 1000).toISOString()
          : null;
        const trialEnd = typeof subscription.trial_end === 'number'
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;

        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            plan: tier,
            status: mapStatus(subscription.status),
            ...(periodStart && { current_period_start: periodStart }),
            ...(periodEnd && { current_period_end: periodEnd }),
            trial_end: trialEnd,
          })
          .eq('user_id', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) break;

        // Downgrade to free tier
        await supabase
          .from('subscriptions')
          .update({
            plan: 'collector',
            status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('user_id', userId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny = invoice as unknown as Record<string, unknown>;
        const rawSub = invoiceAny.subscription;
        const subscriptionId = typeof rawSub === 'string'
          ? rawSub
          : (rawSub as Record<string, unknown> | null)?.id as string | undefined;
        if (!subscriptionId) break;

        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}
