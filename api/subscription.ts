import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from './_cors';
import { requireAuthWithUser } from './_auth';
import { getSubscription } from './_subscription';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'GET')) return;
  const auth = await requireAuthWithUser(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sub = await getSubscription(auth.userId);
  return res.status(200).json(sub);
}
