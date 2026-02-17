import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { cors } from './_cors';

// Simple in-memory cache (survives for the life of the serverless instance)
let cachedPrices: unknown = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'GET')) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(200).json({ tiers: {} });
  }

  // No auth required — pricing is public info

  const now = Date.now();
  if (cachedPrices && now < cacheExpiry) {
    return res.status(200).json(cachedPrices);
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 20,
    });

    const tiers: Record<string, { monthly?: object; annual?: object; name: string }> = {};

    for (const price of prices.data) {
      const product = price.product as Stripe.Product;
      if (typeof product === 'string' || !product.active) continue;

      const tier = product.metadata?.tier;
      if (!tier) continue;

      if (!tiers[tier]) {
        tiers[tier] = { name: product.name };
      }

      const interval = price.recurring?.interval;
      const priceData = {
        priceId: price.id,
        amount: price.unit_amount, // in cents
        currency: price.currency,
        interval,
      };

      if (interval === 'month') {
        tiers[tier].monthly = priceData;
      } else if (interval === 'year') {
        tiers[tier].annual = priceData;
      }
    }

    const response = { tiers };
    cachedPrices = response;
    cacheExpiry = now + CACHE_TTL_MS;

    return res.status(200).json(response);
  } catch (error) {
    console.error('Stripe prices error:', error);
    return res.status(500).json({ error: 'Failed to fetch prices' });
  }
}
