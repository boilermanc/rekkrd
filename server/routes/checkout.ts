import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { stripe } from '../lib/stripe.js';
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

    if (!isKnownPriceId(priceId)) {
      res.status(400).json({ error: 'Unknown price ID' });
      return;
    }

    try {
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
      const hasExistingSubscription = !!sub?.stripe_subscription_id;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: { supabase_user_id: userId },
          ...(!hasExistingSubscription && { trial_period_days: TRIAL_DAYS }),
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
