import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
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

router.get('/api/blog/admin/posts', requireAdmin, async (_req, res) => {
  try {
    const posts = await getAllPostsAdmin();
    res.json({ posts });
  } catch (error) {
    console.error('Blog admin list error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/api/blog/admin/posts/:slug', requireAdmin, async (req, res) => {
  try {
    const post = await getPostBySlugAdmin(req.params.slug as string);
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

router.post('/api/blog/admin/posts', requireAdmin, async (req, res) => {
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

router.put('/api/blog/admin/posts/:id', requireAdmin, async (req, res) => {
  try {
    const post = await updatePost(req.params.id as string, req.body);
    res.json(post);
  } catch (error) {
    console.error('Blog admin update error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/api/blog/admin/posts/:id', requireAdmin, async (req, res) => {
  try {
    await deletePost(req.params.id as string);
    res.json({ success: true });
  } catch (error) {
    console.error('Blog admin delete error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ── Blog ideas admin routes ─────────────────────────────────────────

router.get('/api/blog/admin/ideas', requireAdmin, async (_req, res) => {
  try {
    const ideas = await getAllIdeas();
    res.json({ ideas });
  } catch (error) {
    console.error('Blog admin ideas list error:', error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

router.post('/api/blog/admin/ideas', requireAdmin, async (req, res) => {
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

// ── Hero image generation ─────────────────────────────────────────

router.post('/api/blog/generate-image', requireAdmin, async (req, res) => {
  const { post_id, title, excerpt } = req.body;
  if (!post_id || typeof post_id !== 'string' || !title || typeof title !== 'string') {
    res.status(400).json({ error: 'post_id and title are required strings' });
    return;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!geminiKey || !supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Server not configured for image generation' });
    return;
  }

  try {
    // Step 1: Generate image prompt via Gemini text model
    const promptResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: 'Create a detailed image generation prompt for a blog hero image for Rekkrd, a vinyl record collection app. Respond with ONLY the image prompt text, nothing else.',
            }],
          },
          contents: [{
            parts: [{
              text: `Blog title: ${title}\n${excerpt ? `Excerpt: ${excerpt}\n` : ''}Style requirements: warm retro/vintage aesthetic with burnt peach and blue-slate tones, hand-drawn or illustrated feel NOT photorealistic, related to vinyl records/music/collecting culture, NO text or words in the image, landscape 16:9 aspect ratio.`,
            }],
          }],
        }),
      }
    );
    if (!promptResp.ok) {
      console.error('Gemini prompt generation failed:', promptResp.status, await promptResp.text());
      res.status(500).json({ error: 'Failed to generate image prompt' });
      return;
    }
    const promptData = await promptResp.json();
    const imagePrompt = promptData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!imagePrompt) {
      console.error('Gemini prompt response had no text:', JSON.stringify(promptData));
      res.status(500).json({ error: 'Failed to generate image prompt' });
      return;
    }

    // Step 2: Generate image via Gemini image model
    const imageResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            image_config: { aspect_ratio: '16:9' },
          },
        }),
      }
    );
    if (!imageResp.ok) {
      console.error('Gemini image generation failed:', imageResp.status, await imageResp.text());
      res.status(500).json({ error: 'Failed to generate image' });
      return;
    }
    const imageData = await imageResp.json();
    const parts = imageData?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData?.data);
    if (!imagePart) {
      console.error('Gemini image response had no image data:', JSON.stringify(imageData).slice(0, 500));
      res.status(500).json({ error: 'Failed to generate image' });
      return;
    }
    const { data: base64Data, mimeType } = imagePart.inlineData;

    // Step 3: Fetch post slug for filename
    const postResp = await fetch(
      `${supabaseUrl}/rest/v1/blog_posts?id=eq.${post_id}&select=slug`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    if (!postResp.ok) {
      console.error('Failed to fetch post slug:', postResp.status);
      res.status(500).json({ error: 'Failed to fetch post' });
      return;
    }
    const postRows = await postResp.json();
    const slug = postRows?.[0]?.slug;
    if (!slug) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Step 4: Upload to Supabase Storage
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const filename = `${slug}-hero.${ext}`;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const uploadResp = await fetch(
      `${supabaseUrl}/storage/v1/object/blog-images/${filename}`,
      {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: imageBuffer,
      }
    );
    if (!uploadResp.ok) {
      console.error('Supabase storage upload failed:', uploadResp.status, await uploadResp.text());
      res.status(500).json({ error: 'Failed to upload image' });
      return;
    }

    // Step 5: Update blog post with image URL and prompt
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/blog-images/${filename}`;
    const updateResp = await fetch(
      `${supabaseUrl}/rest/v1/blog_posts?id=eq.${post_id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ featured_image: publicUrl, image_prompt: imagePrompt }),
      }
    );
    if (!updateResp.ok) {
      console.error('Blog post update failed:', updateResp.status, await updateResp.text());
      // Image was uploaded — still return the URL even if DB update failed
    }

    res.json({ featured_image: publicUrl, image_prompt: imagePrompt });
  } catch (error) {
    console.error('Blog image generation error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
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
    res.status(500).json({ error: 'Failed to create post' });
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
