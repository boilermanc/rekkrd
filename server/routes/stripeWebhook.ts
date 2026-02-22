import { Router } from 'express';
import type Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { stripe, webhookSecret } from '../lib/stripe.js';
import { getPlanFromPriceId } from '../lib/stripeConfig.js';
import { sendTemplatedEmail } from '../services/emailService.js';

const router = Router();

function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Extract customer ID string from various Stripe object shapes. */
function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  return customer.id;
}

/** Map Stripe subscription status to our profile status values. */
function mapStatus(stripeStatus: string): 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive' {
  const map: Record<string, 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive'> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    incomplete: 'inactive',
    incomplete_expired: 'inactive',
    unpaid: 'past_due',
  };
  return map[stripeStatus] || 'inactive';
}

/** Map internal plan tier to user-facing display name. */
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  curator: 'Curator',
  enthusiast: 'Enthusiast',
};

/** Look up a user's profile by their Stripe customer ID. Returns the profile row or null. */
async function findProfileByCustomerId(
  supabase: SupabaseClient,
  customerId: string
): Promise<{ id: string; stripe_subscription_id: string | null } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, stripe_subscription_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !data) return null;
  return data as { id: string; stripe_subscription_id: string | null };
}

// This route expects raw body for Stripe signature verification.
// It is mounted BEFORE express.json() in server/index.ts via express.raw().
router.post('/api/stripe-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.warn('Webhook: missing stripe-signature header');
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  console.log(`Stripe webhook received: ${event.type} (${event.id})`);

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = extractCustomerId(session.customer);
        if (!customerId) {
          console.warn('Webhook checkout.session.completed: no customer ID');
          break;
        }

        const profile = await findProfileByCustomerId(supabase, customerId);
        if (!profile) {
          console.warn(`Webhook checkout.session.completed: no profile for customer ${customerId}`);
          break;
        }

        // Retrieve the full subscription to get price and status details
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

        if (!subscriptionId) {
          console.warn('Webhook checkout.session.completed: no subscription ID on session');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subRaw = subscription as unknown as Record<string, unknown>;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? getPlanFromPriceId(priceId) : 'collector';
        const status = mapStatus(subscription.status);
        const periodEnd = typeof subRaw.current_period_end === 'number'
          ? new Date(subRaw.current_period_end * 1000).toISOString()
          : null;

        await supabase
          .from('profiles')
          .update({
            stripe_subscription_id: subscriptionId,
            ...(periodEnd && { plan_period_end: periodEnd }),
          })
          .eq('stripe_customer_id', customerId);

        // Update subscriptions table (source of truth for plan/status)
        const userId = profile.id;
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscriptionId,
            plan,
            status: subscription.status === 'trialing' ? 'trialing' : 'active',
            ...(periodEnd && { current_period_end: periodEnd }),
          })
          .eq('user_id', userId);

        console.log(`Webhook checkout.session.completed: profile ${profile.id} → plan=${plan}, status=${status}`);

        // Fire-and-forget: subscription confirmation email
        const checkoutEmail = session.customer_details?.email || session.customer_email;
        if (checkoutEmail && plan !== 'collector') {
          const planName = PLAN_DISPLAY_NAMES[plan] || 'Premium';
          sendTemplatedEmail({
            to: checkoutEmail,
            presetId: 'subscription-confirmed',
            variableOverrides: {
              headline: `Welcome to ${planName}`,
              subject: `You're upgraded — welcome to ${planName} ✨`,
            },
          })
            .then(result => result && console.log('[email] Subscription confirmed sent to', checkoutEmail))
            .catch(err => console.error('[email] Subscription confirmed failed:', err));
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = extractCustomerId(subscription.customer);
        if (!customerId) {
          console.warn('Webhook customer.subscription.updated: no customer ID');
          break;
        }

        const profile = await findProfileByCustomerId(supabase, customerId);
        if (!profile) {
          console.warn(`Webhook customer.subscription.updated: no profile for customer ${customerId}`);
          break;
        }

        const subRaw2 = subscription as unknown as Record<string, unknown>;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? getPlanFromPriceId(priceId) : 'collector';
        const status = mapStatus(subscription.status);
        const periodEnd = typeof subRaw2.current_period_end === 'number'
          ? new Date(subRaw2.current_period_end * 1000).toISOString()
          : null;

        if (periodEnd) {
          await supabase
            .from('profiles')
            .update({ plan_period_end: periodEnd })
            .eq('stripe_customer_id', customerId);
        }

        // Update subscriptions table (source of truth for plan/status)
        await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            plan,
            status: mapStatus(subscription.status),
            ...(periodEnd && { current_period_end: periodEnd }),
          })
          .eq('user_id', profile.id);

        console.log(`Webhook customer.subscription.updated: profile ${profile.id} → plan=${plan}, status=${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = extractCustomerId(subscription.customer);
        if (!customerId) {
          console.warn('Webhook customer.subscription.deleted: no customer ID');
          break;
        }

        const profile = await findProfileByCustomerId(supabase, customerId);
        if (!profile) {
          console.warn(`Webhook customer.subscription.deleted: no profile for customer ${customerId}`);
          break;
        }

        const deletedAt = new Date().toISOString();

        await supabase
          .from('profiles')
          .update({
            stripe_subscription_id: null,
            plan_period_end: deletedAt,
          })
          .eq('stripe_customer_id', customerId);

        // Update subscriptions table (source of truth for plan/status)
        await supabase
          .from('subscriptions')
          .update({
            plan: 'collector',
            status: 'canceled',
            stripe_subscription_id: null,
            current_period_end: deletedAt,
          })
          .eq('user_id', profile.id);

        console.log(`Webhook customer.subscription.deleted: profile ${profile.id} → plan=collector, status=inactive`);

        // Fire-and-forget: subscription cancelled email
        stripe.customers.retrieve(customerId)
          .then(customer => {
            if (customer.deleted || !('email' in customer) || !customer.email) return;
            sendTemplatedEmail({ to: customer.email, presetId: 'subscription-cancelled' })
              .then(result => result && console.log('[email] Subscription cancelled sent to', customer.email))
              .catch(err => console.error('[email] Subscription cancelled failed:', err));
          })
          .catch(err => console.error('[email] Could not retrieve customer for cancellation email:', err));

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = extractCustomerId(invoice.customer);
        if (!customerId) {
          console.warn('Webhook invoice.payment_failed: no customer ID');
          break;
        }

        const profile = await findProfileByCustomerId(supabase, customerId);
        if (!profile) {
          console.warn(`Webhook invoice.payment_failed: no profile for customer ${customerId}`);
          break;
        }

        // Update subscriptions table (source of truth for status)
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('user_id', profile.id);

        console.error(`Webhook invoice.payment_failed: profile ${profile.id}, customer ${customerId}`);
        break;
      }

      default:
        console.log(`Webhook unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    res.status(200).json({ received: true });
  }
});

export default router;
