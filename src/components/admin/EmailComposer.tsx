import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { adminService, ComposerSendResult, type EmailPreset } from '../../../services/adminService';

type TemplateId = 'light' | 'orange' | 'dark-blue';

interface TemplateOption {
  id: TemplateId;
  label: string;
  bgColor: string;
  textColor: string;
}

const TEMPLATES: TemplateOption[] = [
  { id: 'light', label: 'Light', bgColor: '#F5F0EB', textColor: '#2D2D2D' },
  { id: 'orange', label: 'Warm Orange', bgColor: '#C4854A', textColor: '#FFFFFF' },
  { id: 'dark-blue', label: 'Dark Blue', bgColor: '#1E2A3A', textColor: '#FFFFFF' },
];

const TEMPLATE_DOT_COLORS: Record<TemplateId, string> = {
  light: '#F5F0EB',
  orange: '#C4854A',
  'dark-blue': '#1E2A3A',
};

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  light: 'Light',
  orange: 'Warm Orange',
  'dark-blue': 'Dark Blue',
};

const CATEGORY_LABELS: Record<string, string> = {
  transactional: 'TRANSACTIONAL',
  engagement: 'ENGAGEMENT',
  marketing: 'MARKETING',
  operational: 'OPERATIONAL',
};

const CATEGORY_ORDER = ['transactional', 'engagement', 'marketing', 'operational'];

interface FormFields {
  preheader_text: string;
  headline: string;
  hero_body: string;
  body_content: string;
  cta_text: string;
  cta_url: string;
  secondary_content: string;
  feature_1_label: string;
  feature_1_text: string;
  feature_2_label: string;
  feature_2_text: string;
}

const INITIAL_FIELDS: FormFields = {
  preheader_text: '',
  headline: '',
  hero_body: '',
  body_content: '',
  cta_text: '',
  cta_url: '',
  secondary_content: '',
  feature_1_label: '',
  feature_1_text: '',
  feature_2_label: '',
  feature_2_text: '',
};

interface ModalState {
  open: boolean;
  type: 'success' | 'error';
  result: ComposerSendResult | null;
  error: string | null;
}

