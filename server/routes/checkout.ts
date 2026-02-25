import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { getStripe } from '../lib/stripe.js';
import { isKnownPriceId, TRIAL_DAYS } from '../lib/stripeConfig.js';

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
    const { priceId, skipTrial } = req.body;
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
      let hasExistingSubscription = !!sub?.stripe_subscription_id;
      let canceledTrial = false;

      // If user has a trialing subscription, cancel it so checkout creates
      // a clean new subscription instead of a duplicate
      if (hasExistingSubscription && sub?.stripe_subscription_id) {
        try {
          const existingSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
          if (existingSub.status === 'trialing') {
            await stripe.subscriptions.cancel(sub.stripe_subscription_id);
            await supabase
              .from('subscriptions')
              .update({ stripe_subscription_id: null, status: 'canceled' })
              .eq('user_id', userId);
            hasExistingSubscription = false;
            canceledTrial = true;
          }
        } catch (e) {
          // Subscription may not exist in Stripe anymore — clear it locally
          console.warn('Could not retrieve existing subscription, clearing:', e);
          await supabase
            .from('subscriptions')
            .update({ stripe_subscription_id: null })
            .eq('user_id', userId);
          hasExistingSubscription = false;
        }
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: { supabase_user_id: userId },
          ...(!hasExistingSubscription && !skipTrial && !canceledTrial && { trial_period_days: TRIAL_DAYS }),
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

export default router;
