import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { getStripe } from '../lib/stripe.js';
import { isKnownPriceId } from '../lib/stripeConfig.js';

const router = Router();

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

router.post(
  '/api/checkout',
  requireAuthWithUser,
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;
    const { action } = req.body;

    // Billing portal flow
    if (action === 'billing-portal') {
      try {
        const supabase = getSupabaseAdmin();

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', userId)
          .single();

        if (!sub?.stripe_customer_id) {
          res.status(400).json({ error: 'No billing account found' });
          return;
        }

        const appUrl = process.env.APP_URL || 'https://rekkrd.com';

        const stripe = await getStripe();
        const session = await stripe.billingPortal.sessions.create({
          customer: sub.stripe_customer_id,
          return_url: appUrl,
        });

        res.status(200).json({ url: session.url });
        return;
      } catch (error) {
        console.error('Billing portal error:', error);
        res.status(500).json({ error: 'Failed to create billing portal session' });
        return;
      }
    }

    // Checkout flow
    const { priceId } = req.body;
    if (!priceId || typeof priceId !== 'string') {
      res.status(400).json({ error: 'Missing priceId' });
      return;
    }

    if (!(await isKnownPriceId(priceId))) {
      res.status(400).json({ error: 'Unknown price ID' });
      return;
    }

    try {
      const stripe = await getStripe();
      const supabase = getSupabaseAdmin();

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('user_id', userId)
        .single();

      let customerId = sub?.stripe_customer_id;

      if (!customerId) {
        const { data: { user } } = await supabase.auth.admin.getUserById(userId);

        const customer = await stripe.customers.create({
          email: user?.email ?? undefined,
          metadata: { supabase_user_id: userId },
        });
        customerId = customer.id;

        await supabase
          .from('subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', userId);
      }

      // Ensure profiles table has the customer ID (needed for webhook lookups)
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);

      const appUrl = process.env.APP_URL || 'https://rekkrd.com';

      // No Stripe trial — trial is app-managed (DB trigger on signup).
      // User pays immediately when they subscribe.
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: { supabase_user_id: userId },
        },
        success_url: `${appUrl}/?checkout=success`,
        cancel_url: `${appUrl}/?checkout=canceled`,
        allow_promotion_codes: true,
      });

      res.status(200).json({ url: session.url });
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
);

