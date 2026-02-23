import React, { useState, useMemo } from 'react';
import { CheckCircle2, Download, ArrowUp, Copy } from 'lucide-react';
import type { SellrSession, SellrRecord } from '../types';

type ExportFormat = 'individual' | 'collection';

interface CopyExportProps {
  session: SellrSession;
  records: SellrRecord[];
  sessionId: string;
}

function buildIndividualText(records: SellrRecord[]): string {
  return records
    .filter(r => r.ad_copy)
    .map(r => {
      const year = r.year ?? 'Unknown';
      const price = r.price_median != null ? `$${r.price_median}` : 'N/A';
      return [
        `--- ${r.artist} - ${r.title} (${year}) ---`,
        `Condition: ${r.condition} | Est. Value: ${price}`,
        '',
        r.ad_copy,
        '',
        '================',
      ].join('\n');
    })
    .join('\n\n');
}

const CopyExport: React.FC<CopyExportProps> = ({ session, records, sessionId }) => {
  const [format, setFormat] = useState<ExportFormat>('individual');
  const [copied, setCopied] = useState(false);

  const recordsWithCopy = useMemo(() => records.filter(r => r.ad_copy), [records]);
  const skippedCount = records.length - recordsWithCopy.length;
  const hasCollectionCopy = !!session.collection_ad_copy;
  const hasAnyCopy = recordsWithCopy.length > 0 || hasCollectionCopy;

  const previewText = useMemo(() => {
    if (format === 'collection') {
      return session.collection_ad_copy ?? '';
    }
    return buildIndividualText(records);
  }, [format, records, session.collection_ad_copy]);

  // Don't render if nothing to export
  if (!hasAnyCopy) return null;

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = previewText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([previewText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sellr-ad-copy-${sessionId.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Effective format — fall back to individual if collection selected but no copy
  const activeFormat = format === 'collection' && !hasCollectionCopy ? 'individual' : format;
  const displayText = activeFormat === 'collection'
    ? session.collection_ad_copy ?? ''
    : buildIndividualText(records);
  const copyCount = activeFormat === 'individual' ? recordsWithCopy.length : 1;

  return (
    <div className="bg-sellr-surface rounded-lg p-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h3 className="font-display text-xl text-sellr-charcoal">Export Your Ad Copy</h3>
        <p className="text-sm text-sellr-charcoal/50 mt-1">
          {recordsWithCopy.length} record{recordsWithCopy.length !== 1 ? 's' : ''} with copy ready
        </p>
      </div>

      {/* ── Format Selector ─────────────────────────────────────────── */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setFormat('individual')}
          className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
            format === 'individual'
              ? 'bg-sellr-blue text-white'
              : 'border border-sellr-blue/30 text-sellr-blue hover:border-sellr-blue'
          }`}
        >
          Individual Listings
        </button>
        <div className="relative flex-1">
          <button
            onClick={() => hasCollectionCopy && setFormat('collection')}
            className={`w-full rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
              !hasCollectionCopy
                ? 'border border-sellr-charcoal/10 text-sellr-charcoal/30 cursor-not-allowed'
                : format === 'collection'
                  ? 'bg-sellr-blue text-white'
                  : 'border border-sellr-blue/30 text-sellr-blue hover:border-sellr-blue'
            }`}
            disabled={!hasCollectionCopy}
          >
            Collection Post
          </button>
          {!hasCollectionCopy && (
            <span className="absolute -bottom-5 left-0 right-0 text-[10px] text-sellr-charcoal/40 text-center">
              Generate a collection post above first
            </span>
          )}
        </div>
      </div>

      {/* Extra spacing when tooltip is shown */}
      {!hasCollectionCopy && <div className="h-2" />}

      {/* ── Preview Area ────────────────────────────────────────────── */}
      {displayText ? (
        <>
          <div className="max-h-96 overflow-y-auto bg-sellr-bg rounded-lg p-4 text-sm text-sellr-charcoal/80 leading-relaxed whitespace-pre-wrap font-mono">
            {displayText}
          </div>

          {activeFormat === 'individual' && skippedCount > 0 && (
            <p className="text-xs text-sellr-charcoal/40 mt-2">
              {skippedCount} record{skippedCount !== 1 ? 's' : ''} have no copy yet &mdash; generate them above.
            </p>
          )}

          {/* ── Action Buttons ──────────────────────────────────────── */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleCopyToClipboard}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded transition-colors ${
                copied
                  ? 'bg-sellr-sage text-white'
                  : 'bg-sellr-amber text-white hover:bg-sellr-amber-light'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Copied! {copyCount} listing{copyCount !== 1 ? 's' : ''}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy All to Clipboard
                </>
              )}
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-sellr-blue/30 text-sellr-blue rounded hover:border-sellr-blue transition-colors"
            >
              <Download className="w-4 h-4" />
              Download as .txt
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <ArrowUp className="w-5 h-5 text-sellr-charcoal/30 mx-auto mb-2" />
          <p className="text-sm text-sellr-charcoal/40">
            No ad copy generated yet. Use the tools above to write your listings.
          </p>
        </div>
      )}
    </div>
  );
};

export default CopyExport;
