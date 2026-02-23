# Email System — Replication Guide

> Everything you need to build a full admin email system from scratch in another project.
> Based on the Rekkrd implementation. Adapt names, colors, and presets for your app.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Environment Variables](#3-environment-variables)
4. [Database Migration](#4-database-migration)
5. [Email Service](#5-email-service)
6. [Email Presets](#6-email-presets)
7. [API Routes — Public Email Endpoints](#7-api-routes--public-email-endpoints)
8. [API Routes — Admin Email Endpoints](#8-api-routes--admin-email-endpoints)
9. [Admin Auth Middleware](#9-admin-auth-middleware)
10. [HTML Email Templates](#10-html-email-templates)
11. [Frontend — Admin Service (API Client)](#11-frontend--admin-service-api-client)
12. [Frontend — EmailsPage (Admin Panel)](#12-frontend--emailspage-admin-panel)
13. [Frontend — EmailComposer](#13-frontend--emailcomposer)
14. [Triggering Emails from App Logic](#14-triggering-emails-from-app-logic)
15. [Customization Checklist](#15-customization-checklist)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN UI (React)                         │
│                                                                 │
│  EmailsPage (3 tabs)          EmailComposer                     │
│  ├─ Templates tab             ├─ Step A: Pick preset            │
│  │  (CRUD custom templates)   ├─ Step B: Pick template          │
│  ├─ Send Test tab             └─ Step C: Edit fields +          │
│  │  (raw HTML send)                      live preview + send    │
│  └─ Compose tab                                                 │
│      (uses EmailComposer)                                       │
└──────────────────┬──────────────────────────────────────────────┘
                   │ fetch()
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER (API)                          │
│                                                                 │
│  Public routes (server/routes/email.ts)                         │
│  ├─ GET  /api/email/presets          → list all presets         │
│  ├─ GET  /api/email/presets/:id      → single preset            │
│  ├─ GET  /api/email/templates/:id    → raw HTML template        │
│  └─ POST /api/email/send-test        → process + send (admin)   │
│                                                                 │
│  Admin routes (server/routes/admin.ts)                          │
│  ├─ GET/POST/PUT/DELETE /api/admin/email-templates              │
│  └─ POST /api/admin/send-email       → raw send (admin)         │
│                                                                 │
│  Email Service (server/services/emailService.ts)                │
│  ├─ sendTemplatedEmail()  → preset lookup → template → Resend   │
│  └─ sendRawEmail()        → direct HTML → Resend                │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────┐    ┌──────────────────────────┐
│         Resend API           │    │     Supabase (DB)        │
│  (sends the actual emails)   │    │  email_templates table   │
└──────────────────────────────┘    └──────────────────────────┘
```

**Two template tracks run in parallel:**
- **Preset library** (code-based) — hardcoded presets in `emailPresets.ts`, each referencing an HTML template file and default variables. Used by the Composer.
- **Custom templates** (DB-based) — user-created templates stored in Supabase `email_templates` table. Used by the Templates tab and Send Test tab.

---

## 2. Prerequisites

| Dependency | Purpose |
|-----------|---------|
| [Resend](https://resend.com) account + API key | Email delivery provider |
| [Supabase](https://supabase.com) project | Database (PostgreSQL) + auth |
| Express.js | API server |
| React + TailwindCSS | Admin UI |
| TypeScript | Type safety across all layers |

**npm packages (server):**
```bash
npm install resend @supabase/supabase-js express
npm install -D @types/express typescript
```

**npm packages (frontend):**
```bash
npm install react react-dom
npm install -D @types/react tailwindcss vite
```

---

## 3. Environment Variables

### Backend (Node.js — `process.env.*`)

| Variable | Purpose | Example |
|----------|---------|---------|
| `RESEND_API_KEY` | Resend API key | `re_1234abcd...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin ops) | `eyJ...` |
| `API_SECRET` | Bearer token for auth | `your-secret-token` |

### Frontend (Vite — `import.meta.env.VITE_*`)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_API_SECRET` | Bearer token for API calls |

> **Important:** Never use `process.env` in Vite frontend code. Use `import.meta.env.VITE_*`.

---

## 4. Database Migration

Run this SQL in the Supabase SQL Editor to create the custom templates table:

```sql
-- 1. Add role column to profiles (skip if you already have roles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- 2. Set your admin user
UPDATE profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin@example.com');

-- 3. Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS — only admins can manage
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email_templates"
  ON email_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();
```

---

## 5. Email Service

**File:** `server/services/emailService.ts`

This is the core sending layer. It provides two functions:
- `sendTemplatedEmail()` — looks up a preset, reads the matching HTML file, merges variables, and sends
- `sendRawEmail()` — sends pre-built HTML directly (for admin send-test)

```typescript
import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPresetById } from '../data/emailPresets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_FROM = 'YourApp <noreply@yourapp.com>';

// ── Template constants ──────────────────────────────────────────────

const VALID_TEMPLATE_IDS = ['light', 'orange', 'dark-blue'] as const;
type TemplateId = (typeof VALID_TEMPLATE_IDS)[number];

const TEMPLATE_FILE_MAP: Record<TemplateId, string> = {
  light: 'email-template-light.html',
  orange: 'email-template-orange.html',
  'dark-blue': 'email-template-dark-blue.html',
};

// ── Resend client (lazy-init) ───────────────────────────────────────

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY not configured — email sending disabled');
    return null;
  }

  resendClient = new Resend(key);
  return resendClient;
}

// ── Template helpers ────────────────────────────────────────────────

function readTemplate(templateId: TemplateId): string {
  const filePath = join(__dirname, '..', 'templates', 'email', TEMPLATE_FILE_MAP[templateId]);
  return readFileSync(filePath, 'utf-8');
}

function processTemplate(html: string, variables: Record<string, string>): string {
  let result = html;
  // Replace {{year}} with current year
  result = result.replace(/\{\{year\}\}/g, new Date().getFullYear().toString());
  // Replace all other {{variable}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }
  return result;
}

/**
 * Process the {{#unsubscribe}}...{{/unsubscribe}} conditional block.
 *
 * - Marketing/engagement emails that are NOT automated: keep the unsubscribe link
 * - Transactional/operational or automated emails: remove the entire block
 */
export function processUnsubscribeBlock(
  html: string,
  category: string,
  automated: boolean,
): string {
  const showUnsubscribe =
    (category === 'marketing' || category === 'engagement') && !automated;

  if (showUnsubscribe) {
    return html
      .replace(/\{\{#unsubscribe\}\}/g, '')
      .replace(/\{\{\/unsubscribe\}\}/g, '');
  }
  return html.replace(/\{\{#unsubscribe\}\}[\s\S]*?\{\{\/unsubscribe\}\}/g, '');
}

// ── Public API ──────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  presetId: string;
  variableOverrides?: Record<string, string>;
  from?: string;
}

export interface SendRawEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send a templated email using a preset definition.
 * Returns the Resend response on success, null on failure (never throws).
 */
export async function sendTemplatedEmail(options: SendEmailOptions) {
  const resend = getResend();
  if (!resend) return null;

  const preset = getPresetById(options.presetId);
  if (!preset) {
    console.error(`[email] Preset not found: "${options.presetId}"`);
    return null;
  }

  try {
    const rawHtml = readTemplate(preset.templateId);

    // Merge preset defaults with caller overrides (overrides win)
    const merged: Record<string, string> = { ...preset.variables };
    if (options.variableOverrides) {
      Object.assign(merged, options.variableOverrides);
    }

    let html = processTemplate(rawHtml, merged);
    html = processUnsubscribeBlock(html, preset.category, preset.automated);

    const subject = merged.subject ?? preset.variables.subject;
    const from = options.from ?? DEFAULT_FROM;

    const result = await resend.emails.send({
      from,
      to: [options.to],
      subject,
      html,
    });

    if (result.error) {
      console.error(`[email] Resend error for preset "${options.presetId}":`, result.error.message);
      return null;
    }

    console.log(`[email] Sent "${options.presetId}" to ${options.to} (id: ${result.data?.id})`);
    return result.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[email] Failed to send preset "${options.presetId}":`, message);
    return null;
  }
}

/**
 * Send a raw email with pre-built HTML (no preset lookup).
 * Returns the Resend response on success, null on failure (never throws).
 */
export async function sendRawEmail(options: SendRawEmailOptions) {
  const resend = getResend();
  if (!resend) return null;

  try {
    const from = options.from ?? DEFAULT_FROM;

    const result = await resend.emails.send({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    });

    if (result.error) {
      console.error('[email] Resend error (raw send):', result.error.message);
      return null;
    }

    console.log(`[email] Sent raw email to ${options.to} (id: ${result.data?.id})`);
    return result.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[email] Failed to send raw email:', message);
    return null;
  }
}
```

### Key design decisions:

- **Lazy-init Resend client** — if `RESEND_API_KEY` isn't set, email is silently disabled (doesn't crash the server)
- **Never throws** — both functions return `null` on failure with console logging. Callers don't need try/catch.
- **Variable merge** — preset variables are defaults, caller `variableOverrides` win on conflict
- **Unsubscribe block** — conditional `{{#unsubscribe}}...{{/unsubscribe}}` syntax. Marketing/engagement non-automated emails keep the block, everything else strips it.

---

## 6. Email Presets

**File:** `server/data/emailPresets.ts`

Presets are a code-based library of email definitions. Each preset maps to an HTML template and includes default variable values.

### TypeScript Interface

```typescript
export interface EmailPreset {
  id: string;
  name: string;
  category: 'transactional' | 'engagement' | 'marketing' | 'operational';
  description: string;
  templateId: 'light' | 'orange' | 'dark-blue';
  automated: boolean;   // true = auto-sent by app logic, false = manual from admin
  variables: {
    preheader_text: string;
    headline: string;
    hero_body: string;
    body_content: string;
    cta_text: string;
    cta_url: string;
    secondary_content: string;
    subject: string;
    feature_1_label?: string;   // dark-blue template only
    feature_1_text?: string;
    feature_2_label?: string;
    feature_2_text?: string;
  };
}

export const presetCategories = ['transactional', 'engagement', 'marketing', 'operational'] as const;
```

### Example Presets

```typescript
export const emailPresets: EmailPreset[] = [
  // TRANSACTIONAL — automated
  {
    id: 'welcome',
    name: 'Welcome',
    category: 'transactional',
    description: 'Sent automatically after signup and onboarding completion',
    templateId: 'orange',
    automated: true,
    variables: {
      subject: 'Welcome to YourApp!',
      preheader_text: 'Your journey starts now.',
      headline: 'Welcome to YourApp',
      hero_body: "You're in. Let's get started.",
      body_content: 'Here is what you can do with your new account...',
      cta_text: 'Get Started',
      cta_url: 'https://yourapp.com',
      secondary_content: 'Need help? Email support@yourapp.com',
    },
  },

  // ENGAGEMENT — automated
  {
    id: 'monthly-digest',
    name: 'Monthly Digest',
    category: 'engagement',
    description: 'Sent automatically at month-end with activity summary',
    templateId: 'light',
    automated: true,
    variables: {
      subject: 'Your {{month}} recap',
      preheader_text: "Here's how things went this month.",
      headline: 'Your Month in Review',
      hero_body: 'Another month in the books.',
      body_content: 'Your activity summary for {{month}}...',
      cta_text: 'View Dashboard',
      cta_url: 'https://yourapp.com/dashboard',
      secondary_content: 'Keep it up!',
    },
  },

  // MARKETING — manual (admin sends from Composer)
  {
    id: 'upgrade-nudge',
    name: 'Upgrade Nudge',
    category: 'marketing',
    description: 'Sent manually to users approaching free tier limits',
    templateId: 'orange',
    automated: false,
    variables: {
      subject: 'Ready for more?',
      preheader_text: 'Unlock the full experience.',
      headline: 'Ready for Unlimited?',
      hero_body: "You're getting close to your free tier limits.",
      body_content: 'Upgrade to get unlimited access...',
      cta_text: 'See Plans',
      cta_url: 'https://yourapp.com/pricing',
      secondary_content: 'No pressure — your data is safe.',
    },
  },

  // OPERATIONAL — manual
  {
    id: 'changelog',
    name: 'Changelog',
    category: 'operational',
    description: 'Monthly roundup of shipped features',
    templateId: 'dark-blue',
    automated: false,
    variables: {
      subject: "What's new — {{month}} {{year}}",
      preheader_text: "Here's what shipped this month.",
      headline: '{{month}} Updates',
      hero_body: 'Another round of improvements.',
      body_content: 'Here are the highlights...',
      cta_text: "See What's New",
      cta_url: 'https://yourapp.com',
      feature_1_label: 'Shipped',
      feature_1_text: 'Key features and fixes this month.',
      feature_2_label: 'Up Next',
      feature_2_text: "What's on the roadmap.",
      secondary_content: 'Have a feature request? Email us.',
    },
  },
];

export const getPresetById = (id: string): EmailPreset | undefined =>
  emailPresets.find((p) => p.id === id);
```

### Category system

| Category | Purpose | Unsubscribe link? |
|----------|---------|-------------------|
| `transactional` | Account events (welcome, subscription) | No |
| `engagement` | Activity-based (milestones, digests) | Only if `automated: false` |
| `marketing` | Upsells, win-back, announcements | Only if `automated: false` |
| `operational` | Changelogs, status updates | No |

The `automated` flag determines whether the unsubscribe block is shown. Automated emails (triggered by app logic) don't get unsubscribe links. Manual emails (sent from admin Composer) do.

---

## 7. API Routes — Public Email Endpoints

**File:** `server/routes/email.ts`

These endpoints serve the preset library and HTML templates to the frontend Composer. The `send-test` endpoint requires admin auth.

```typescript
import { Router, type Request, type Response } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { requireAdmin } from '../middleware/adminAuth.js';
import { emailPresets, getPresetById } from '../data/emailPresets.js';
import { processUnsubscribeBlock, sendRawEmail } from '../services/emailService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const VALID_TEMPLATE_IDS = ['light', 'orange', 'dark-blue'] as const;
type TemplateId = (typeof VALID_TEMPLATE_IDS)[number];

const TEMPLATE_FILE_MAP: Record<TemplateId, string> = {
  light: 'email-template-light.html',
  orange: 'email-template-orange.html',
  'dark-blue': 'email-template-dark-blue.html',
};

function isValidTemplateId(id: string): id is TemplateId {
  return VALID_TEMPLATE_IDS.includes(id as TemplateId);
}

function readTemplate(templateId: TemplateId): string {
  const filePath = join(__dirname, '..', 'templates', 'email', TEMPLATE_FILE_MAP[templateId]);
  return readFileSync(filePath, 'utf-8');
}

function processTemplate(html: string, variables: Record<string, string>): string {
  let result = html;
  result = result.replace(/\{\{year\}\}/g, new Date().getFullYear().toString());
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }
  return result;
}

// ── GET /api/email/presets ────────────────────────────────────────────
router.get('/api/email/presets', (_req: Request, res: Response) => {
  res.json(emailPresets);
});

// ── GET /api/email/presets/:presetId ─────────────────────────────────
router.get('/api/email/presets/:presetId', (req: Request, res: Response) => {
  const preset = getPresetById(req.params.presetId as string);
  if (!preset) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }
  res.json(preset);
});

// ── GET /api/email/templates/:templateId ─────────────────────────────
// Returns raw HTML — used by Composer for live preview
router.get('/api/email/templates/:templateId', (req: Request, res: Response) => {
  const templateId = req.params.templateId as string;

  if (!isValidTemplateId(templateId)) {
    res.status(404).json({ error: 'Template not found. Valid IDs: light, orange, dark-blue' });
    return;
  }

  try {
    const html = readTemplate(templateId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error(`[email] Failed to read template "${templateId}":`, err);
    res.status(500).json({ error: 'Failed to read template file' });
  }
});

// ── POST /api/email/send-test ────────────────────────────────────────
// Processes template with variables + sends via Resend — requires admin
router.post('/api/email/send-test', requireAdmin, async (req: Request, res: Response) => {
  const { templateId, variables, to, subject, presetId } = req.body;

  if (!templateId || !isValidTemplateId(templateId)) {
    res.status(400).json({ error: 'Valid templateId required (light, orange, dark-blue)' });
    return;
  }
  if (!variables || typeof variables !== 'object') {
    res.status(400).json({ error: 'variables object required' });
    return;
  }
  if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({ error: 'Valid email address required' });
    return;
  }
  if (!subject || typeof subject !== 'string') {
    res.status(400).json({ error: 'subject is required' });
    return;
  }

  try {
    const rawHtml = readTemplate(templateId);
    let processedHtml = processTemplate(rawHtml, variables);

    const preset = presetId ? getPresetById(presetId) : undefined;
    const category = preset?.category ?? 'transactional';
    const automated = preset?.automated ?? true;
    processedHtml = processUnsubscribeBlock(processedHtml, category, automated);

    const result = await sendRawEmail({
      to,
      subject,
      html: processedHtml,
      from: 'YourApp <onboarding@resend.dev>',  // Use resend.dev for testing
    });

    if (!result) {
      res.status(500).json({ error: 'Failed to send email — check server logs' });
      return;
    }

    res.status(200).json({
      success: true,
      id: result.id,
      from: 'YourApp <onboarding@resend.dev>',
      to: [to],
      subject,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[email] Failed to send test email:`, message, err);
    res.status(500).json({ error: message });
  }
});

export default router;
```

### Register routes in your Express app:

```typescript
import emailRoutes from './routes/email.js';
app.use(emailRoutes);
```

---

## 8. API Routes — Admin Email Endpoints

**File:** `server/routes/admin.ts` (email-related portion)

These endpoints manage DB-backed custom templates and provide a raw send function. All require admin auth.

```typescript
import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

let _admin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _admin;
}

// ── Email Templates CRUD ────────────────────────────────────────────

async function handleEmailTemplates(req: Request, res: Response) {
  const supabase = getSupabaseAdmin();

  switch (req.method) {
    case 'GET': {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      res.status(200).json(data || []);
      return;
    }

    case 'POST': {
      const { name, subject, html_body } = req.body;
      if (!name || !subject || !html_body) {
        res.status(400).json({ error: 'name, subject, and html_body are required' });
        return;
      }
      const { data, error } = await supabase
        .from('email_templates')
        .insert([{ name, subject, html_body }])
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
      return;
    }

    case 'PUT': {
      const { id, ...updates } = req.body;
      if (!id) { res.status(400).json({ error: 'id is required' }); return; }
      // Field allowlist — only these columns can be updated
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
      res.status(200).json(data);
      return;
    }

    case 'DELETE': {
      const { id } = req.body;
      if (!id) { res.status(400).json({ error: 'id is required' }); return; }
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      res.status(204).end();
      return;
    }

    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
}

// ── Send Email (raw) ────────────────────────────────────────────────

async function handleSendEmail(req: Request, res: Response) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    return;
  }

  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    res.status(400).json({ error: 'to, subject, and html are required' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  try {
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: 'YourApp <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (result.error) {
      res.status(400).json({ error: result.error.message, details: result.error });
      return;
    }

    res.status(200).json({
      id: result.data?.id,
      from: 'YourApp <onboarding@resend.dev>',
      to: [to],
      subject,
      created_at: new Date().toISOString(),
      status: 'sent',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}

// ── Route registration ──────────────────────────────────────────────

router.route('/api/admin/email-templates')
  .all(requireAdmin)
  .get(async (req, res, next) => {
    try { await handleEmailTemplates(req, res); } catch (err) { next(err); }
  })
  .post(async (req, res, next) => {
    try { await handleEmailTemplates(req, res); } catch (err) { next(err); }
  })
  .put(async (req, res, next) => {
    try { await handleEmailTemplates(req, res); } catch (err) { next(err); }
  })
  .delete(async (req, res, next) => {
    try { await handleEmailTemplates(req, res); } catch (err) { next(err); }
  });

router.post('/api/admin/send-email', requireAdmin, async (req, res, next) => {
  try { await handleSendEmail(req, res); } catch (err) { next(err); }
});

export default router;
```

---

## 9. Admin Auth Middleware

**File:** `server/middleware/adminAuth.ts`

Validates Supabase JWT from the `Authorization: Bearer <token>` header, then checks `profiles.role = 'admin'`.

```typescript
import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

export interface AdminAuthResult {
  userId: string;
}

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);
  const admin = getSupabaseAdmin();
  if (!admin) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  // Verify JWT
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (!user || error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Check admin role in profiles table
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin access required' });
    return;
  }

  (req as Request & { adminAuth: AdminAuthResult }).adminAuth = { userId: user.id };
  next();
}
```

---

## 10. HTML Email Templates

**Directory:** `server/templates/email/`

You need 3 responsive HTML email template files. Each is a standalone HTML document with `{{variable}}` placeholders.

### Template variable system

All templates support these variables:

| Variable | Purpose |
|----------|---------|
| `{{preheader_text}}` | Hidden preview text shown in inbox |
| `{{headline}}` | Main heading |
| `{{hero_body}}` | Subtext below headline |
| `{{body_content}}` | Main body paragraph(s) |
| `{{cta_text}}` | Call-to-action button text |
| `{{cta_url}}` | CTA button link |
| `{{secondary_content}}` | Footer/secondary text |
| `{{year}}` | Auto-replaced with current year |

The **dark-blue** template also supports:

| Variable | Purpose |
|----------|---------|
| `{{feature_1_label}}` | Feature highlight #1 label |
| `{{feature_1_text}}` | Feature highlight #1 description |
| `{{feature_2_label}}` | Feature highlight #2 label |
| `{{feature_2_text}}` | Feature highlight #2 description |

### Conditional unsubscribe block

Wrap unsubscribe content in:
```html
{{#unsubscribe}}
<p>
  <a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a>
</p>
{{/unsubscribe}}
```

The `processUnsubscribeBlock()` function strips or keeps this based on email category.

### The 3 template designs

#### 1. Light (`email-template-light.html`)
- **Background:** Cream (#F5F0EB)
- **Header:** White with subtle orange accent (#E8A87C)
- **Typography:** Georgia serif headings + Space Mono for labels
- **CTA button:** Orange (#E8A87C) with white text
- **Best for:** Newsletter-style content, support confirmations, digests

#### 2. Warm Orange (`email-template-orange.html`)
- **Background:** Warm orange (#C4854A)
- **Content:** Darker orange (#D49A60) with inset card
- **CTA button:** White on white background
- **Best for:** Transactional alerts, welcome emails, upgrades

#### 3. Dark Blue (`email-template-dark-blue.html`)
- **Background:** Dark navy (#1E2A3A)
- **Content:** Slate (#243447) with glass-effect styling
- **CTA button:** Orange (#E8A87C) on dark background
- **Extra:** 2-column feature highlights section
- **Best for:** Premium feature announcements, changelogs, launch emails

### Template structure (shared across all 3)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Google Fonts: Playfair Display + Space Mono -->
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Space+Mono&display=swap" rel="stylesheet">
  <style>
    /* Reset + responsive styles */
    /* Template-specific colors and layout */
    /* Mobile overrides at max-width: 600px */
  </style>
</head>
<body>
  <!-- Hidden preheader -->
  <div style="display:none;max-height:0;overflow:hidden;">
    {{preheader_text}}
  </div>

  <table role="presentation" width="100%">
    <!-- Header with logo/brand -->
    <!-- Headline: {{headline}} -->
    <!-- Hero body: {{hero_body}} -->
    <!-- Body content: {{body_content}} -->
    <!-- CTA button: {{cta_text}} / {{cta_url}} -->
    <!-- Feature highlights (dark-blue only) -->
    <!-- Secondary content: {{secondary_content}} -->
    <!-- Unsubscribe block -->
    <!-- Footer with year: {{year}} -->
  </table>
</body>
</html>
```

### How to customize for your brand

1. Replace the logo/brand name in the header
2. Update the color palette in the `<style>` block
3. Update Google Fonts if you use different typefaces
4. Update the footer text and links
5. Copy the Rekkrd templates as a starting point and modify from there

> **Tip:** Use the Composer's live preview to iterate on designs in real time.

---

## 11. Frontend — Admin Service (API Client)

**File:** `services/adminService.ts` (email-related portion)

### Types

```typescript
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  created_at: string;
  updated_at: string;
}

export interface SendEmailResult {
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
}

export interface ComposerSendResult {
  success: boolean;
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
}

export interface EmailPreset {
  id: string;
  name: string;
  category: 'transactional' | 'engagement' | 'marketing' | 'operational';
  description: string;
  templateId: 'light' | 'orange' | 'dark-blue';
  automated: boolean;
  variables: {
    preheader_text: string;
    headline: string;
    hero_body: string;
    body_content: string;
    cta_text: string;
    cta_url: string;
    secondary_content: string;
    subject: string;
    feature_1_label?: string;
    feature_1_text?: string;
    feature_2_label?: string;
    feature_2_text?: string;
  };
}
```

### API Methods

```typescript
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Option 1: Supabase session token (if user is logged in)
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      return headers;
    }
  }

  // Option 2: Static API secret (fallback)
  const secret = import.meta.env.VITE_API_SECRET;
  if (secret) {
    headers['Authorization'] = `Bearer ${secret}`;
  }
  return headers;
}

export const adminService = {
  // ── Custom Templates (DB-backed) ────────────────────────────────

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/email-templates', { headers });
    if (!resp.ok) throw new Error(`Failed to fetch templates: ${resp.status}`);
    return resp.json();
  },

  async createEmailTemplate(template: {
    name: string;
    subject: string;
    html_body: string;
  }): Promise<EmailTemplate> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/email-templates', {
      method: 'POST',
      headers,
      body: JSON.stringify(template),
    });
    if (!resp.ok) throw new Error(`Failed to create template: ${resp.status}`);
    return resp.json();
  },

  async updateEmailTemplate(
    id: string,
    updates: { name?: string; subject?: string; html_body?: string },
  ): Promise<EmailTemplate> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/email-templates', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id, ...updates }),
    });
    if (!resp.ok) throw new Error(`Failed to update template: ${resp.status}`);
    return resp.json();
  },

  async deleteEmailTemplate(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/email-templates', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id }),
    });
    if (!resp.ok) throw new Error(`Failed to delete template: ${resp.status}`);
  },

  // ── Preset Library ──────────────────────────────────────────────

  async fetchEmailPresets(): Promise<EmailPreset[]> {
    const resp = await fetch('/api/email/presets');
    if (!resp.ok) throw new Error(`Failed to fetch presets: ${resp.status}`);
    return resp.json();
  },

  async fetchEmailTemplateHtml(templateId: string): Promise<string> {
    const resp = await fetch(`/api/email/templates/${encodeURIComponent(templateId)}`);
    if (!resp.ok) throw new Error(`Failed to fetch template: ${resp.status}`);
    return resp.text();  // Returns raw HTML, not JSON
  },

  // ── Sending ─────────────────────────────────────────────────────

  async sendTestEmail(payload: {
    to: string;
    subject: string;
    html: string;
  }): Promise<SendEmailResult> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Send failed' }));
      throw new Error(err.error || `Failed to send email: ${resp.status}`);
    }
    return resp.json();
  },

  async sendComposerTestEmail(payload: {
    templateId: string;
    variables: Record<string, string>;
    to: string;
    subject: string;
    presetId?: string;
  }): Promise<ComposerSendResult> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/email/send-test', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Send test failed' }));
      throw new Error(err.error || `Failed to send test: ${resp.status}`);
    }
    return resp.json();
  },
};
```

---

## 12. Frontend — EmailsPage (Admin Panel)

**File:** `admin/pages/EmailsPage.tsx`

A 3-tab admin page for managing emails:

### Tab 1: Templates
- **Left panel:** List of saved custom templates (from Supabase) with delete buttons
- **Right panel:** Editor with fields for Name, Subject, HTML Body
- **Toggle:** Switch between Editor and Preview modes
- **Preview:** Renders HTML in a sandboxed iframe (scripts stripped for safety)
- **Operations:** Create, Edit, Delete

### Tab 2: Send Test
- **Dropdown:** Load a saved template to pre-fill Subject + HTML
- **Fields:** Recipient email, Subject, HTML body (editable textarea)
- **Preview:** Live iframe preview of the HTML
- **Send button:** Sends via `/api/admin/send-email`
- **Result display:** Shows Resend ID, From, To, Subject, timestamp

### Tab 3: Compose
- Embeds the `EmailComposer` component (see next section)

### Key patterns:
- Script stripping for safe iframe preview: `html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')`
- Iframe uses `sandbox="allow-same-origin"` for security
- Tab switcher uses pill-style buttons with active state highlighting

---

## 13. Frontend — EmailComposer

**File:** `src/components/admin/EmailComposer.tsx`

A 3-step wizard for composing and sending templated emails:

### Step A: Choose Preset
- "Blank Email" option (dashed border card)
- Presets grouped by category (transactional, engagement, marketing, operational)
- Each preset card shows: name, description, template color badge, automated flag
- Selecting a preset pre-fills the template choice and all form fields

### Step B: Choose Template
- 3 template cards with color preview thumbnails
- Checkmark indicator on selected template
- `radiogroup` ARIA pattern for accessibility

### Step C: Content Editor + Live Preview
- **Two-column layout** (stacks on mobile):
  - **Left:** Form fields — test email, subject, preheader, headline, hero body, body content, CTA text, CTA URL, secondary content, feature fields (dark-blue only)
  - **Right:** Live preview in sandboxed iframe (scaled 50% to show full email)
- **Actions:** "Send Test Email" button + "Copy HTML" button
- **Result modal:** Shows success/error with Resend ID, from, to, subject, timestamp

### Key patterns:
- `processedHtml` is computed via `useMemo` — rebuilds when template HTML or any field changes
- iframe scaled to 50% with `transformOrigin: 'top left'` and doubled width/height for full visibility
- Confirmation dialog when navigating back with unsaved changes
- Fields auto-populate from preset but are fully editable

### Component structure (simplified):

```
EmailComposer
├── SendResultModal (success/error dialog)
├── Step A: Preset selector (grouped radio cards)
├── Step B: Template selector (3 visual cards)
└── Step C: Two-column layout
    ├── Content form (all {{variable}} fields)
    └── Live preview iframe
```

---

## 14. Triggering Emails from App Logic

Use `sendTemplatedEmail()` from any server-side route to send preset-based emails:

```typescript
import { sendTemplatedEmail } from '../services/emailService.js';

// Example: Send welcome email after onboarding
router.post('/api/onboarding/complete', requireAuth, async (req, res) => {
  const { userId } = req.auth;

  // ... your onboarding logic ...

  // Fire-and-forget: don't block the response
  sendTemplatedEmail({ to: userEmail, presetId: 'welcome' })
    .then(result => result && console.log('[email] Welcome email sent'))
    .catch(err => console.error('[email] Welcome email failed:', err));

  res.status(200).json({ success: true });
});

// Example: Send with variable overrides
sendTemplatedEmail({
  to: 'user@example.com',
  presetId: 'price-alert',
  variableOverrides: {
    artist: 'Miles Davis',
    title: 'Kind of Blue',
    current_price: '24.99',
    target_price: '30.00',
    discogs_url: 'https://discogs.com/...',
  },
});
```

**Pattern:** Fire-and-forget with `.then()/.catch()` — never block the API response waiting for email delivery.

---

## 15. Customization Checklist

When replicating this for a new project, update these items:

### Branding
- [ ] `DEFAULT_FROM` in `emailService.ts` — e.g., `Sproutify <noreply@sproutify.app>`
- [ ] Test `from` address in routes — e.g., `Sproutify <onboarding@resend.dev>`
- [ ] Logo/brand name in all 3 HTML templates
- [ ] Color palette in HTML templates (swap accent colors)
- [ ] Google Fonts (if using different typefaces)
- [ ] Footer links and copyright text

### Presets
- [ ] Replace all presets in `emailPresets.ts` with app-specific ones
- [ ] Update CTA URLs to your domain
- [ ] Update support email addresses
- [ ] Update description text to match your product

### Environment
- [ ] Set `RESEND_API_KEY` in server environment
- [ ] Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Configure a verified domain in Resend (for production `from` address)
- [ ] Update `ALLOWED_ORIGINS` for CORS if applicable

### Database
- [ ] Run the migration SQL (Section 4) in your Supabase project
- [ ] Set your admin user's email in the migration

### Frontend
- [ ] Update `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- [ ] Update any hardcoded brand references in `EmailComposer.tsx`
- [ ] Update template thumbnail label (e.g., "REKKRD" → "SPROUTIFY")

### Resend Setup
- [ ] Create a Resend account at https://resend.com
- [ ] Add and verify your sending domain
- [ ] Generate an API key
- [ ] For development, use `onboarding@resend.dev` as the from address (Resend's test domain)
- [ ] For production, use your verified domain (e.g., `noreply@sproutify.app`)

---

## File Inventory

Here's every file you need to create:

```
server/
├── middleware/
│   └── adminAuth.ts              ← Section 9
├── services/
│   └── emailService.ts           ← Section 5
├── data/
│   └── emailPresets.ts           ← Section 6
├── routes/
│   ├── email.ts                  ← Section 7
│   └── admin.ts                  ← Section 8
└── templates/
    └── email/
        ├── email-template-light.html      ← Section 10
        ├── email-template-orange.html     ← Section 10
        └── email-template-dark-blue.html  ← Section 10

services/
└── adminService.ts               ← Section 11

admin/
└── pages/
    └── EmailsPage.tsx            ← Section 12

src/
└── components/
    └── admin/
        └── EmailComposer.tsx     ← Section 13

supabase/
└── migrations/
    └── xxx_email_templates.sql   ← Section 4
```

---

*Generated from the Rekkrd codebase — February 2026*
