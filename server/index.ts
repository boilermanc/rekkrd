import 'dotenv/config';
import { validateEnv } from './utils/validateEnv.js';
validateEnv(); // fail fast if env is misconfigured

import * as path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { getSupabaseAdmin } from './lib/supabaseAdmin.js';

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
import setupGuideSaveRouter from './routes/setupGuideSave.js';
import setupGuidePdfRouter from './routes/setupGuidePdf.js';
import supportRouter from './routes/support.js';
import sitemapRouter from './routes/sitemap.js';
import emailRouter from './routes/email.js';
import onboardingRouter from './routes/onboarding.js';
import collectionRouter from './routes/collection.js';
import authRouter from './routes/auth.js';
import discogsRouter from './routes/discogs.js';
import discogsAuthRouter from './routes/discogsAuth.js';
import discogsWantlistRouter from './routes/discogsWantlist.js';
import discogsCollectionRouter from './routes/discogsCollection.js';
import discogsImportRouter from './routes/discogsImport.js';
import discogsPricingRouter from './routes/discogsPricing.js';
import discogsPressingRouter from './routes/discogsPressing.js';
import collectionValueRouter from './routes/collectionValue.js';
import accountRouter from './routes/account.js';
import priceAlertsRouter from './routes/priceAlerts.js';
import alertsCheckRouter from './routes/alertsCheck.js';
import sellrSessionsRouter from './routes/sellrSessions.js';
import sellrRecordsRouter from './routes/sellrRecords.js';
import sellrScanRouter from './routes/sellrScan.js';
import sellrCheckoutRouter from './routes/sellrCheckout.js';
import sellrReportRouter from './routes/sellrReport.js';
import sellrCopyRouter from './routes/sellrCopy.js';
import integrationsRouter from './routes/integrations.js';
import sellrAdminRouter from './routes/sellrAdmin.js';
import sellrAccountRouter from './routes/sellrAccount.js';
import sellrDashboardRouter from './routes/sellrDashboard.js';
import sellrImportRouter from './routes/sellrImport.js';
import sellrLotRouter from './routes/sellrLot.js';
import adminGearCatalogRouter from './routes/adminGearCatalog.js';
import adminGearIdentifyRouter from './routes/adminGearIdentify.js';
import adminGearEnrichRouter from './routes/adminGearEnrich.js';
import stakkdRoomsRouter from './routes/stakkdRooms.js';
import stakkdRoomFeaturesRouter from './routes/stakkdRoomFeatures.js';
import stakkdRoomPlacementRouter from './routes/stakkdRoomPlacement.js';
import stakkdRoomLayoutsRouter from './routes/stakkdRoomLayouts.js';
import analyzeChainRouter from './routes/analyzeChain.js';
import crawlerMeta from './middleware/crawlerMeta.js';
import { validateDiscogsConfig } from './lib/discogs.js';
import { startSellrCron } from './sellrCron.js';

// ── Boot diagnostics: verify all imports resolved ────────────────────
console.log('[boot] All static imports loaded');
validateDiscogsConfig();
const _routerMap: Record<string, unknown> = {
  identifyRouter, metadataRouter, playlistRouter, coversRouter,
  lyricsRouter, uploadCoverRouter, imageProxyRouter, subscriptionRouter,
  checkoutRouter, pricesRouter, stripeWebhookRouter, customerPortalRouter,
  adminRouter, blogRouter, gearRouter, identifyGearRouter,
  findManualRouter, setupGuideRouter, setupGuideSaveRouter, setupGuidePdfRouter, supportRouter, sitemapRouter, emailRouter,
  onboardingRouter, collectionRouter, authRouter, discogsRouter, discogsAuthRouter, discogsCollectionRouter, discogsImportRouter, discogsWantlistRouter, discogsPricingRouter, discogsPressingRouter,
  collectionValueRouter, accountRouter, priceAlertsRouter, alertsCheckRouter,
  sellrSessionsRouter, sellrRecordsRouter, sellrScanRouter, sellrCheckoutRouter, sellrReportRouter,
  sellrAdminRouter, sellrAccountRouter, sellrDashboardRouter, sellrImportRouter, sellrLotRouter, integrationsRouter,
  adminGearCatalogRouter, adminGearIdentifyRouter, adminGearEnrichRouter,
  stakkdRoomsRouter, stakkdRoomFeaturesRouter, stakkdRoomLayoutsRouter, analyzeChainRouter,
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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.stripe.com", "https://challenges.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://*.supabase.co"],
      frameSrc: ["https://js.stripe.com", "https://challenges.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      objectSrc: ["'none'"],
    },
  },
}));

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

// Stripe webhooks need raw body for signature verification — mount BEFORE json parser
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
try { app.use(stripeWebhookRouter); } catch (err) { console.error('[boot] FAILED to mount stripeWebhookRouter:', err); }
app.use('/api/sellr/checkout/webhook', express.raw({ type: 'application/json' }));

