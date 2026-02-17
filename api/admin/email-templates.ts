import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { cors } from '../_cors';
import { requireAdmin } from '../_adminAuth';

export const config = { maxDuration: 15 };

let _admin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _admin;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'GET, POST, PUT, DELETE')) return;

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const supabase = getSupabaseAdmin();

  try {
    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        return res.status(200).json(data || []);
      }

      case 'POST': {
        const { name, subject, html_body } = req.body;
        if (!name || !subject || !html_body) {
          return res.status(400).json({ error: 'name, subject, and html_body are required' });
        }

        const { data, error } = await supabase
          .from('email_templates')
          .insert([{ name, subject, html_body }])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json(data);
      }

      case 'PUT': {
        const { id, ...updates } = req.body;
        if (!id) return res.status(400).json({ error: 'id is required' });

        const allowedFields = ['name', 'subject', 'html_body'];
        const safeUpdates: Record<string, unknown> = {};
        for (const key of allowedFields) {
          if (key in updates) safeUpdates[key] = updates[key];
        }

        const { data, error } = await supabase
          .from('email_templates')
          .update(safeUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json(data);
      }

      case 'DELETE': {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'id is required' });

        const { error } = await supabase
          .from('email_templates')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return res.status(204).end();
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Email templates error:', err);
    return res.status(500).json({ error: 'Email template operation failed' });
  }
}
