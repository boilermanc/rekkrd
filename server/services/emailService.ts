import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPresetById } from '../data/emailPresets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_FROM = 'Rekkrd <noreply@rekkrd.com>';

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
 * Transactional emails don't need unsubscribe links. Marketing emails sent
 * via Resend Broadcasts will have {{{RESEND_UNSUBSCRIBE_URL}}} replaced
 * automatically.
 *
 * - Marketing/engagement emails that are NOT automated: keep the unsubscribe
 *   link (strip the wrapper tags, leaving the inner content).
 * - Transactional/operational or automated emails: remove the entire block.
 */
export function processUnsubscribeBlock(
  html: string,
  category: string,
  automated: boolean,
): string {
  const showUnsubscribe =
    (category === 'marketing' || category === 'engagement') && !automated;

  if (showUnsubscribe) {
    // Keep the content, strip the wrapper tags
    return html
      .replace(/\{\{#unsubscribe\}\}/g, '')
      .replace(/\{\{\/unsubscribe\}\}/g, '');
  }
  // Remove the entire block (wrapper tags + everything between them)
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
 *
 * Looks up the preset, reads the matching HTML template, merges variables,
 * processes placeholders and the unsubscribe block, then sends via Resend.
 *
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

    // Merge preset variables with caller overrides (overrides win)
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
 *
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
