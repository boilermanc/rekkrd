import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Route imports
import identifyRouter from './routes/identify.js';
import metadataRouter from './routes/metadata.js';
import playlistRouter from './routes/playlist.js';
import coversRouter from './routes/covers.js';
import lyricsRouter from './routes/lyrics.js';
import uploadCoverRouter from './routes/uploadCover.js';
import imageProxyRouter from './routes/imageProxy.js';
import subscriptionRouter from './routes/subscription.js';
import checkoutRouter from './routes/checkout.js';
import pricesRouter from './routes/prices.js';
import stripeWebhookRouter from './routes/stripeWebhook.js';
import customerPortalRouter from './routes/customerPortal.js';
import adminRouter from './routes/admin.js';
import blogRouter from './routes/blog.js';
import gearRouter from './routes/gear.js';
import identifyGearRouter from './routes/identifyGear.js';
import findManualRouter from './routes/findManual.js';
import setupGuideRouter from './routes/setupGuide.js';
import supportRouter from './routes/support.js';
import sitemapRouter from './routes/sitemap.js';
import emailRouter from './routes/email.js';
import onboardingRouter from './routes/onboarding.js';
import collectionRouter from './routes/collection.js';
import authRouter from './routes/auth.js';
import crawlerMeta from './middleware/crawlerMeta.js';

// ── Boot diagnostics: verify all imports resolved ────────────────────
console.log('[boot] All static imports loaded');
const _routerMap: Record<string, unknown> = {
  identifyRouter, metadataRouter, playlistRouter, coversRouter,
  lyricsRouter, uploadCoverRouter, imageProxyRouter, subscriptionRouter,
  checkoutRouter, pricesRouter, stripeWebhookRouter, customerPortalRouter,
  adminRouter, blogRouter, gearRouter, identifyGearRouter,
  findManualRouter, setupGuideRouter, supportRouter, sitemapRouter, emailRouter,
  onboardingRouter, collectionRouter, authRouter,
};
for (const [name, r] of Object.entries(_routerMap)) {
  if (typeof r !== 'function') {
    console.error(`[boot] PROBLEM: ${name} is ${typeof r}, expected function`);
  }
}

// Catch uncaught errors that might silently break routing
process.on('uncaughtException', (err) => {
  console.error('[fatal] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] Unhandled rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 3001;

// ── Request logger (first middleware — before helmet/cors) ───────────
app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.url}`);
  next();
});

// Security headers
app.use(helmet());

// CORS — use ALLOWED_ORIGINS env var (comma-separated), fallback to localhost
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173'];

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));

// Stripe webhook needs raw body for signature verification — mount BEFORE json parser
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));
try { app.use(stripeWebhookRouter); } catch (err) { console.error('[boot] FAILED to mount stripeWebhookRouter:', err); }

// Parse JSON bodies (10mb limit for base64 image payloads) — after webhook route
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  console.log('[health] Health check hit');
  res.json({ status: 'ok' });
});
console.log('[boot] Health check registered');

// API routes — each wrapped in try/catch to detect silent mount failures
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mountRouter(name: string, router: any) {
  try {
    app.use(router);
  } catch (err) {
    console.error(`[boot] FAILED to mount ${name}:`, err);
  }
}

mountRouter('identifyRouter', identifyRouter);
mountRouter('metadataRouter', metadataRouter);
mountRouter('playlistRouter', playlistRouter);
mountRouter('coversRouter', coversRouter);
mountRouter('lyricsRouter', lyricsRouter);
mountRouter('uploadCoverRouter', uploadCoverRouter);
mountRouter('imageProxyRouter', imageProxyRouter);
mountRouter('subscriptionRouter', subscriptionRouter);
mountRouter('checkoutRouter', checkoutRouter);
mountRouter('customerPortalRouter', customerPortalRouter);
mountRouter('pricesRouter', pricesRouter);
mountRouter('adminRouter', adminRouter);
mountRouter('blogRouter', blogRouter);
mountRouter('gearRouter', gearRouter);
mountRouter('identifyGearRouter', identifyGearRouter);
mountRouter('findManualRouter', findManualRouter);
mountRouter('setupGuideRouter', setupGuideRouter);
mountRouter('supportRouter', supportRouter);
mountRouter('sitemapRouter', sitemapRouter);
mountRouter('emailRouter', emailRouter);
mountRouter('onboardingRouter', onboardingRouter);
mountRouter('collectionRouter', collectionRouter);
mountRouter('authRouter', authRouter);
console.log('[boot] All routes registered');

// Ensure gear-photos storage bucket exists
async function ensureGearPhotosBucket() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(url, key);

  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b: { name: string }) => b.name === 'gear-photos');

  if (!exists) {
    const { error } = await admin.storage.createBucket('gear-photos', { public: true });
    if (error) {
      console.error('Failed to create gear-photos bucket:', error.message);
    } else {
      console.log('Created gear-photos storage bucket');
    }
  }
}

ensureGearPhotosBucket().catch(err =>
  console.error('gear-photos bucket check failed:', err)
);

// Ensure gear-manuals storage bucket exists
async function ensureGearManualsBucket() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(url, key);

  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b: { name: string }) => b.name === 'gear-manuals');

  if (!exists) {
    const { error } = await admin.storage.createBucket('gear-manuals', {
      public: true,
      fileSizeLimit: 25 * 1024 * 1024, // 25 MB
      allowedMimeTypes: ['application/pdf'],
    });
    if (error) {
      console.error('Failed to create gear-manuals bucket:', error.message);
    } else {
      console.log('Created gear-manuals storage bucket');
    }
  }
}

ensureGearManualsBucket().catch(err =>
  console.error('gear-manuals bucket check failed:', err)
);

// Crawler/bot meta tag pre-rendering — before static files + SPA fallback
app.use(crawlerMeta);

// Serve static files from the Vite build output
const distPath = path.join(__dirname, '..', 'dist');
console.log(`[boot] distPath = ${distPath}`);
if (!existsSync(distPath)) {
  console.warn(`[boot] WARNING: dist directory does not exist at ${distPath}`);
} else if (!existsSync(path.join(distPath, 'index.html'))) {
  console.warn(`[boot] WARNING: dist/index.html does not exist`);
}
app.use(express.static(distPath));

// SPA fallback — serve index.html for all non-API routes so React Router handles client-side routing
app.get('/{*splat}', (_req, res) => {
  console.log(`[spa] Fallback hit: ${_req.method} ${_req.url}`);
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`[boot] Node ${process.version} | __dirname=${__dirname}`);
  console.log(`[boot] Router stack size: ${(app as any).router?.stack?.length ?? 'unknown'}`);
});
