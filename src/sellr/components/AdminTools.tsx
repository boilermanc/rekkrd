import React, { useState, useEffect, useRef } from 'react';
import { Wrench, XCircle, RotateCcw, RefreshCw, Loader2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

interface AdminToolsProps {
  authToken: string;
}

type EmailType = 'session_created' | 'payment_confirmed' | 'abandoned_session' | 'rekkrd_conversion' | 'admin_alert';

const EMAIL_TYPES: { value: EmailType; label: string }[] = [
  { value: 'session_created', label: 'Session Created' },
  { value: 'payment_confirmed', label: 'Payment Confirmed' },
  { value: 'abandoned_session', label: 'Abandoned Session' },
  { value: 'rekkrd_conversion', label: 'Rekkrd Conversion' },
  { value: 'admin_alert', label: 'Admin Alert' },
];

// ── Helpers ──────────────────────────────────────────────────────────

async function postTool(
  path: string,
  body: Record<string, string>,
  authToken: string,
): Promise<{ success: boolean; message?: string; refund_id?: string; new_token?: string }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Component ────────────────────────────────────────────────────────

const AdminTools: React.FC<AdminToolsProps> = ({ authToken }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ResendEmailCard authToken={authToken} />
      <ExpireSessionCard authToken={authToken} />
      <RefundOrderCard authToken={authToken} />
      <RegenerateTokenCard authToken={authToken} />
    </div>
  );
};

// ── Card wrapper ─────────────────────────────────────────────────────

const Card: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
    </div>
    {children}
  </div>
);

// ── Result display ───────────────────────────────────────────────────

const Result: React.FC<{ success: boolean | null; message: string }> = ({ success, message }) => {
  if (success === null) return null;
  return (
    <p className={`mt-3 text-sm ${success ? 'text-green-600' : 'text-red-500'}`}>
      {message}
    </p>
  );
};

// ── 1. Resend Email ──────────────────────────────────────────────────

const ResendEmailCard: React.FC<{ authToken: string }> = ({ authToken }) => {
  const [sessionId, setSessionId] = useState('');
  const [emailType, setEmailType] = useState<EmailType>('session_created');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async () => {
    setBusy(true);
    try {
      const data = await postTool('/api/sellr/admin/tools/resend-email', {
        session_id: sessionId.trim(),
        email_type: emailType,
      }, authToken);
      setResult({ success: data.success, message: data.message ?? (data.success ? 'Sent successfully.' : 'Failed') });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card icon={<Wrench size={16} className="text-amber-500" />} title="Resend Email">
      <input
        type="text"
        placeholder="Session ID"
        value={sessionId}
        onChange={e => { setSessionId(e.target.value); setResult(null); }}
        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <select
        value={emailType}
        onChange={e => { setEmailType(e.target.value as EmailType); setResult(null); }}
        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {EMAIL_TYPES.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <button
        onClick={handleSend}
        disabled={busy || !sessionId.trim()}
        className="px-4 py-1.5 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        Send
      </button>
      {result && <Result success={result.success} message={result.message} />}
    </Card>
  );
};

// ── 2. Expire Session ────────────────────────────────────────────────

const ExpireSessionCard: React.FC<{ authToken: string }> = ({ authToken }) => {
  const [sessionId, setSessionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => { if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current); };
  }, []);

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true);
      confirmTimerRef.current = setTimeout(() => setConfirming(false), 5000);
      return;
    }
    doExpire();
  };

  const doExpire = async () => {
    setConfirming(false);
    setBusy(true);
    try {
      const data = await postTool('/api/sellr/admin/tools/expire-session', {
        session_id: sessionId.trim(),
      }, authToken);
      setResult({ success: data.success, message: data.success ? 'Session expired.' : (data.message ?? 'Failed') });
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card icon={<XCircle size={16} className="text-red-500" />} title="Expire Session">
      <input
        type="text"
        placeholder="Session ID"
        value={sessionId}
        onChange={e => { setSessionId(e.target.value); setResult(null); setConfirming(false); }}
        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      {confirming && (
        <p className="text-xs text-red-500 mb-2">Are you sure? This cannot be undone.</p>
      )}
      <button
        onClick={handleClick}
        disabled={busy || !sessionId.trim()}
        className="px-4 py-1.5 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        {confirming ? 'Confirm Expire' : 'Expire'}
      </button>
      {result && <Result success={result.success} message={result.message} />}
    </Card>
  );
};

