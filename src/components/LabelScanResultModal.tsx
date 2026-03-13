import React, { useState, useRef } from 'react';
import { Disc3, Tag, Search, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

// ── Props ────────────────────────────────────────────────────────────

export interface LabelScanResultModalProps {
  isOpen: boolean;
  brand: 'rekkrd' | 'sellr' | 'spennd';
  catalogNumber: string | null;
  labelName: string | null;
  artist: string | null;
  title: string | null;
  year: string | null;
  side: string | null;
  confidenceScore: number;
  discogsMatch: {
    artist: string;
    title: string;
    label: string;
    year: string;
    thumb: string | null;
  } | null;
  showMatrix?: boolean;
  confirmLabel?: string;
  onConfirm: (matrix: string) => void;
  onRetry: () => void;
  onCancel: () => void;
}

// ── Brand tokens ─────────────────────────────────────────────────────

interface BrandTokens {
  headerBg: string;
  accentColor: string;
  bodyBg: string;
  textPrimary: string;
  textMuted: string;
  fieldBg: string;
  fieldBorder: string;
  btnGradient: string;
  icon: React.FC<{ className?: string }>;
  dark: boolean;
  name: string;
}

const BRAND_TOKENS: Record<string, BrandTokens> = {
  rekkrd: {
    headerBg: '#110900',
    accentColor: '#e8722a',
    bodyBg: '#141414',
    textPrimary: '#fdf0e8',
    textMuted: '#a06040',
    fieldBg: 'rgba(232,114,42,0.05)',
    fieldBorder: 'rgba(232,114,42,0.12)',
    btnGradient: 'linear-gradient(135deg, #e8722a, #c05518)',
    icon: Disc3,
    dark: true,
    name: 'Rekkrd',
  },
  sellr: {
    headerBg: '#111820',
    accentColor: '#4a7fa5',
    bodyBg: '#f4f6f9',
    textPrimary: '#1e2a3a',
    textMuted: '#7a9ab0',
    fieldBg: '#ffffff',
    fieldBorder: 'rgba(74,127,165,0.15)',
    btnGradient: 'linear-gradient(135deg, #4a7fa5, #2d5f82)',
    icon: Tag,
    dark: false,
    name: 'Sellr',
  },
  spennd: {
    headerBg: '#2a4232',
    accentColor: '#5a8a6e',
    bodyBg: '#f4f7f4',
    textPrimary: '#1a2a1e',
    textMuted: '#8aaa90',
    fieldBg: '#ffffff',
    fieldBorder: 'rgba(90,138,110,0.15)',
    btnGradient: 'linear-gradient(135deg, #5a8a6e, #3d6b52)',
    icon: Search,
    dark: false,
    name: 'Spennd',
  },
};

// ── Component ────────────────────────────────────────────────────────

const LabelScanResultModal: React.FC<LabelScanResultModalProps> = ({
  isOpen,
  brand,
  catalogNumber,
  labelName,
  artist,
  title,
  year,
  side,
  confidenceScore,
  discogsMatch,
  showMatrix = false,
  confirmLabel = 'Confirm',
  onConfirm,
  onRetry,
  onCancel,
}) => {
  const [matrixInput, setMatrixInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, onCancel);

  if (!isOpen) return null;

  const t = BRAND_TOKENS[brand];
  const Icon = t.icon;

  const confidencePct = Math.round(confidenceScore * 100);
  const pillColor = confidenceScore >= 0.8
    ? 'bg-green-100 text-green-700'
    : 'bg-amber-100 text-amber-700';
  const dotColor = confidenceScore >= 0.8 ? 'bg-green-500' : 'bg-amber-500';

  const labelFields: { key: string; value: string }[] = [];
  if (catalogNumber) labelFields.push({ key: 'Catalog No', value: catalogNumber });
  if (labelName) labelFields.push({ key: 'Label', value: labelName });
  if (side) labelFields.push({ key: 'Side', value: side });
  if (year) labelFields.push({ key: 'Year', value: year });

  const hasArtistTitle = artist || title;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lsrm-heading"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl focus:outline-none"
        style={{ backgroundColor: t.bodyBg }}
      >
        {/* ── Brand header ───────────────────────────────────── */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{
            backgroundColor: t.headerBg,
            borderBottom: `3px solid ${t.accentColor}`,
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${t.accentColor}20` }}
          >
            <span style={{ color: t.accentColor }}><Icon className="w-5 h-5" /></span>
          </div>
          <div>
            <p
              className="text-lg font-semibold leading-tight"
              style={{ color: t.dark ? t.textPrimary : '#ffffff', fontFamily: 'serif' }}
            >
              {t.name}
            </p>
            <p
              className="text-[11px] uppercase tracking-wider"
              style={{ color: t.dark ? t.textMuted : 'rgba(255,255,255,0.5)' }}
            >
              Label Scan
            </p>
          </div>
        </div>

        {/* ── Body with watermark ─────────────────────────────── */}
        <div className="relative">
          {/* SVG vinyl watermark */}
          <svg
            viewBox="0 0 320 320"
            className="absolute inset-0 m-auto pointer-events-none z-0"
            width="320"
            height="320"
            style={{ opacity: 0.04 }}
          >
            <circle cx="160" cy="160" r="90" fill="none" stroke={t.accentColor} strokeWidth="1.5" />
            <circle cx="160" cy="160" r="65" fill="none" stroke={t.accentColor} strokeWidth="1" />
            <circle cx="160" cy="160" r="40" fill="none" stroke={t.accentColor} strokeWidth="1" />
            <circle cx="160" cy="160" r="18" fill="none" stroke={t.accentColor} strokeWidth="1" />
            <circle cx="160" cy="160" r="6" fill={t.accentColor} />
            <line x1="70" y1="160" x2="250" y2="160" stroke={t.accentColor} strokeWidth="0.5" />
            <line x1="160" y1="70" x2="160" y2="250" stroke={t.accentColor} strokeWidth="0.5" />
          </svg>

          <div className="relative z-10 p-6 space-y-5">
            {/* ── Heading + confidence ───────────────────────── */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2
                  id="lsrm-heading"
                  className="text-xl font-semibold"
                  style={{ color: t.textPrimary, fontFamily: "'DM Serif Display', serif" }}
                >
                  Here's what we found
                </h2>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${pillColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                  {confidencePct}%
                </span>
              </div>
              <p className="text-sm mt-1" style={{ color: t.textMuted }}>
                Extracted from the label photo
              </p>
            </div>

            {/* ── Label fields grid ──────────────────────────── */}
            {(labelFields.length > 0 || hasArtistTitle) && (
              <div className="space-y-2">
                {/* 2-col grid for short fields */}
                {labelFields.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {labelFields.map((f) => (
                      <div
                        key={f.key}
                        className="rounded-xl px-3 py-2.5"
                        style={{
                          backgroundColor: t.fieldBg,
                          border: `1px solid ${t.fieldBorder}`,
                        }}
                      >
                        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: t.textMuted }}>
                          {f.key}
                        </p>
                        <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                          {f.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Full-width artist/title */}
                {hasArtistTitle && (
                  <div
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: t.fieldBg,
                      border: `1px solid ${t.fieldBorder}`,
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: t.textMuted }}>
                      Artist / Title
                    </p>
                    <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                      {artist || 'Unknown'} — {title || 'Unknown'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Divider ────────────────────────────────────── */}
            <div style={{ height: 1, backgroundColor: t.accentColor, opacity: 0.1 }} />

            {/* ── Discogs match ───────────────────────────────── */}
            {discogsMatch && (
              <div
                className="flex items-center gap-3 rounded-xl px-3 py-3"
                style={{
                  backgroundColor: t.fieldBg,
                  border: `1px solid ${t.fieldBorder}`,
                }}
              >
                {discogsMatch.thumb ? (
                  <img
                    src={discogsMatch.thumb}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: `${t.accentColor}10` }}
                  >
                    <Disc3 className="w-6 h-6" style={{ color: t.textMuted }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: t.textMuted }}>
                    Discogs Match
                  </p>
                  <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                    {discogsMatch.artist} — {discogsMatch.title}
                  </p>
                  <p className="text-xs truncate" style={{ color: t.textMuted }}>
                    {[discogsMatch.label, discogsMatch.year].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            )}

            {/* ── Matrix input ───────────────────────────────── */}
            {showMatrix && (
              <div>
                <label
                  htmlFor="lsrm-matrix"
                  className="block text-[10px] uppercase tracking-wide mb-1.5 font-medium"
                  style={{ color: t.textMuted }}
                >
                  Matrix / Runout (optional)
                </label>
                <input
                  id="lsrm-matrix"
                  type="text"
                  value={matrixInput}
                  onChange={(e) => setMatrixInput(e.target.value)}
                  placeholder="e.g. XSM-65637-1A VAN GELDER"
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{
                    backgroundColor: t.fieldBg,
                    border: `1px solid ${t.fieldBorder}`,
                    color: t.textPrimary,
                  }}
                />
              </div>
            )}

            {/* ── Buttons ────────────────────────────────────── */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onConfirm(matrixInput.trim())}
                className="flex-1 py-3 px-4 min-h-[44px] rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: t.btnGradient }}
              >
                {confirmLabel}
              </button>
              <button
                onClick={onRetry}
                className="py-3 px-4 min-h-[44px] rounded-xl text-sm font-medium transition-colors"
                style={{
                  color: t.textMuted,
                  border: `1px solid ${t.fieldBorder}`,
                  backgroundColor: 'transparent',
                }}
              >
                Try Again
              </button>
              <button
                onClick={onCancel}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-opacity hover:opacity-70 flex-shrink-0"
                style={{ color: t.textMuted }}
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelScanResultModal;
