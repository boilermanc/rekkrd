import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import {
  searchGearCatalog,
  getGearCatalogEntry,
  createGearCatalogEntry,
  updateGearCatalogEntry,
  deleteGearCatalogEntry,
  approveGearCatalogEntry,
} from '../services/gearCatalogService.js';

const router = Router();

// ── Search / list ─────────────────────────────────────────────────────
async function handleSearch(req: Request, res: Response) {
  const q = (req.query.q as string) || '';
  const category = req.query.category as string | undefined;
  const approvedRaw = (req.query.approved as string) ?? 'all';
  const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  let approved: boolean | undefined;
  if (approvedRaw === 'true') approved = true;
  else if (approvedRaw === 'false') approved = false;

  const result = await searchGearCatalog(q, { category, approved, limit, offset });

  if (result.error) {
    res.status(500).json({ error: result.error });
    return;
  }

  res.json({ data: result.data, total: result.total });
}

// ── Get single entry ──────────────────────────────────────────────────
async function handleGet(req: Request, res: Response) {
  const id = req.params.id as string;
  const result = await getGearCatalogEntry(id);

  if (result.error) {
    res.status(500).json({ error: result.error });
    return;
  }

  if (!result.data) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.json(result.data);
}

// ── Create ────────────────────────────────────────────────────────────
async function handleCreate(req: Request, res: Response) {
  const { brand, model } = req.body;

  if (!brand || typeof brand !== 'string' || !brand.trim()) {
    res.status(400).json({ error: 'brand is required' });
    return;
  }
  if (!model || typeof model !== 'string' || !model.trim()) {
    res.status(400).json({ error: 'model is required' });
    return;
  }

  const result = await createGearCatalogEntry(req.body);

  if (result.error) {
    res.status(500).json({ error: result.error });
    return;
  }

  res.status(201).json(result.data);
}

// ── Update (partial patch) ────────────────────────────────────────────
async function handleUpdate(req: Request, res: Response) {
  const id = req.params.id as string;
  const result = await updateGearCatalogEntry(id, req.body);

  if (result.error) {
    res.status(500).json({ error: result.error });
    return;
  }

  if (!result.data) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.json(result.data);
}

// ── Approve / unapprove ──────────────────────────────────────────────
async function handleApprove(req: Request, res: Response) {
  const id = req.params.id as string;
  const { approved } = req.body;

  if (typeof approved !== 'boolean') {
    res.status(400).json({ error: 'approved must be a boolean' });
    return;
  }

  const result = await approveGearCatalogEntry(id, approved);

  if (result.error) {
    res.status(500).json({ error: result.error });
    return;
  }

  if (!result.data) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.json(result.data);
}

// ── Delete ────────────────────────────────────────────────────────────
async function handleDelete(req: Request, res: Response) {
  const id = req.params.id as string;
  const result = await deleteGearCatalogEntry(id);

  if (result.error) {
    res.status(500).json({ error: result.error });
    return;
  }

  res.status(204).end();
}

// ── Route definitions ─────────────────────────────────────────────────
router.get('/api/admin/gear-catalog', requireAdmin, async (req, res, next) => {
  try { await handleSearch(req, res); } catch (err) { next(err); }
});

router.get('/api/admin/gear-catalog/:id', requireAdmin, async (req, res, next) => {
  try { await handleGet(req, res); } catch (err) { next(err); }
});

router.post('/api/admin/gear-catalog', requireAdmin, async (req, res, next) => {
  try { await handleCreate(req, res); } catch (err) { next(err); }
});

router.patch('/api/admin/gear-catalog/:id', requireAdmin, async (req, res, next) => {
  try { await handleUpdate(req, res); } catch (err) { next(err); }
});

router.patch('/api/admin/gear-catalog/:id/approve', requireAdmin, async (req, res, next) => {
  try { await handleApprove(req, res); } catch (err) { next(err); }
});

router.delete('/api/admin/gear-catalog/:id', requireAdmin, async (req, res, next) => {
  try { await handleDelete(req, res); } catch (err) { next(err); }
});

export default router;
