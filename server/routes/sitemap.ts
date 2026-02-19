import { Router } from 'express';
import { getPublishedPosts } from '../services/blogService.js';

const router = Router();

const SITE_URL = (process.env.SITE_URL || 'https://rekkrd.com').replace(/\/$/, '');

// ── robots.txt ────────────────────────────────────────────────────────
router.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  );
});

// ── sitemap.xml ───────────────────────────────────────────────────────
router.get('/sitemap.xml', async (_req, res) => {
  try {
    const { posts } = await getPublishedPosts({ limit: 1000, offset: 0 });

    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'weekly' },
      { loc: '/blog', priority: '0.8', changefreq: 'daily' },
      { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
      { loc: '/terms', priority: '0.3', changefreq: 'yearly' },
      { loc: '/support', priority: '0.5', changefreq: 'monthly' },
    ];

    const urls = staticPages.map(
      (p) =>
        `  <url>\n    <loc>${SITE_URL}${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
    );

    for (const post of posts) {
      const lastmod = post.updated_at
        ? `\n    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>`
        : '';
      urls.push(
        `  <url>\n    <loc>${SITE_URL}/blog/${post.slug}</loc>${lastmod}\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('[sitemap] Failed to generate sitemap:', err);
    res.status(500).set('Content-Type', 'application/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
    );
  }
});

export default router;
