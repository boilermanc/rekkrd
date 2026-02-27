import { Router } from 'express';
import { requireAuthWithUser } from '../middleware/auth.js';
import {
  getPublishedPosts,
  getPostBySlug,
  getPostBySlugAdmin,
  getAllPostsAdmin,
  createPost,
  updatePost,
  deletePost,
  createIdea,
  getAllIdeas,
  getCategories,
  getPopularTags,
} from '../services/blogService.js';

const router = Router();

// ── Admin routes (before :slug catch-all) ──────────────────────────

router.get('/api/blog/admin/posts', requireAuthWithUser, async (_req, res) => {
  try {
    const posts = await getAllPostsAdmin();
    res.json({ posts });
  } catch (error) {
    console.error('Blog admin list error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/api/blog/admin/posts/:slug', requireAuthWithUser, async (req, res) => {
  try {
    const post = await getPostBySlugAdmin(req.params.slug);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json(post);
  } catch (error) {
    console.error('Blog admin get error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

router.post('/api/blog/admin/posts', requireAuthWithUser, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || typeof title !== 'string' || !body || typeof body !== 'string') {
      res.status(400).json({ error: 'title and body are required strings' });
      return;
    }
    const post = await createPost(req.body);
    res.status(201).json(post);
  } catch (error) {
    console.error('Blog admin create error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.put('/api/blog/admin/posts/:id', requireAuthWithUser, async (req, res) => {
  try {
    const post = await updatePost(req.params.id, req.body);
    res.json(post);
  } catch (error) {
    console.error('Blog admin update error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/api/blog/admin/posts/:id', requireAuthWithUser, async (req, res) => {
  try {
    await deletePost(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Blog admin delete error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ── Blog ideas admin routes ─────────────────────────────────────────

router.get('/api/blog/admin/ideas', requireAuthWithUser, async (_req, res) => {
  try {
    const ideas = await getAllIdeas();
    res.json({ ideas });
  } catch (error) {
    console.error('Blog admin ideas list error:', error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

router.post('/api/blog/admin/ideas', requireAuthWithUser, async (req, res) => {
  try {
    const { idea } = req.body;
    if (!idea || typeof idea !== 'string' || !idea.trim()) {
      res.status(400).json({ error: 'idea is required' });
      return;
    }
    const created = await createIdea({
      idea: idea.trim(),
      tags: req.body.tags ?? [],
      status: 'pending',
      source: 'admin',
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('Blog admin idea create error:', error);
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

// ── n8n webhook (separate API key auth) ────────────────────────────

router.post('/api/blog/webhook', async (req, res) => {
  const secret = process.env.BLOG_API_KEY;
  if (!secret) {
    res.status(500).json({ error: 'BLOG_API_KEY not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { title, body } = req.body;
    if (!title || typeof title !== 'string' || !body || typeof body !== 'string') {
      res.status(400).json({ error: 'title and body are required strings' });
      return;
    }

    // n8n posts go live immediately unless status is explicitly set
    const input = { ...req.body, status: req.body.status ?? 'published' };
    const post = await createPost(input);
    res.status(201).json(post);
  } catch (error) {
    console.error('Blog webhook error:', error);
    res.status(500).json({ error: 'Failed to create post', details: error instanceof Error ? error.message : String(error) });
  }
});

// ── Public routes (after admin/webhook to avoid :slug catching them) ─

router.get('/api/blog', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const tag = req.query.tag as string | undefined;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const { posts, total } = await getPublishedPosts({ limit, offset, tag, category, search });
    res.json({ posts, total, limit, offset });
  } catch (error) {
    console.error('Blog list error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/api/blog/categories', async (_req, res) => {
  try {
    const categories = await getCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Blog categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/api/blog/tags', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const tags = await getPopularTags(limit);
    res.json({ tags });
  } catch (error) {
    console.error('Blog tags error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

router.get('/api/blog/:slug', async (req, res) => {
  try {
    const post = await getPostBySlug(req.params.slug);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json(post);
  } catch (error) {
    console.error('Blog get error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

export default router;
