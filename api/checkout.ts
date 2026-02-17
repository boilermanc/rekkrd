import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { cors } from './_cors';
import { requireAuthWithUser } from './_auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'POST')) return;
  const auth = await requireAuthWithUser(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId } = req.body;
  if (!priceId || typeof priceId !== 'string') {
    return res.status(400).json({ error: 'Missing priceId' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user already has a Stripe customer ID
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', auth.userId)
      .single();

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      // Get user email from Supabase Auth
      const { data: { user } } = await supabase.auth.admin.getUserById(auth.userId);

      // Create a Stripe customer
      const customer = await stripe.customers.create({
        email: user?.email ?? undefined,
        metadata: { supabase_user_id: auth.userId },
      });
      customerId = customer.id;

      // Save Stripe customer ID to subscription record
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', auth.userId);
    }

    const origin = req.headers.origin || process.env.ALLOWED_ORIGINS?.split(',')[0] || 'https://rekkrd.com';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=canceled`,
      subscription_data: {
        metadata: { supabase_user_id: auth.userId },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
