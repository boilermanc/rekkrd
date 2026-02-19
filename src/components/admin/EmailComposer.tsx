import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { adminService } from '../../../services/adminService';

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

const EmailComposer: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS);
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const updateField = useCallback((key: keyof FormFields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  }, []);

  // Process template with current field values
  const processedHtml = useMemo(() => {
    if (!templateHtml) return '';
    let html = templateHtml;
    html = html.replace(/\{\{year\}\}/g, new Date().getFullYear().toString());
    for (const [key, value] of Object.entries(fields)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(pattern, value || '');
    }
    return html;
  }, [templateHtml, fields]);

  const canSubmit = selectedTemplate && fields.headline.trim() && fields.body_content.trim();

  const handleSendTest = async () => {
    if (!selectedTemplate || !canSubmit) return;
    setSending(true);
    try {
      await adminService.sendComposerTestEmail({
        templateId: selectedTemplate,
        variables: fields,
      });
      showStatus('success', 'Test email processed successfully');
    } catch (err) {
      showStatus('error', err instanceof Error ? err.message : 'Failed to send test');
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Email Composer</h1>
        <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>
          Choose a template, fill in content, and preview your email
        </p>
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
            disabled={!canSubmit || sending}
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

          {/* Status toast */}
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
    </div>
  );
};

export default EmailComposer;
