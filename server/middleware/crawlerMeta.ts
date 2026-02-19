import type { Request, Response, NextFunction } from 'express';
import { getPostBySlug } from '../services/blogService.js';

const BOT_PATTERN =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot/i;

function cleanImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/^=+/, '');
}

function renderHtml(meta: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  bodyHtml?: string;
}): string {
  const ogType = meta.type || 'website';
  const imageTag = meta.image
    ? `<meta property="og:image" content="${meta.image}" />\n    <meta name="twitter:image" content="${meta.image}" />`
    : '';
  const urlTag = meta.url
    ? `<meta property="og:url" content="${meta.url}" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:type" content="${ogType}" />
    ${imageTag}
    ${urlTag}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${meta.title}" />
    <meta name="twitter:description" content="${meta.description}" />
</head>
<body>
    ${meta.bodyHtml || ''}
</body>
</html>`;
}

export default function crawlerMeta(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') {
    next();
    return;
  }

  const ua = req.headers['user-agent'] || '';
  if (!BOT_PATTERN.test(ua)) {
    next();
    return;
  }

  // Skip API routes and static assets
  if (req.path.startsWith('/api/') || req.path.match(/\.\w+$/)) {
    next();
    return;
  }

  const blogSlugMatch = req.path.match(/^\/blog\/([^/]+)$/);

  if (blogSlugMatch) {
    const slug = blogSlugMatch[1];
    getPostBySlug(slug)
      .then(post => {
        if (!post) {
          next();
          return;
        }
        const image = cleanImage(post.featured_image);
        const description = post.excerpt || `Read ${post.title} on the Rekkrd blog.`;
        res.send(
          renderHtml({
            title: `${post.title} | Rekkrd`,
            description,
            image,
            type: 'article',
            bodyHtml: `<h1>${post.title}</h1>${post.excerpt ? `<p>${post.excerpt}</p>` : ''}`,
          }),
        );
      })
      .catch(() => {
        next();
      });
    return;
  }

  if (req.path === '/blog' || req.path === '/blog/') {
    res.send(
      renderHtml({
        title: 'Blog | Rekkrd',
        description: 'Tips, guides, and stories for vinyl collectors and audiophiles.',
      }),
    );
    return;
  }

  if (req.path === '/' || req.path === '') {
    res.send(
      renderHtml({
        title: 'Rekkrd — Your Vinyl Collection, Elevated',
        description: 'Scan, catalog, and explore your vinyl record collection with AI-powered tools.',
      }),
    );
    return;
  }

  // All other routes
  res.send(
    renderHtml({
      title: 'Rekkrd',
      description: 'Your vinyl collection, elevated.',
    }),
  );
}