// ── Embedded subscribe flow (PaymentElement, no redirect) ───────────
router.post(
  '/api/subscribe',
  requireAuthWithUser,
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;
    const { priceId } = req.body;

    if (!priceId || typeof priceId !== 'string') {
      res.status(400).json({ error: 'Missing priceId' });
      return;
    }

    if (!(await isKnownPriceId(priceId))) {
      res.status(400).json({ error: 'Unknown price ID' });
      return;
    }

    try {
      const stripe = await getStripe();
      const supabase = getSupabaseAdmin();

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('user_id', userId)
        .single();

      let customerId = sub?.stripe_customer_id;

      if (!customerId) {
        const { data: { user } } = await supabase.auth.admin.getUserById(userId);
        const customer = await stripe.customers.create({
          email: user?.email ?? undefined,
          metadata: { supabase_user_id: userId },
        });
        customerId = customer.id;

        await supabase
          .from('subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', userId);
      }

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);

      // Cancel ALL non-active subscriptions for this customer in Stripe
      // (trialing, incomplete, past_due) to avoid duplicates
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
      });
      for (const existingSub of existingSubs.data) {
        if (['trialing', 'incomplete', 'past_due', 'incomplete_expired'].includes(existingSub.status)) {
          try {
            await stripe.subscriptions.cancel(existingSub.id);
          } catch (e) {
            console.warn(`Could not cancel subscription ${existingSub.id}:`, e);
          }
        }
      }

      // Clear local subscription reference since we canceled everything
      if (sub?.stripe_subscription_id) {
        await supabase
          .from('subscriptions')
          .update({ stripe_subscription_id: null, status: 'canceled' })
          .eq('user_id', userId);
      }

      // Remove any saved payment methods so Stripe doesn't auto-charge
      // and instead returns an incomplete payment intent for the frontend
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      for (const pm of paymentMethods.data) {
        await stripe.paymentMethods.detach(pm.id);
      }

      // Clear the customer's default payment method if they have one
      if (paymentMethods.data.length > 0) {
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: '' },
        });
      }

      // Create subscription with incomplete payment
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card'],
        },
        metadata: { supabase_user_id: userId },
        expand: ['latest_invoice.payment_intent'],
      });

      // If subscription is already active (e.g. $0 invoice), treat as success
      if (subscription.status === 'active') {
        const billingInterval = subscription.items.data[0]?.price?.recurring?.interval || null;
        if (billingInterval) {
          await supabase
            .from('subscriptions')
            .update({ billing_interval: billingInterval })
            .eq('user_id', userId);
        }
        res.status(200).json({ alreadyActive: true, subscriptionId: subscription.id });
        return;
      }

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const rawPI = invoice?.payment_intent;
      let paymentIntent: Stripe.PaymentIntent | null = null;

      if (rawPI && typeof rawPI === 'object') {
        // Expansion worked — we have the full PaymentIntent object
        paymentIntent = rawPI as Stripe.PaymentIntent;
      } else if (typeof rawPI === 'string') {
        // Got a string ID instead of expanded object — retrieve directly
        paymentIntent = await stripe.paymentIntents.retrieve(rawPI);
      } else if (invoice?.id) {
        // No payment_intent at all — re-fetch the invoice with expansion
        const expandedInvoice = await stripe.invoices.retrieve(invoice.id, {
          expand: ['payment_intent'],
        });
        const expandedPI = expandedInvoice.payment_intent;
        if (expandedPI && typeof expandedPI === 'object') {
          paymentIntent = expandedPI as Stripe.PaymentIntent;
        } else if (typeof expandedPI === 'string') {
          paymentIntent = await stripe.paymentIntents.retrieve(expandedPI);
        }

        // New Stripe API (2025+) doesn't auto-create PaymentIntent — create one explicitly
        if (!paymentIntent && expandedInvoice?.amount_due) {
          paymentIntent = await stripe.paymentIntents.create({
            amount: expandedInvoice.amount_due,
            currency: expandedInvoice.currency ?? 'usd',
            customer: customerId,
            payment_method_types: ['card'],
            metadata: {
              subscription_id: subscription.id,
              invoice_id: expandedInvoice.id,
              supabase_user_id: userId,
            },
          });
        }
      }

      const clientSecret = paymentIntent?.client_secret;

      if (!clientSecret) {
        console.error('Subscribe: missing client_secret after fallback', {
          subscriptionId: subscription.id,
          invoiceId: invoice?.id,
          paymentIntentId: paymentIntent?.id,
          rawPIType: typeof rawPI,
        });
        return res.status(500).json({ error: 'Failed to create payment intent' });
      }

      res.status(200).json({
        clientSecret,
        subscriptionId: subscription.id,
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  }
);

// ── Activate subscription (client-side fallback when webhook is slow) ─
router.post(
  '/api/subscription/activate',
  requireAuthWithUser,
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;
    const { subscriptionId } = req.body;

    if (!subscriptionId || typeof subscriptionId !== 'string') {
      res.status(400).json({ error: 'Missing subscriptionId' });
      return;
    }

    try {
      const supabase = getSupabaseAdmin();

      // Verify the subscription exists and belongs to this user
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, plan')
        .eq('user_id', userId)
        .single();

      if (!sub || sub.stripe_subscription_id !== subscriptionId) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }

      // Verify with Stripe that it's actually active or has a successful payment
      const stripe = await getStripe();
      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

      if (!['active', 'incomplete'].includes(stripeSub.status)) {
        res.status(400).json({ error: 'Subscription not active' });
        return;
      }

      // Activate in DB
      await supabase.from('subscriptions').update({
        status: 'active',
      }).eq('user_id', userId);

      console.log(`[activate] user ${userId} → active`);
      res.json({ success: true });
    } catch (err) {
      console.error('[activate] error:', err);
      res.status(500).json({ error: 'Failed to activate' });
    }
  }
);

export default router;