// ── Result Modal ──────────────────────────────────────────────────────
const SendResultModal: React.FC<{ state: ModalState; onClose: () => void }> = ({ state, onClose }) => {
  if (!state.open) return null;

  const isSuccess = state.type === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Send result">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: 'rgb(255,255,255)' }}>
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{
            backgroundColor: isSuccess ? 'rgb(240,253,244)' : 'rgb(254,242,242)',
            borderBottom: `1px solid ${isSuccess ? 'rgb(134,239,172)' : 'rgb(252,165,165)'}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isSuccess ? 'rgb(34,197,94)' : 'rgb(239,68,68)' }}
            >
              {isSuccess ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'rgb(17,24,39)' }}>
                {isSuccess ? 'Email Sent' : 'Send Failed'}
              </h3>
              <p className="text-xs" style={{ color: 'rgb(107,114,128)' }}>
                {isSuccess ? 'Delivered via Resend' : 'See details below'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" style={{ color: 'rgb(156,163,175)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {isSuccess && state.result ? (
            <div className="space-y-3">
              <DetailRow label="Resend ID" value={state.result.id} mono />
              <DetailRow label="From" value={state.result.from} />
              <DetailRow label="To" value={state.result.to?.join(', ')} />
              <DetailRow label="Subject" value={state.result.subject} />
              <DetailRow label="Sent at" value={new Date(state.result.created_at).toLocaleString()} />
              <DetailRow label="Status" value="Accepted by Resend" highlight />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgb(254,242,242)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'rgb(239,68,68)' }}>Error</p>
                <p className="text-sm font-mono break-all" style={{ color: 'rgb(127,29,29)' }}>
                  {state.error || 'Unknown error'}
                </p>
              </div>
              <p className="text-xs" style={{ color: 'rgb(107,114,128)' }}>
                Check that <code className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgb(243,244,246)' }}>RESEND_API_KEY</code> is set in your server environment and the Resend account is active.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: 'rgb(229,231,235)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(17,24,39)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value?: string; mono?: boolean; highlight?: boolean }> = ({ label, value, mono, highlight }) => (
  <div className="flex items-start gap-3">
    <span className="text-xs font-medium w-20 shrink-0 pt-0.5" style={{ color: 'rgb(107,114,128)' }}>{label}</span>
    <span
      className={`text-sm break-all ${mono ? 'font-mono text-xs' : ''}`}
      style={{ color: highlight ? 'rgb(34,197,94)' : 'rgb(17,24,39)' }}
    >
      {value || '—'}
    </span>
  </div>
);

// ── EmailComposer ─────────────────────────────────────────────────────
const EmailComposer: React.FC = () => {
  // Preset state
  const [presets, setPresets] = useState<EmailPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null); // null = not chosen yet, 'blank' = blank email
  const [fieldsModified, setFieldsModified] = useState(false);

  // Existing state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS);
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [modal, setModal] = useState<ModalState>({ open: false, type: 'success', result: null, error: null });
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const presetChosen = selectedPresetId !== null;

  // Fetch presets on mount
  useEffect(() => {
    adminService.fetchEmailPresets()
      .then(setPresets)
      .catch(err => {
        console.error('Failed to fetch presets:', err);
        setPresets([]);
      })
      .finally(() => setLoadingPresets(false));
  }, []);

  // Fetch template HTML when selection changes
  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateHtml('');
      return;
    }
    setLoadingTemplate(true);
    adminService.fetchEmailTemplateHtml(selectedTemplate)
      .then(setTemplateHtml)
      .catch(err => {
        console.error('Failed to fetch template:', err);
        setTemplateHtml('');
        showStatus('error', 'Failed to load template');
      })
      .finally(() => setLoadingTemplate(false));
  }, [selectedTemplate]);

  // Group presets by category
  const groupedPresets = useMemo(() => {
    const groups: Record<string, EmailPreset[]> = {};
    for (const cat of CATEGORY_ORDER) {
      const matching = presets.filter(p => p.category === cat);
      if (matching.length > 0) groups[cat] = matching;
    }
    return groups;
  }, [presets]);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const updateField = useCallback((key: keyof FormFields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
    setFieldsModified(true);
  }, []);

  const handleSelectPreset = useCallback((preset: EmailPreset) => {
    setSelectedPresetId(preset.id);
    setSelectedTemplate(preset.templateId);
    setSubject(preset.variables.subject);
    setFields({
      preheader_text: preset.variables.preheader_text,
      headline: preset.variables.headline,
      hero_body: preset.variables.hero_body,
      body_content: preset.variables.body_content,
      cta_text: preset.variables.cta_text,
      cta_url: preset.variables.cta_url,
      secondary_content: preset.variables.secondary_content,
      feature_1_label: preset.variables.feature_1_label ?? '',
      feature_1_text: preset.variables.feature_1_text ?? '',
      feature_2_label: preset.variables.feature_2_label ?? '',
      feature_2_text: preset.variables.feature_2_text ?? '',
    });
    setFieldsModified(false);
  }, []);

  const handleSelectBlank = useCallback(() => {
    setSelectedPresetId('blank');
    setSelectedTemplate(null);
    setSubject('');
    setFields(INITIAL_FIELDS);
    setFieldsModified(false);
  }, []);

  const handleBackToPresets = useCallback(() => {
    if (fieldsModified) {
      const confirmed = window.confirm('You have unsaved edits. Going back will reset all fields. Continue?');
      if (!confirmed) return;
    }
    setSelectedPresetId(null);
    setSelectedTemplate(null);
    setSubject('');
    setFields(INITIAL_FIELDS);
    setFieldsModified(false);
  }, [fieldsModified]);

  // Process template with current field values (strip scripts for safe preview)
  const processedHtml = useMemo(() => {
    if (!templateHtml) return '';
    let html = templateHtml;
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    html = html.replace(/\{\{year\}\}/g, new Date().getFullYear().toString());
    for (const [key, value] of Object.entries(fields)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(pattern, value || '');
    }
    return html;
  }, [templateHtml, fields]);

  const canSubmit = selectedTemplate && fields.headline.trim() && fields.body_content.trim();
  const canSend = canSubmit && testEmail.trim() && subject.trim();

  const handleSendTest = async () => {
    if (!selectedTemplate || !canSend) return;
    setSending(true);
    try {
      const result = await adminService.sendComposerTestEmail({
        templateId: selectedTemplate,
        variables: fields,
        to: testEmail.trim(),
        subject: subject.trim(),
        presetId: selectedPresetId && selectedPresetId !== 'blank' ? selectedPresetId : undefined,
      });
      setModal({ open: true, type: 'success', result, error: null });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setModal({ open: true, type: 'error', result: null, error: errorMsg });
    } finally {
      setSending(false);
    }
  };

  const handleCopyHtml = async () => {
    if (!processedHtml) return;
    try {
      await navigator.clipboard.writeText(processedHtml);
      showStatus('success', 'HTML copied to clipboard');
    } catch {
      showStatus('error', 'Failed to copy HTML');
    }
  };

  const inputClasses = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)]';
  const labelClasses = 'block text-xs font-medium mb-1.5 font-label';

  return (
    <div className="p-8">
      {/* Send Result Modal */}
      <SendResultModal state={modal} onClose={() => setModal(prev => ({ ...prev, open: false }))} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Email Composer</h1>
        <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>
          Choose a preset or start blank, pick a template, and compose your email
        </p>
      </div>

      {/* ── Step A: Preset Selector ───────────────────────────────────── */}
      {!presetChosen && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'rgb(17,24,39)' }}>Choose a Preset</h2>

          {loadingPresets ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div>
              {/* Blank Email option */}
              <div className="mb-5">
                <button
                  onClick={handleSelectBlank}
                  className="w-full rounded-xl border-2 border-dashed p-4 transition-all cursor-pointer text-left hover:border-[rgb(156,163,175)]"
                  style={{ borderColor: 'rgb(229,231,235)', backgroundColor: 'rgb(255,255,255)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'rgb(243,244,246)' }}
                    >
                      <svg className="w-5 h-5" style={{ color: 'rgb(107,114,128)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(17,24,39)' }}>Blank Email</p>
                      <p className="text-xs" style={{ color: 'rgb(107,114,128)' }}>Start from scratch with an empty template</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Presets grouped by category */}
              <div role="radiogroup" aria-label="Email preset">
                {CATEGORY_ORDER.map(cat => {
                  const catPresets = groupedPresets[cat];
                  if (!catPresets) return null;
                  return (
                    <div key={cat} className="mb-5">
                      <h3
                        className="text-[11px] font-label uppercase tracking-wider mb-2.5"
                        style={{ color: 'rgb(156,163,175)' }}
                      >
                        {CATEGORY_LABELS[cat]}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catPresets.map(preset => (
                          <button
                            key={preset.id}
                            role="radio"
                            aria-pressed={false}
                            aria-checked={false}
                            onClick={() => handleSelectPreset(preset)}
                            className="rounded-xl border-2 p-4 transition-all cursor-pointer text-left hover:border-[rgb(156,163,175)]"
                            style={{ borderColor: 'rgb(229,231,235)', backgroundColor: 'rgb(255,255,255)' }}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-sm font-medium" style={{ color: 'rgb(17,24,39)' }}>{preset.name}</p>
                              {/* Template badge */}
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                                style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(107,114,128)' }}
                              >
                                <span
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{ backgroundColor: TEMPLATE_DOT_COLORS[preset.templateId] }}
                                />
                                {TEMPLATE_LABELS[preset.templateId]}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: 'rgb(107,114,128)' }}>
                              {preset.description}
                            </p>
                            {preset.automated && (
                              <span
                                className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium"
                                style={{ backgroundColor: 'rgb(236,253,245)', color: 'rgb(5,150,105)' }}
                              >
                                Automated
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Steps B + C: Template Selector & Form (after preset chosen) ── */}
      {presetChosen && (
        <>
          {/* Back to Presets link */}
          <div className="mb-4">
            <button
              onClick={handleBackToPresets}
              className="inline-flex items-center gap-1.5 text-sm transition-colors hover:underline"
              style={{ color: 'rgb(99,102,241)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Presets
            </button>
          </div>

          {/* Template Selector */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'rgb(17,24,39)' }}>Select Template</h2>
            <div role="radiogroup" aria-label="Email template" className="grid grid-cols-3 gap-4">
              {TEMPLATES.map(t => {
                const isSelected = selectedTemplate === t.id;
                return (
                  <button
                    key={t.id}
                    role="radio"
                    aria-pressed={isSelected}
                    aria-checked={isSelected}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer text-left ${
                      isSelected ? 'border-[rgb(221,110,66)] shadow-md' : 'border-[rgb(229,231,235)] hover:border-[rgb(156,163,175)]'
                    }`}
                    style={{ backgroundColor: 'rgb(255,255,255)' }}
                  >
                    {/* Checkmark */}
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgb(221,110,66)' }}
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Thumbnail preview */}
                    <div
                      className="w-full h-24 rounded-lg mb-3 flex items-center justify-center"
                      style={{ backgroundColor: t.bgColor }}
                    >
                      <span
                        className="text-xs font-bold tracking-widest"
                        style={{ color: t.textColor, fontFamily: '"Playfair Display", serif' }}
                      >
                        REKKRD
                      </span>
                    </div>

                    {/* Label */}
                    <p className="text-sm font-medium" style={{ color: 'rgb(17,24,39)' }}>{t.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content form + Preview — side by side on desktop */}
          {selectedTemplate && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div className="rounded-xl border" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>Content</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Test Email Address *</label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputClasses}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                  </div>

                  <div>
                    <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Subject Line *</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => { setSubject(e.target.value); setFieldsModified(true); }}
                      placeholder="e.g. Welcome to Rekkrd!"
                      className={inputClasses}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                  </div>

                  <div className="border-t pt-4" style={{ borderColor: 'rgb(229,231,235)' }} />

                  <div>
                    <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Preheader Text</label>
                    <input
                      type="text"
                      value={fields.preheader_text}
                      onChange={e => updateField('preheader_text', e.target.value)}
                      placeholder="Preview text shown in inbox"
                      className={inputClasses}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                  </div>

                  <div>
                    <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Headline *</label>
                    <input
                      type="text"
                      value={fields.headline}
                      onChange={e => updateField('headline', e.target.value)}
                      placeholder="Your email headline"
                      className={inputClasses}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                  </div>

                  <div>
                    <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Hero Body</label>
                    <textarea
                      value={fields.hero_body}
                      onChange={e => updateField('hero_body', e.target.value)}
                      placeholder="Subtext below the headline"
                      rows={2}
                      className={`${inputClasses} resize-y`}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                  </div>

                  <div>
                    <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Body Content *</label>
                    <textarea
                      value={fields.body_content}
                      onChange={e => updateField('body_content', e.target.value)}
                      placeholder="Main email body content"
                      rows={5}
                      className={`${inputClasses} resize-y`}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                  </div>

                  <div>
                    <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>CTA Text</label>
                    <input
                      type="text"
                      value={fields.cta_text}
                      onChange={e => updateField('cta_text', e.target.value)}
                      placeholder="e.g. View My Collection"
                      className={inputClasses}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                  </div>

                  <div>
                    <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>CTA URL</label>
                    <input
                      type="text"
                      value={fields.cta_url}
                      onChange={e => updateField('cta_url', e.target.value)}
                      placeholder="https://rekkrd.com/..."
                      className={inputClasses}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                  </div>

                  <div>
                    <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Secondary Content</label>
                    <textarea
                      value={fields.secondary_content}
                      onChange={e => updateField('secondary_content', e.target.value)}
                      placeholder="Optional additional content"
                      rows={3}
                      className={`${inputClasses} resize-y`}
                      style={{ borderColor: 'rgb(229,231,235)' }}
                    />
                  </div>

                  {/* Feature fields — Dark Blue template only */}
                  {selectedTemplate === 'dark-blue' && (
                    <>
                      <div className="border-t pt-4" style={{ borderColor: 'rgb(229,231,235)' }}>
                        <p className="text-xs font-semibold mb-3" style={{ color: 'rgb(107,114,128)' }}>Feature Highlights (Dark Blue only)</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Feature 1 Label</label>
                          <input
                            type="text"
                            value={fields.feature_1_label}
                            onChange={e => updateField('feature_1_label', e.target.value)}
                            placeholder="e.g. Smart Scanning"
                            className={inputClasses}
                            style={{ borderColor: 'rgb(229,231,235)' }}
                          />
                        </div>
                        <div>
                          <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Feature 1 Text</label>
                          <input
                            type="text"
                            value={fields.feature_1_text}
                            onChange={e => updateField('feature_1_text', e.target.value)}
                            placeholder="Feature description"
                            className={inputClasses}
                            style={{ borderColor: 'rgb(229,231,235)' }}
                          />
                        </div>
                        <div>
                          <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Feature 2 Label</label>
                          <input
                            type="text"
                            value={fields.feature_2_label}
                            onChange={e => updateField('feature_2_label', e.target.value)}
                            placeholder="e.g. AI Playlists"
                            className={inputClasses}
                            style={{ borderColor: 'rgb(229,231,235)' }}
                          />
                        </div>
                        <div>
                          <label className={labelClasses} style={{ color: 'rgb(107,114,128)' }}>Feature 2 Text</label>
                          <input
                            type="text"
                            value={fields.feature_2_text}
                            onChange={e => updateField('feature_2_text', e.target.value)}
                            placeholder="Feature description"
                            className={inputClasses}
                            style={{ borderColor: 'rgb(229,231,235)' }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Live Preview */}
              <div className="rounded-xl border" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>Live Preview</h3>
                </div>
                <div className="p-5">
                  {loadingTemplate ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div
                      className="border rounded-lg overflow-hidden"
                      style={{ borderColor: 'rgb(229,231,235)', height: '600px' }}
                    >
                      <iframe
                        ref={iframeRef}
                        srcDoc={processedHtml || '<p style="color:#999;text-align:center;padding:40px;font-family:sans-serif">Select a template to preview</p>'}
                        className="w-full h-full bg-white"
                        sandbox="allow-same-origin"
                        title="Email template preview"
                        style={{
                          transform: 'scale(0.5)',
                          transformOrigin: 'top left',
                          width: '200%',
                          height: '200%',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedTemplate && (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSendTest}
                disabled={!canSend || sending}
                className="px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: 'rgb(99,102,241)' }}
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Test Email
                  </>
                )}
              </button>

              <button
                onClick={handleCopyHtml}
                disabled={!canSubmit}
                className="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(17,24,39)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy HTML
              </button>

              {/* Status toast (for copy) */}
              {statusMsg && (
                <div
                  className="ml-auto px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
                  style={{
                    backgroundColor: statusMsg.type === 'success' ? 'rgb(240,253,244)' : 'rgb(254,242,242)',
                    color: statusMsg.type === 'success' ? 'rgb(34,197,94)' : 'rgb(239,68,68)',
                    border: `1px solid ${statusMsg.type === 'success' ? 'rgb(134,239,172)' : 'rgb(252,165,165)'}`,
                  }}
                >
                  {statusMsg.text}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmailComposer;
