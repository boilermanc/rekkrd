import React, { useEffect, useState } from 'react';
import { adminService, EmailTemplate, SendEmailResult } from '../../services/adminService';

type Tab = 'templates' | 'send';

const EmailsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Send test state
  const [sendTo, setSendTo] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendHtml, setSendHtml] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendEmailResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    adminService.getEmailTemplates()
      .then(setTemplates)
      .catch(err => console.error('Failed to load templates:', err))
      .finally(() => setLoading(false));
  }, []);

  const resetEditor = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateSubject('');
    setTemplateHtml('');
    setShowPreview(false);
  };

  const handleEditTemplate = (t: EmailTemplate) => {
    setEditingTemplate(t);
    setTemplateName(t.name);
    setTemplateSubject(t.subject);
    setTemplateHtml(t.html_body);
    setShowPreview(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName || !templateSubject || !templateHtml) return;
    setSaving(true);
    try {
      if (editingTemplate) {
        const updated = await adminService.updateEmailTemplate(editingTemplate.id, {
          name: templateName,
          subject: templateSubject,
          html_body: templateHtml,
        });
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      } else {
        const created = await adminService.createEmailTemplate({
          name: templateName,
          subject: templateSubject,
          html_body: templateHtml,
        });
        setTemplates(prev => [created, ...prev]);
      }
      resetEditor();
    } catch (err) {
      console.error('Save template error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await adminService.deleteEmailTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (editingTemplate?.id === id) resetEditor();
    } catch (err) {
      console.error('Delete template error:', err);
    }
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find(t => t.id === id);
    if (t) {
      setSendSubject(t.subject);
      setSendHtml(t.html_body);
    }
  };

  const handleSendTest = async () => {
    if (!sendTo || !sendSubject || !sendHtml) return;
    setSending(true);
    setSendResult(null);
    setSendError(null);
    try {
      const result = await adminService.sendTestEmail({ to: sendTo, subject: sendSubject, html: sendHtml });
      setSendResult(result);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const tabClasses = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t
        ? 'bg-[rgb(238,242,255)] text-[rgb(99,102,241)]'
        : 'text-[rgb(107,114,128)] hover:text-[rgb(17,24,39)] hover:bg-[rgb(249,250,251)]'
    }`;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Email Management</h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>Create templates, preview, and send test emails</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ backgroundColor: 'rgb(243,244,246)' }}>
        <button onClick={() => setTab('templates')} className={tabClasses('templates')}>Templates</button>
        <button onClick={() => setTab('send')} className={tabClasses('send')}>Send Test</button>
      </div>

      {tab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template List */}
          <div className="rounded-xl border" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>Saved Templates</h3>
              <button
                onClick={resetEditor}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(238,242,255)', color: 'rgb(99,102,241)' }}
              >
                + New
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgb(243,244,246)' }}>
              {templates.map(t => (
                <div
                  key={t.id}
                  className={`px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-[rgb(249,250,251)] transition-colors ${editingTemplate?.id === t.id ? 'bg-[rgb(238,242,255)]' : ''}`}
                  onClick={() => handleEditTemplate(t)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'rgb(17,24,39)' }}>{t.name}</p>
                    <p className="text-xs truncate" style={{ color: 'rgb(156,163,175)' }}>{t.subject}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                    className="p-1 rounded hover:bg-red-50 transition-colors shrink-0 ml-2"
                    title="Delete template"
                  >
                    <svg className="w-4 h-4 text-[rgb(239,68,68)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="px-5 py-8 text-center text-sm" style={{ color: 'rgb(156,163,175)' }}>No templates yet. Create one to get started.</div>
              )}
            </div>
          </div>

          {/* Template Editor */}
          <div className="rounded-xl border" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: showPreview ? 'rgb(238,242,255)' : 'rgb(243,244,246)', color: showPreview ? 'rgb(99,102,241)' : 'rgb(107,114,128)' }}
                >
                  {showPreview ? 'Editor' : 'Preview'}
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={saving || !templateName || !templateSubject || !templateHtml}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'rgb(99,102,241)' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {showPreview ? (
              <div className="p-5">
                <div className="mb-3">
                  <p className="text-xs font-medium mb-1" style={{ color: 'rgb(107,114,128)' }}>Subject</p>
                  <p className="text-sm" style={{ color: 'rgb(17,24,39)' }}>{templateSubject || '(no subject)'}</p>
                </div>
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'rgb(229,231,235)' }}>
                  <iframe
                    srcDoc={templateHtml || '<p style="color:#999;text-align:center;padding:40px">Paste HTML to preview</p>'}
                    className="w-full min-h-[400px] bg-white"
                    sandbox="allow-same-origin"
                    title="Email preview"
                  />
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Template Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="e.g. Welcome Email"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)]"
                    style={{ borderColor: 'rgb(229,231,235)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Subject Line</label>
                  <input
                    type="text"
                    value={templateSubject}
                    onChange={e => setTemplateSubject(e.target.value)}
                    placeholder="e.g. Welcome to Rekkrd!"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)]"
                    style={{ borderColor: 'rgb(229,231,235)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>HTML Body</label>
                  <textarea
                    value={templateHtml}
                    onChange={e => setTemplateHtml(e.target.value)}
                    placeholder="Paste your HTML email content here..."
                    rows={14}
                    className="w-full px-3 py-2 text-sm border rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)] resize-y"
                    style={{ borderColor: 'rgb(229,231,235)' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send Form */}
          <div className="rounded-xl border" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>Send Test Email</h3>
            </div>
            <div className="p-5 space-y-4">
              {templates.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Load from Template</label>
                  <select
                    value={selectedTemplateId}
                    onChange={e => handleSelectTemplate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)]"
                    style={{ borderColor: 'rgb(229,231,235)' }}
                  >
                    <option value="">— Select a template —</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Recipient Email</label>
                <input
                  type="email"
                  value={sendTo}
                  onChange={e => setSendTo(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)]"
                  style={{ borderColor: 'rgb(229,231,235)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Subject</label>
                <input
                  type="text"
                  value={sendSubject}
                  onChange={e => setSendSubject(e.target.value)}
                  placeholder="Test email subject"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)]"
                  style={{ borderColor: 'rgb(229,231,235)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>HTML Body</label>
                <textarea
                  value={sendHtml}
                  onChange={e => setSendHtml(e.target.value)}
                  placeholder="Paste HTML or load from a template above..."
                  rows={10}
                  className="w-full px-3 py-2 text-sm border rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)] resize-y"
                  style={{ borderColor: 'rgb(229,231,235)' }}
                />
              </div>

              <button
                onClick={handleSendTest}
                disabled={sending || !sendTo || !sendSubject || !sendHtml}
                className="w-full py-2.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            </div>
          </div>

          {/* Preview + Response */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="rounded-xl border" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>Preview</h3>
              </div>
              <div className="p-5">
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'rgb(229,231,235)' }}>
                  <iframe
                    srcDoc={sendHtml || '<p style="color:#999;text-align:center;padding:40px;font-family:sans-serif">Email preview will appear here</p>'}
                    className="w-full min-h-[250px] bg-white"
                    sandbox="allow-same-origin"
                    title="Send preview"
                  />
                </div>
              </div>
            </div>

            {/* Send Result */}
            {(sendResult || sendError) && (
              <div className="rounded-xl border" style={{
                backgroundColor: sendError ? 'rgb(254,242,242)' : 'rgb(240,253,244)',
                borderColor: sendError ? 'rgb(252,165,165)' : 'rgb(134,239,172)',
              }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: sendError ? 'rgb(252,165,165)' : 'rgb(134,239,172)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: sendError ? 'rgb(239,68,68)' : 'rgb(34,197,94)' }}>
                    {sendError ? 'Send Failed' : 'Sent Successfully'}
                  </h3>
                </div>
                <div className="p-5">
                  {sendError ? (
                    <p className="text-sm" style={{ color: 'rgb(239,68,68)' }}>{sendError}</p>
                  ) : sendResult && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="font-medium w-20 shrink-0" style={{ color: 'rgb(107,114,128)' }}>ID</span>
                        <span className="font-mono text-xs break-all" style={{ color: 'rgb(17,24,39)' }}>{sendResult.id}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium w-20 shrink-0" style={{ color: 'rgb(107,114,128)' }}>From</span>
                        <span style={{ color: 'rgb(17,24,39)' }}>{sendResult.from}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium w-20 shrink-0" style={{ color: 'rgb(107,114,128)' }}>To</span>
                        <span style={{ color: 'rgb(17,24,39)' }}>{sendResult.to?.join(', ')}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium w-20 shrink-0" style={{ color: 'rgb(107,114,128)' }}>Subject</span>
                        <span style={{ color: 'rgb(17,24,39)' }}>{sendResult.subject}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium w-20 shrink-0" style={{ color: 'rgb(107,114,128)' }}>Sent at</span>
                        <span style={{ color: 'rgb(17,24,39)' }}>{new Date(sendResult.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailsPage;