// Parse JSON bodies (10mb limit for base64 image payloads) — after webhook route
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  console.log('[health] Health check hit');
  res.json({ status: 'ok' });
});
console.log('[boot] Health check registered');

// API routes — each wrapped in try/catch to detect silent mount failures
function mountRouter(name: string, router: express.Router) {
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
// Setup guide save routes
mountRouter('setupGuideSaveRouter', setupGuideSaveRouter);
// Setup guide PDF export
mountRouter('setupGuidePdfRouter', setupGuidePdfRouter);
mountRouter('supportRouter', supportRouter);
mountRouter('sitemapRouter', sitemapRouter);
mountRouter('emailRouter', emailRouter);
mountRouter('onboardingRouter', onboardingRouter);
mountRouter('collectionRouter', collectionRouter);
mountRouter('authRouter', authRouter);
mountRouter('discogsRouter', discogsRouter);
mountRouter('discogsAuthRouter', discogsAuthRouter);
mountRouter('discogsCollectionRouter', discogsCollectionRouter);
mountRouter('discogsImportRouter', discogsImportRouter);
mountRouter('discogsWantlistRouter', discogsWantlistRouter);
mountRouter('discogsPricingRouter', discogsPricingRouter);
mountRouter('discogsPressingRouter', discogsPressingRouter);
mountRouter('collectionValueRouter', collectionValueRouter);
mountRouter('accountRouter', accountRouter);
mountRouter('priceAlertsRouter', priceAlertsRouter);
mountRouter('alertsCheckRouter', alertsCheckRouter);
mountRouter('sellrSessionsRouter', sellrSessionsRouter);
mountRouter('sellrRecordsRouter', sellrRecordsRouter);
mountRouter('sellrScanRouter', sellrScanRouter);
mountRouter('sellrCheckoutRouter', sellrCheckoutRouter);
mountRouter('sellrReportRouter', sellrReportRouter);
mountRouter('sellrCopyRouter', sellrCopyRouter);
mountRouter('sellrAdminRouter', sellrAdminRouter);
mountRouter('sellrAccountRouter', sellrAccountRouter);
mountRouter('sellrDashboardRouter', sellrDashboardRouter);
mountRouter('sellrImportRouter', sellrImportRouter);
mountRouter('sellrLotRouter', sellrLotRouter);
mountRouter('integrationsRouter', integrationsRouter);
// Admin gear enrich endpoint
mountRouter('adminGearEnrichRouter', adminGearEnrichRouter);
// Admin gear identify endpoint
mountRouter('adminGearIdentifyRouter', adminGearIdentifyRouter);
// Admin gear catalog routes
mountRouter('adminGearCatalogRouter', adminGearCatalogRouter);
// Stakkd Room Planner
mountRouter('stakkdRoomsRouter', stakkdRoomsRouter);
mountRouter('stakkdRoomFeaturesRouter', stakkdRoomFeaturesRouter);
mountRouter('stakkdRoomPlacementRouter', stakkdRoomPlacementRouter);
mountRouter('stakkdRoomLayoutsRouter', stakkdRoomLayoutsRouter);
// Signal chain analysis
mountRouter('analyzeChainRouter', analyzeChainRouter);
console.log('[boot] All routes registered');

// Start Sellr cron jobs
startSellrCron();

// Ensure required storage buckets exist
async function ensureBucket(
  name: string,
  options: { public?: boolean; fileSizeLimit?: number; allowedMimeTypes?: string[] } = {},
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b: { name: string }) => b.name === name);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(name, {
      public: options.public ?? false,
      ...options.fileSizeLimit != null ? { fileSizeLimit: options.fileSizeLimit } : {},
      ...options.allowedMimeTypes ? { allowedMimeTypes: options.allowedMimeTypes } : {},
    });
    if (error) console.error(`[storage] Failed to create bucket "${name}":`, error.message);
    else console.log(`[storage] Created bucket: ${name}`);
  }
}

ensureBucket('gear-photos', { public: true }).catch(err =>
  console.error('[storage] gear-photos bucket check failed:', err),
);
ensureBucket('gear-manuals', {
  public: true,
  fileSizeLimit: 25 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf'],
}).catch(err =>
  console.error('[storage] gear-manuals bucket check failed:', err),
);
ensureBucket('discogs-images', {
  public: true,
  fileSizeLimit: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
}).catch(err =>
  console.error('[storage] discogs-images bucket check failed:', err),
);

// Global error handler — catches next(err) from route handlers
app.use(errorHandler);

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
  console.log(`[boot] Router stack size: ${(app as unknown as Record<string, { stack?: unknown[] }>).router?.stack?.length ?? 'unknown'}`);
});