// ── 3. Issue Refund ──────────────────────────────────────────────────

const RefundOrderCard: React.FC<{ authToken: string }> = ({ authToken }) => {
  const [orderId, setOrderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => { if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current); };
  }, []);

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true);
      confirmTimerRef.current = setTimeout(() => setConfirming(false), 5000);
      return;
    }
    doRefund();
  };

  const doRefund = async () => {
    setConfirming(false);
    setBusy(true);
    try {
      const data = await postTool('/api/sellr/admin/tools/refund-order', {
        order_id: orderId.trim(),
      }, authToken);
      if (data.success) {
        setResult({ success: true, message: `Refunded. ID: ${data.refund_id}` });
      } else {
        setResult({ success: false, message: data.message ?? 'Refund failed' });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card icon={<RotateCcw size={16} className="text-red-500" />} title="Issue Full Refund">
      <input
        type="text"
        placeholder="Order ID"
        value={orderId}
        onChange={e => { setOrderId(e.target.value); setResult(null); setConfirming(false); }}
        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      {confirming && (
        <p className="text-xs text-red-500 mb-2">Are you sure? This will issue a full Stripe refund.</p>
      )}
      <button
        onClick={handleClick}
        disabled={busy || !orderId.trim()}
        className="px-4 py-1.5 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        {confirming ? 'Confirm Refund' : 'Refund'}
      </button>
      {result && (
        <p className={`mt-3 text-sm ${result.success ? 'text-green-600' : 'text-red-500'}`}>
          {result.success ? (
            <span>{result.message.split('ID: ')[0]}ID: <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{result.message.split('ID: ')[1]}</code></span>
          ) : result.message}
        </p>
      )}
    </Card>
  );
};

// ── 4. Regenerate Report Token ───────────────────────────────────────

const RegenerateTokenCard: React.FC<{ authToken: string }> = ({ authToken }) => {
  const [orderId, setOrderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRegenerate = async () => {
    setBusy(true);
    setNewUrl(null);
    try {
      const data = await postTool('/api/sellr/admin/tools/regenerate-report-token', {
        order_id: orderId.trim(),
      }, authToken);
      if (data.success && data.new_token) {
        const baseUrl = window.location.origin;
        setNewUrl(`${baseUrl}/sellr/report?token=${data.new_token}`);
        setResult({ success: true, message: 'Token regenerated.' });
      } else {
        setResult({ success: false, message: data.message ?? 'Failed' });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!newUrl) return;
    try {
      await navigator.clipboard.writeText(newUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
    }
  };

  return (
    <Card icon={<RefreshCw size={16} className="text-indigo-500" />} title="Regenerate Report Link">
      <input
        type="text"
        placeholder="Order ID"
        value={orderId}
        onChange={e => { setOrderId(e.target.value); setResult(null); setNewUrl(null); }}
        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <button
        onClick={handleRegenerate}
        disabled={busy || !orderId.trim()}
        className="px-4 py-1.5 text-sm font-medium rounded-lg border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        Regenerate
      </button>
      {result && !newUrl && <Result success={result.success} message={result.message} />}
      {newUrl && (
        <div className="mt-3">
          <p className="text-xs text-green-600 mb-1">Token regenerated. New report URL:</p>
          <div className="flex gap-1">
            <input
              type="text"
              readOnly
              value={newUrl}
              className="flex-1 px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded text-gray-700 truncate"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="px-2 py-1 text-xs font-medium rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AdminTools;
