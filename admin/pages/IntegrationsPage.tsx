import React, { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../services/adminService';

// ── Types ────────────────────────────────────────────────────────────

type StripeMode = 'test' | 'live';

interface ModeKeys {
  secret_key: string;
  publishable_key: string;
  webhook_secret: string;
  sellr_webhook_secret: string;
  price_curator_monthly: string;
  price_curator_annual: string;
  price_enthusiast_monthly: string;
  price_enthusiast_annual: string;
}

interface IntegrationStatus {
  name: string;
  key: string;
  status: 'connected' | 'disabled' | 'error';
  details: Record<string, string>;
}

const EMPTY_KEYS: ModeKeys = {
  secret_key: '',
  publishable_key: '',
  webhook_secret: '',
  sellr_webhook_secret: '',
  price_curator_monthly: '',
  price_curator_annual: '',
  price_enthusiast_monthly: '',
  price_enthusiast_annual: '',
};

// ── Status colors ────────────────────────────────────────────────────

const STATUS_COLORS = {
  connected: { bg: 'rgba(34,197,94,0.08)', dot: 'rgb(34,197,94)', border: 'rgba(34,197,94,0.3)', label: 'Connected' },
  disabled:  { bg: 'rgba(234,179,8,0.08)',  dot: 'rgb(234,179,8)', border: 'rgba(234,179,8,0.3)', label: 'Disabled' },
  error:     { bg: 'rgba(239,68,68,0.08)',   dot: 'rgb(239,68,68)', border: 'rgba(239,68,68,0.3)', label: 'Error' },
} as const;

// ── Integration icons (inline SVG paths) ─────────────────────────────

const INTEGRATION_ICONS: Record<string, string> = {
  stripe:  'M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z',
  gemini:  'M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 3.6c2.16 0 4.08.84 5.52 2.16L12 12 6.48 5.76A8.28 8.28 0 0112 3.6zm-8.4 8.4c0-2.16.84-4.08 2.16-5.52L12 12l-5.76 5.52A8.28 8.28 0 013.6 12zm8.4 8.4c-2.16 0-4.08-.84-5.52-2.16L12 12l5.52 6.24A8.28 8.28 0 0112 20.4zm8.4-8.4c0 2.16-.84 4.08-2.16 5.52L12 12l5.76-5.52A8.28 8.28 0 0120.4 12z',
  discogs: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2a10 10 0 110 20 10 10 0 010-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4z',
  resend:  'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
};

// ── Component ────────────────────────────────────────────────────────

const IntegrationsPage: React.FC = () => {
  const [stripeLoading, setStripeLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testingTest, setTestingTest] = useState(false);
  const [testingLive, setTestingLive] = useState(false);
  const [testResult, setTestResult] = useState<{ mode: StripeMode; success: boolean; message: string; details?: Record<string, unknown> } | null>(null);

  const [mode, setMode] = useState<StripeMode>('live');
  const [testKeys, setTestKeys] = useState<ModeKeys>({ ...EMPTY_KEYS });
  const [liveKeys, setLiveKeys] = useState<ModeKeys>({ ...EMPTY_KEYS });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // ── Load Stripe settings ───────────────────────────────────────────

  useEffect(() => {
    adminService.getIntegrationSettings('stripe')
      .then((settings) => {
        setMode((settings.stripe_mode as StripeMode) || 'live');

        const loadKeys = (prefix: string): ModeKeys => ({
          secret_key: (settings[`${prefix}secret_key`] as string) || '',
          publishable_key: (settings[`${prefix}publishable_key`] as string) || '',
          webhook_secret: (settings[`${prefix}webhook_secret`] as string) || '',
          sellr_webhook_secret: (settings[`${prefix}sellr_webhook_secret`] as string) || '',
          price_curator_monthly: (settings[`${prefix}price_curator_monthly`] as string) || '',
          price_curator_annual: (settings[`${prefix}price_curator_annual`] as string) || '',
          price_enthusiast_monthly: (settings[`${prefix}price_enthusiast_monthly`] as string) || '',
          price_enthusiast_annual: (settings[`${prefix}price_enthusiast_annual`] as string) || '',
        });

        setTestKeys(loadKeys('stripe_test_'));
        setLiveKeys(loadKeys('stripe_live_'));
      })
      .catch((err) => console.error('Failed to load Stripe settings:', err))
      .finally(() => setStripeLoading(false));
  }, []);

  // ── Load integration statuses ──────────────────────────────────────

  useEffect(() => {
    adminService.getIntegrationStatus()
      .then(setStatuses)
      .catch((err) => console.error('Failed to load integration status:', err))
      .finally(() => setStatusLoading(false));
  }, []);

  // ── Save ──────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const settings: Record<string, { value: string; dataType: string }> = {
        stripe_mode: { value: mode, dataType: 'string' },
      };

      const addKeys = (prefix: string, keys: ModeKeys) => {
        for (const [k, v] of Object.entries(keys)) {
          settings[`${prefix}${k}`] = { value: v, dataType: 'string' };
        }
      };

      addKeys('stripe_test_', testKeys);
      addKeys('stripe_live_', liveKeys);

      await adminService.saveIntegrationSettings(settings, 'stripe');
      setSaveMessage('Settings saved!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage('Failed to save settings');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [mode, testKeys, liveKeys]);

  // ── Test ──────────────────────────────────────────────────────────

  const handleTest = useCallback(async (testMode: StripeMode) => {
    const setter = testMode === 'test' ? setTestingTest : setTestingLive;
    setter(true);
    setTestResult(null);
    try {
      const key = testMode === 'test' ? testKeys.secret_key : liveKeys.secret_key;
      const result = await adminService.testIntegration('stripe', { secret_key: key });
      setTestResult({ mode: testMode, ...result });
    } catch (err) {
      setTestResult({
        mode: testMode,
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setter(false);
    }
  }, [testKeys.secret_key, liveKeys.secret_key]);

  // ── Mode switch ───────────────────────────────────────────────────

  const handleModeSwitch = useCallback((newMode: StripeMode) => {
    if (newMode === mode) return;
    const confirmed = window.confirm(
      `Switch to ${newMode.toUpperCase()} mode?\n\nThis affects all new checkouts for both Rekkrd and Sellr. In-progress payments will complete in their original mode.`
    );
    if (confirmed) setMode(newMode);
  }, [mode]);

  // ── Helpers ───────────────────────────────────────────────────────

  const toggleShow = (fieldId: string) => {
    setShowSecrets((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const handleCardClick = useCallback((key: string) => {
    setExpandedSection((prev) => (prev === key ? null : key));
    setTimeout(() => {
      document.getElementById(`accordion-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  const toggleSection = useCallback((key: string) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  }, []);

  // ── Loading ───────────────────────────────────────────────────────

  if (stripeLoading || statusLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Helpers for status lookup ─────────────────────────────────────

  const getStatus = (key: string) => statuses.find((s) => s.key === key);

  const getCardDetail = (s: IntegrationStatus): string => {
    if (s.status !== 'connected') return 'Not configured';
    switch (s.key) {
      case 'stripe': return `Mode: ${s.details.mode || 'Live'}`;
      case 'gemini': return `Model: ${s.details.model || 'gemini-2.5-flash'}`;
      case 'discogs': return s.details.user_agent || 'Connected';
      case 'resend': return `From: ${s.details.from_address || 'noreply@rekkrd.com'}`;
      default: return 'Connected';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Integrations</h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>Connect and manage third-party services</p>
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

      {/* ── Status Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statuses.map((s) => (
          <StatusCard
            key={s.key}
            integration={s}
            detail={getCardDetail(s)}
            onClick={() => handleCardClick(s.key)}
          />
        ))}
      </div>

      {/* ── Accordion Sections ────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Stripe */}
        <AccordionSection
          id="accordion-stripe"
          title="Stripe"
          subtitle="Payment processing for Rekkrd and Sellr"
          isExpanded={expandedSection === 'stripe'}
          onToggle={() => toggleSection('stripe')}
          status={getStatus('stripe')?.status}
          iconPath={INTEGRATION_ICONS.stripe}
          iconViewBox="0 0 24 24"
          iconFill
        >
          {/* Mode Toggle */}
          <div className="rounded-xl border mb-6" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: mode === 'live' ? 'rgb(34,197,94)' : 'rgb(234,179,8)' }}
                />
                <div>
                  <span className="text-base font-semibold" style={{ color: 'rgb(17,24,39)' }}>
                    Active Mode: {mode === 'live' ? 'Live' : 'Test'}
                  </span>
                  {mode === 'test' && (
                    <p className="text-xs" style={{ color: 'rgb(234,179,8)' }}>
                      Test mode — no real charges will be processed
                    </p>
                  )}
                </div>
              </div>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgb(209,213,219)' }}>
                <button
                  onClick={() => handleModeSwitch('test')}
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: mode === 'test' ? 'rgb(234,179,8)' : 'transparent',
                    color: mode === 'test' ? 'white' : 'rgb(107,114,128)',
                  }}
                >
                  Test
                </button>
                <button
                  onClick={() => handleModeSwitch('live')}
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: mode === 'live' ? 'rgb(34,197,94)' : 'transparent',
                    color: mode === 'live' ? 'white' : 'rgb(107,114,128)',
                  }}
                >
                  Live
                </button>
              </div>
            </div>
          </div>

          {/* Key Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <KeySection
              title="Test Keys"
              mode="test"
              isActive={mode === 'test'}
              keys={testKeys}
              onChange={setTestKeys}
              showSecrets={showSecrets}
              toggleShow={toggleShow}
              testing={testingTest}
              onTest={() => handleTest('test')}
              testResult={testResult?.mode === 'test' ? testResult : null}
            />
            <KeySection
              title="Live Keys"
              mode="live"
              isActive={mode === 'live'}
              keys={liveKeys}
              onChange={setLiveKeys}
              showSecrets={showSecrets}
              toggleShow={toggleShow}
              testing={testingLive}
              onTest={() => handleTest('live')}
              testResult={testResult?.mode === 'live' ? testResult : null}
            />
          </div>
        </AccordionSection>

        {/* Gemini AI */}
        <AccordionSection
          id="accordion-gemini"
          title="Gemini AI"
          subtitle="Album identification, metadata, and playlists"
          isExpanded={expandedSection === 'gemini'}
          onToggle={() => toggleSection('gemini')}
          status={getStatus('gemini')?.status}
          iconPath={INTEGRATION_ICONS.gemini}
          iconViewBox="0 0 24 24"
          iconFill
        >
          <div className="space-y-3">
            <ReadOnlyField label="Status" value={getStatus('gemini')?.status === 'connected' ? 'Connected' : 'Not configured'} connected={getStatus('gemini')?.status === 'connected'} />
            <ReadOnlyField label="Primary Model" value="gemini-2.5-flash" />
            <ReadOnlyField label="Playlist / Setup Model" value="gemini-3-pro-preview" />
            <ReadOnlyField label="Usage" value="Identify, metadata, playlists, Sellr scan, ad copy, setup guides" />
            <p className="text-xs pt-1" style={{ color: 'rgb(107,114,128)' }}>
              API key managed via server environment variable (GEMINI_API_KEY).
            </p>
          </div>
        </AccordionSection>

        {/* Discogs */}
        <AccordionSection
          id="accordion-discogs"
          title="Discogs"
          subtitle="Market pricing, release data, and cover art"
          isExpanded={expandedSection === 'discogs'}
          onToggle={() => toggleSection('discogs')}
          status={getStatus('discogs')?.status}
          iconPath={INTEGRATION_ICONS.discogs}
          iconViewBox="0 0 24 24"
          iconFill
        >
          <div className="space-y-3">
            <ReadOnlyField label="Status" value={getStatus('discogs')?.status === 'connected' ? 'Connected' : 'Not configured'} connected={getStatus('discogs')?.status === 'connected'} />
            <ReadOnlyField label="User Agent" value={getStatus('discogs')?.details.user_agent || 'Not set'} />
            <ReadOnlyField label="Personal Token" value={getStatus('discogs')?.details.personal_token || 'Not set'} />
            <ReadOnlyField label="OAuth" value={getStatus('discogs')?.details.oauth || 'Not configured'} />
            <ReadOnlyField label="Usage" value="Search, release details, cover art proxy, Sellr pricing" />
            <p className="text-xs pt-1" style={{ color: 'rgb(107,114,128)' }}>
              Managed via server environment variables (DISCOGS_PERSONAL_TOKEN, DISCOGS_USER_AGENT).
            </p>
          </div>
        </AccordionSection>

        {/* Resend */}
        <AccordionSection
          id="accordion-resend"
          title="Resend"
          subtitle="Transactional and marketing emails"
          isExpanded={expandedSection === 'resend'}
          onToggle={() => toggleSection('resend')}
          status={getStatus('resend')?.status}
          iconPath={INTEGRATION_ICONS.resend}
          iconViewBox="0 0 24 24"
        >
          <div className="space-y-3">
            <ReadOnlyField label="Status" value={getStatus('resend')?.status === 'connected' ? 'Connected' : 'Not configured'} connected={getStatus('resend')?.status === 'connected'} />
            <ReadOnlyField label="Rekkrd From Address" value={getStatus('resend')?.details.from_address || 'noreply@rekkrd.com'} />
            <ReadOnlyField label="Sellr From Address" value={getStatus('resend')?.details.sellr_from || 'appraisals@rekkrd.com'} />
            <ReadOnlyField label="Usage" value="Welcome emails, price alerts, subscription confirmations, Sellr order emails" />
            <p className="text-xs pt-1" style={{ color: 'rgb(107,114,128)' }}>
              API key managed via server environment variable (RESEND_API_KEY).
            </p>
          </div>
        </AccordionSection>
      </div>

      {/* Save feedback toast */}
      {saveMessage && (
        <div
          className="fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 text-sm font-medium text-white"
          style={{
            backgroundColor: saveMessage.includes('Failed') ? 'rgb(239,68,68)' : 'rgb(34,197,94)',
          }}
        >
          {saveMessage}
        </div>
      )}
    </div>
  );
};

// ── Status Card ─────────────────────────────────────────────────────

const StatusCard: React.FC<{
  integration: IntegrationStatus;
  detail: string;
  onClick: () => void;
}> = ({ integration, detail, onClick }) => {
  const { name, key, status } = integration;
  const colors = STATUS_COLORS[status];
  const iconPath = INTEGRATION_ICONS[key];

  return (
    <button
      onClick={onClick}
      className="rounded-xl border p-4 text-left transition-all hover:shadow-sm cursor-pointer"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        {iconPath && (
          <svg
            className="w-5 h-5"
            viewBox={key === 'resend' ? '0 0 24 24' : '0 0 24 24'}
            fill={key === 'resend' ? 'none' : 'currentColor'}
            stroke={key === 'resend' ? 'currentColor' : 'none'}
            strokeWidth={key === 'resend' ? 1.5 : undefined}
            style={{ color: 'rgb(107,114,128)' }}
            aria-hidden="true"
          >
            <path
              d={iconPath}
              strokeLinecap={key === 'resend' ? 'round' : undefined}
              strokeLinejoin={key === 'resend' ? 'round' : undefined}
            />
          </svg>
        )}
        <span className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
        <span className="text-xs font-medium" style={{ color: colors.dot }}>{colors.label}</span>
      </div>
      <p className="text-xs mt-1 truncate" style={{ color: 'rgb(107,114,128)' }}>{detail}</p>
    </button>
  );
};

// ── Accordion Section ────────────────────────────────────────────────

const AccordionSection: React.FC<{
  id: string;
  title: string;
  subtitle: string;
  isExpanded: boolean;
  onToggle: () => void;
  status?: 'connected' | 'disabled' | 'error';
  iconPath?: string;
  iconViewBox?: string;
  iconFill?: boolean;
  children: React.ReactNode;
}> = ({ id, title, subtitle, isExpanded, onToggle, status = 'disabled', iconPath, iconViewBox = '0 0 24 24', iconFill, children }) => {
  const dotColor = STATUS_COLORS[status].dot;

  return (
    <div
      id={id}
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors"
        style={{ backgroundColor: isExpanded ? 'rgb(249,250,251)' : 'transparent' }}
      >
        <div className="flex items-center gap-3">
          {iconPath && (
            <svg
              className="w-5 h-5"
              viewBox={iconViewBox}
              fill={iconFill ? 'currentColor' : 'none'}
              stroke={iconFill ? 'none' : 'currentColor'}
              strokeWidth={iconFill ? undefined : 1.5}
              style={{ color: 'rgb(107,114,128)' }}
              aria-hidden="true"
            >
              <path
                d={iconPath}
                strokeLinecap={iconFill ? undefined : 'round'}
                strokeLinejoin={iconFill ? undefined : 'round'}
              />
            </svg>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold" style={{ color: 'rgb(17,24,39)' }}>{title}</span>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
              <span className="text-xs font-medium" style={{ color: dotColor }}>{STATUS_COLORS[status].label}</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(107,114,128)' }}>{subtitle}</p>
          </div>
        </div>
        <svg
          className="w-5 h-5 transition-transform flex-shrink-0"
          style={{
            color: 'rgb(156,163,175)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-6 pb-6 pt-4 border-t" style={{ borderColor: 'rgb(229,231,235)' }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ── Key Section (Stripe) ─────────────────────────────────────────────

interface KeySectionProps {
  title: string;
  mode: StripeMode;
  isActive: boolean;
  keys: ModeKeys;
  onChange: React.Dispatch<React.SetStateAction<ModeKeys>>;
  showSecrets: Record<string, boolean>;
  toggleShow: (id: string) => void;
  testing: boolean;
  onTest: () => void;
  testResult: { success: boolean; message: string; details?: Record<string, unknown> } | null;
}

const KeySection: React.FC<KeySectionProps> = ({
  title, mode, isActive, keys, onChange, showSecrets, toggleShow, testing, onTest, testResult,
}) => {
  const update = (field: keyof ModeKeys, value: string) => {
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  const borderColor = isActive ? 'rgb(99,102,241)' : 'rgb(229,231,235)';

  return (
    <div
      className="rounded-xl border"
      style={{ backgroundColor: 'rgb(255,255,255)', borderColor, borderWidth: isActive ? 2 : 1 }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold" style={{ color: 'rgb(17,24,39)' }}>{title}</h3>
          {isActive && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgb(238,242,255)', color: 'rgb(99,102,241)' }}
            >
              Active
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(107,114,128)' }}>
          API Keys
        </h4>
        <SecretField label="Secret Key" id={`${mode}_sk`} value={keys.secret_key} show={showSecrets[`${mode}_sk`]} onToggle={() => toggleShow(`${mode}_sk`)} onChange={(v) => update('secret_key', v)} placeholder={`sk_${mode}_...`} />
        <SecretField label="Publishable Key" id={`${mode}_pk`} value={keys.publishable_key} show={showSecrets[`${mode}_pk`]} onToggle={() => toggleShow(`${mode}_pk`)} onChange={(v) => update('publishable_key', v)} placeholder={`pk_${mode}_...`} />

        <h4 className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: 'rgb(107,114,128)' }}>
          Webhook Secrets
        </h4>
        <SecretField label="Rekkrd (Subscriptions)" id={`${mode}_wh`} value={keys.webhook_secret} show={showSecrets[`${mode}_wh`]} onToggle={() => toggleShow(`${mode}_wh`)} onChange={(v) => update('webhook_secret', v)} placeholder="whsec_..." />
        <SecretField label="Sellr (Payments)" id={`${mode}_swh`} value={keys.sellr_webhook_secret} show={showSecrets[`${mode}_swh`]} onToggle={() => toggleShow(`${mode}_swh`)} onChange={(v) => update('sellr_webhook_secret', v)} placeholder="whsec_..." />

        <h4 className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: 'rgb(107,114,128)' }}>
          Price IDs
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Curator Monthly" value={keys.price_curator_monthly} onChange={(v) => update('price_curator_monthly', v)} placeholder="price_..." />
          <TextField label="Curator Annual" value={keys.price_curator_annual} onChange={(v) => update('price_curator_annual', v)} placeholder="price_..." />
          <TextField label="Enthusiast Monthly" value={keys.price_enthusiast_monthly} onChange={(v) => update('price_enthusiast_monthly', v)} placeholder="price_..." />
          <TextField label="Enthusiast Annual" value={keys.price_enthusiast_annual} onChange={(v) => update('price_enthusiast_annual', v)} placeholder="price_..." />
        </div>

        {/* Test + Result */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onTest}
            disabled={testing || !keys.secret_key}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ borderColor: 'rgb(209,213,219)', color: 'rgb(55,65,81)' }}
          >
            {testing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>

        {testResult && (
          <div
            className="rounded-lg text-sm overflow-hidden"
            style={{
              backgroundColor: testResult.success ? 'rgb(240,253,244)' : 'rgb(254,242,242)',
              color: testResult.success ? 'rgb(22,101,52)' : 'rgb(153,27,27)',
            }}
          >
            <div className="px-4 py-3 font-medium flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: testResult.success ? 'rgb(34,197,94)' : 'rgb(239,68,68)' }}
              />
              {testResult.message}
            </div>
            {testResult.details && (
              <div
                className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs"
                style={{ color: testResult.success ? 'rgb(22,101,52)' : 'rgb(153,27,27)', opacity: 0.85 }}
              >
                {Object.entries(testResult.details).map(([key, value]) => {
                  // Format balance arrays nicely
                  if (Array.isArray(value)) {
                    const formatted = value.map((b: { amount: string; currency: string }) => `${b.currency} ${b.amount}`).join(', ') || 'None';
                    return (
                      <React.Fragment key={key}>
                        <span className="font-medium" style={{ opacity: 0.7 }}>{key.replace(/_/g, ' ')}</span>
                        <span className="font-mono">{formatted}</span>
                      </React.Fragment>
                    );
                  }
                  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value ?? 'N/A');
                  return (
                    <React.Fragment key={key}>
                      <span className="font-medium" style={{ opacity: 0.7 }}>{key.replace(/_/g, ' ')}</span>
                      <span className="font-mono">{display}</span>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Field Components ─────────────────────────────────────────────────

const SecretField: React.FC<{
  label: string;
  id: string;
  value: string;
  show?: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, show, onToggle, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(55,65,81)' }}>{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2"
        style={{ borderColor: 'rgb(209,213,219)', color: 'rgb(17,24,39)' }}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2"
        style={{ color: 'rgb(156,163,175)' }}
        title={show ? 'Hide' : 'Show'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {show ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
          ) : (
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </>
          )}
        </svg>
      </button>
    </div>
  </div>
);

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs font-medium mb-1" style={{ color: 'rgb(55,65,81)' }}>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
      style={{ borderColor: 'rgb(209,213,219)', color: 'rgb(17,24,39)' }}
    />
  </div>
);

const ReadOnlyField: React.FC<{
  label: string;
  value: string;
  connected?: boolean;
}> = ({ label, value, connected }) => (
  <div>
    <label className="block text-xs font-medium mb-0.5" style={{ color: 'rgb(107,114,128)' }}>{label}</label>
    <div
      className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
      style={{ borderColor: 'rgb(229,231,235)', color: 'rgb(17,24,39)', backgroundColor: 'rgb(249,250,251)' }}
    >
      {connected !== undefined && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: connected ? 'rgb(34,197,94)' : 'rgb(234,179,8)' }}
        />
      )}
      {value}
    </div>
  </div>
);

export default IntegrationsPage;
