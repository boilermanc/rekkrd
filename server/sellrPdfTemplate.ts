// ── Sellr PDF Template ──────────────────────────────────────────────
// Returns a self-contained HTML string (inline CSS only) for Puppeteer
// to render as a printable PDF.

interface PdfRecord {
  artist: string;
  title: string;
  year: number | null;
  condition: string;
  price_low: number | null;
  price_median: number | null;
  price_high: number | null;
  ad_copy: string | null;
}

interface PdfSession {
  record_count: number;
}

interface PdfOrder {
  created_at: string;
}

interface PdfInput {
  session: PdfSession;
  records: PdfRecord[];
  order: PdfOrder;
}

// ── Helpers ─────────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtUsd(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPrice(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function conditionBadge(cond: string): string {
  let bg = '#fee2e2'; let color = '#ef4444';
  if (cond === 'M' || cond === 'NM') { bg = '#d1e7d4'; color = '#6B8F71'; }
  else if (cond === 'VG+' || cond === 'VG') { bg = '#fef3c7'; color = '#b45309'; }
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${bg};color:${color};">${esc(cond)}</span>`;
}

// ── Template ────────────────────────────────────────────────────────

export function buildSellrPdfHtml({ session, records, order }: PdfInput): string {
  const totalMedian = records.reduce((s, r) => s + (r.price_median ?? 0), 0);
  const totalLow = records.reduce((s, r) => s + (r.price_low ?? 0), 0);
  const totalHigh = records.reduce((s, r) => s + (r.price_high ?? 0), 0);
  const dateStr = fmtDate(order.created_at);

  const standouts = records
    .filter(r => (r.price_median ?? 0) >= 20)
    .sort((a, b) => (b.price_median ?? 0) - (a.price_median ?? 0))
    .slice(0, 5);

  const recordsWithAdCopy = records.filter(r => r.ad_copy);

  // ── Standout cards ────────────────────────────────────────────────
  const standoutHtml = standouts.length > 0 ? `
    <div style="margin-top:32px;">
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:20px;color:#1A1A2E;margin:0 0 16px 0;">Records Worth Noting</h2>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${standouts.map(r => `
          <div style="flex:0 0 auto;width:150px;background:#F5F0E8;border-radius:6px;padding:12px;">
            <div style="font-size:12px;font-weight:600;color:#1A1A2E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.artist)}</div>
            <div style="font-size:12px;color:#1A1A2E99;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.title)}</div>
            <div style="margin-top:8px;font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#E8A838;">${fmtPrice(r.price_median!)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // ── Records table ─────────────────────────────────────────────────
  const tableRows = records.map((r, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#F5F0E8';
    return `
      <tr style="background:${bg};">
        <td style="padding:8px 10px;font-weight:500;">${esc(r.artist)}</td>
        <td style="padding:8px 10px;color:#1A1A2E99;">${esc(r.title)}</td>
        <td style="padding:8px 10px;color:#1A1A2E80;text-align:center;">${r.year ?? '—'}</td>
        <td style="padding:8px 10px;text-align:center;">${conditionBadge(r.condition)}</td>
        <td style="padding:8px 10px;text-align:right;color:#1A1A2E99;">${r.price_median != null ? '~' + fmtPrice(r.price_median) : '—'}</td>
      </tr>
    `;
  }).join('');

  // ── Ad copy section ───────────────────────────────────────────────
  const adCopyHtml = recordsWithAdCopy.length > 0 ? `
    <div style="page-break-before:auto;margin-top:40px;">
      <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:20px;color:#1A1A2E;margin:0 0 20px 0;">Facebook Marketplace Ad Copy</h2>
      ${recordsWithAdCopy.map(r => `
        <div style="background:#F5F0E8;border-radius:6px;padding:16px 20px;margin-bottom:12px;">
          <div style="font-weight:600;font-size:13px;color:#1A1A2E;margin-bottom:6px;">${esc(r.artist)} — ${esc(r.title)}</div>
          <div style="font-size:12px;color:#1A1A2E99;line-height:1.6;white-space:pre-wrap;">${esc(r.ad_copy!)}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: #1A1A2E;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table { border-collapse: collapse; width: 100%; }
    th { text-align: left; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="margin-bottom:8px;">
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;color:#1A1A2E;margin:0;">Collection Appraisal Report</h1>
    <p style="font-size:13px;color:#1A1A2E99;margin-top:6px;">Prepared by Sellr &middot; ${esc(dateStr)}</p>
  </div>
  <hr style="border:none;border-top:1px solid #1A1A2E1A;margin:16px 0 24px 0;">

  <!-- Stats -->
  <div style="display:flex;gap:16px;margin-bottom:32px;">
    <div style="flex:1;background:#F5F0E8;border-radius:6px;padding:16px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#1A1A2E80;margin-bottom:4px;">Total Records</div>
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:26px;color:#2C4A6E;">${session.record_count}</div>
    </div>
    <div style="flex:1;background:#F5F0E8;border-radius:6px;padding:16px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#1A1A2E80;margin-bottom:4px;">Est. Collection Value</div>
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:26px;color:#2C4A6E;">${fmtUsd(totalMedian)}</div>
    </div>
    <div style="flex:1;background:#F5F0E8;border-radius:6px;padding:16px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#1A1A2E80;margin-bottom:4px;">Value Range</div>
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:26px;color:#2C4A6E;">${fmtUsd(totalLow)} — ${fmtUsd(totalHigh)}</div>
    </div>
  </div>

  ${standoutHtml}

  <!-- Full Records Table -->
  <div style="margin-top:32px;">
    <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:20px;color:#1A1A2E;margin:0 0 12px 0;">All Records</h2>
    <table>
      <thead>
        <tr style="border-bottom:1px solid #1A1A2E1A;">
          <th style="padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#1A1A2E80;font-weight:600;">Artist</th>
          <th style="padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#1A1A2E80;font-weight:600;">Title</th>
          <th style="padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#1A1A2E80;font-weight:600;text-align:center;">Year</th>
          <th style="padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#1A1A2E80;font-weight:600;text-align:center;">Condition</th>
          <th style="padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#1A1A2E80;font-weight:600;text-align:right;">Est. Value</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

  ${adCopyHtml}

  <!-- Footer -->
  <div style="margin-top:48px;padding-top:16px;border-top:1px solid #1A1A2E1A;text-align:center;font-size:11px;color:#1A1A2E66;">
    Generated by Sellr &middot; sellr.rekkrd.com &middot; ${esc(dateStr)}
  </div>
</body>
</html>`;
}
