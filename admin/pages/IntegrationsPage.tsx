import React, { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../services/adminService';

const IntegrationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);

  // Load settings on mount
  useEffect(() => {
    adminService.getIntegrationSettings()
      .then((settings) => {
        setSlackEnabled(settings.slack_enabled ?? false);
        setSlackWebhookUrl(settings.slack_webhook_url ?? '');
      })
      .catch((err) => console.error('Failed to load integration settings:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await adminService.saveIntegrationSettings({
        slack_enabled: { value: slackEnabled, dataType: 'boolean' },
        slack_webhook_url: { value: slackWebhookUrl, dataType: 'string' },
      });
      setSaveMessage('Settings saved!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage('Failed to save settings');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [slackEnabled, slackWebhookUrl]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await adminService.testIntegration('slack', {
        webhook_url: slackWebhookUrl,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  }, [slackWebhookUrl]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Integrations</h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>Connect external services to Rekkrd</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'rgb(99,102,241)', color: 'white' }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Slack Card */}
      <div className="rounded-xl border" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(238,242,255)' }}>
              {/* Slack-style hash icon */}
              <svg className="w-5 h-5" style={{ color: 'rgb(99,102,241)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'rgb(17,24,39)' }}>Slack</h3>
              <p className="text-xs" style={{ color: 'rgb(107,114,128)' }}>Send notifications to a Slack channel via Incoming Webhook</p>
            </div>
          </div>

          {/* Enable toggle */}
          <button
            onClick={() => setSlackEnabled(!slackEnabled)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{ backgroundColor: slackEnabled ? 'rgb(99,102,241)' : 'rgb(209,213,219)' }}
            role="switch"
            aria-checked={slackEnabled}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm"
              style={{ transform: slackEnabled ? 'translateX(22px)' : 'translateX(4px)' }}
            />
          </button>
        </div>

        {/* Card Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(55,65,81)' }}>
              Webhook URL
            </label>
            <div className="relative">
              <input
                type={showWebhookUrl ? 'text' : 'password'}
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                className="w-full px-4 py-2.5 pr-12 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'rgb(209,213,219)',
                  color: 'rgb(17,24,39)',
                  backgroundColor: 'rgb(255,255,255)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgb(156,163,175)' }}
                title={showWebhookUrl ? 'Hide URL' : 'Show URL'}
              >
                {showWebhookUrl ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'rgb(156,163,175)' }}>
              Create one at <span className="font-medium">api.slack.com/apps</span> &rarr; Incoming Webhooks
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: slackEnabled && slackWebhookUrl
                  ? 'rgb(34,197,94)'
                  : slackEnabled
                    ? 'rgb(234,179,8)'
                    : 'rgb(209,213,219)',
              }}
            />
            <span className="text-xs" style={{ color: 'rgb(107,114,128)' }}>
              {slackEnabled && slackWebhookUrl
                ? 'Configured'
                : slackEnabled
                  ? 'Enabled but no webhook URL'
                  : 'Disabled'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleTest}
              disabled={testing || !slackWebhookUrl}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{ borderColor: 'rgb(209,213,219)', color: 'rgb(55,65,81)' }}
            >
              {testing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Test Connection
                </>
              )}
            </button>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className="flex items-start gap-2 px-4 py-3 rounded-lg text-sm"
              style={{
                backgroundColor: testResult.success ? 'rgb(240,253,244)' : 'rgb(254,242,242)',
                color: testResult.success ? 'rgb(22,101,52)' : 'rgb(153,27,27)',
              }}
            >
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {testResult.success ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Save feedback toast */}
      {saveMessage && (
        <div
          className="fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 text-sm font-medium text-white"
          style={{
            backgroundColor: saveMessage.includes('Failed') ? 'rgb(239,68,68)' : 'rgb(34,197,94)',
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {saveMessage.includes('Failed') ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          {saveMessage}
        </div>
      )}
    </div>
  );
};

export default IntegrationsPage;
