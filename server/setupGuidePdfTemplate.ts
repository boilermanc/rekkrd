// ── Setup Guide PDF Template ────────────────────────────────────────
// Returns a self-contained HTML string (inline CSS only) for Puppeteer
// to render as a printable PDF.

interface SetupGuide {
  signal_chain: string[];
  connections: Array<{ from: string; to: string; cable_type: string; connection_type: string; notes: string }>;
  settings: Array<{ gear: string; setting: string; recommended_value: string; explanation: string }>;
  tips: string[];
  warnings: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Build HTML ──────────────────────────────────────────────────────

export function buildSetupGuidePdfHtml(guide: SetupGuide, gearName: string): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Warnings section ──
  let warningsHtml = '';
  if (guide.warnings.length > 0) {
    warningsHtml = `
      <div class="section">
        <h3 class="section-title">⚠ Heads Up</h3>
        ${guide.warnings.map(w => `
          <div class="warning-card">${esc(w)}</div>
        `).join('')}
      </div>
    `;
  }

  // ── Signal Chain section ──
  let signalChainHtml = '';
  if (guide.signal_chain.length > 0) {
    signalChainHtml = `
      <div class="section">
        <h3 class="section-title">Signal Chain</h3>
        <div class="chain-list">
          ${guide.signal_chain.map((item, i) => `
            <div class="chain-item">
              <span class="chain-num">${i + 1}</span>
              <span class="chain-label">${esc(item)}</span>
            </div>
            ${i < guide.signal_chain.length - 1 ? '<div class="chain-arrow">↓</div>' : ''}
          `).join('')}
        </div>
      </div>
    `;
  }

  // ── Connections section ──
  let connectionsHtml = '';
  if (guide.connections.length > 0) {
    connectionsHtml = `
      <div class="section">
        <h3 class="section-title">Connections</h3>
        ${guide.connections.map(conn => `
          <div class="conn-card">
            <div class="conn-header">
              <span class="conn-endpoint">${esc(conn.from)}</span>
              <span class="conn-arrow">→</span>
              <span class="conn-endpoint">${esc(conn.to)}</span>
            </div>
            <div class="conn-meta">
              <span class="conn-cable">${esc(conn.cable_type)}</span>
              <span class="conn-type">${esc(conn.connection_type)}</span>
            </div>
            ${conn.notes ? `<p class="conn-notes">${esc(conn.notes)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // ── Settings section ──
  let settingsHtml = '';
  if (guide.settings.length > 0) {
    settingsHtml = `
      <div class="section">
        <h3 class="section-title">Recommended Settings</h3>
        <table class="settings-table">
          <thead>
            <tr>
              <th>Gear</th>
              <th>Setting</th>
              <th>Value</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            ${guide.settings.map((s, i) => `
              <tr class="${i % 2 === 1 ? 'alt-row' : ''}">
                <td class="td-gear">${esc(s.gear)}</td>
                <td>${esc(s.setting)}</td>
                <td class="td-value">${esc(s.recommended_value)}</td>
                <td class="td-why">${esc(s.explanation)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ── Tips section ──
  let tipsHtml = '';
  if (guide.tips.length > 0) {
    tipsHtml = `
      <div class="section">
        <h3 class="section-title">Tips</h3>
        <div class="tips-list">
          ${guide.tips.map(tip => `
            <div class="tip-item">
              <span class="tip-icon">💡</span>
              <span>${esc(tip)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: A4;
      margin: 20mm;
    }

    body {
      background: #0f0f1a;
      color: #e8e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Header ── */
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(221, 110, 66, 0.25);
    }

    .logo-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #dd6e42;
      color: #0f0f1a;
      font-family: 'Playfair Display', serif;
      font-weight: 700;
      font-size: 24px;
      margin-bottom: 8px;
    }

    .wordmark {
      display: block;
      font-size: 9px;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      color: #f0a882;
      margin-bottom: 20px;
    }

    .header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      color: #e8e8f0;
      margin-bottom: 6px;
    }

    .header .subtitle {
      font-size: 14px;
      color: #f0a882;
      font-weight: 600;
    }

    .header .date {
      font-size: 10px;
      color: rgba(232, 232, 240, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-top: 8px;
    }

    /* ── Sections ── */
    .section {
      margin-bottom: 28px;
    }

    .section-title {
      font-size: 10px;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: rgba(232, 232, 240, 0.5);
      margin-bottom: 12px;
      font-weight: 600;
    }

    /* ── Warnings ── */
    .warning-card {
      background: rgba(26, 26, 46, 0.7);
      border-left: 3px solid #f59e0b;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 8px;
      font-size: 13px;
      color: rgba(232, 232, 240, 0.8);
      line-height: 1.5;
    }

    /* ── Signal Chain ── */
    .chain-list {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    .chain-item {
      background: #1a1a2e;
      border: 1px solid rgba(232, 232, 240, 0.06);
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .chain-num {
      color: #dd6e42;
      font-weight: 700;
      font-size: 12px;
      min-width: 18px;
      text-align: center;
    }

    .chain-label {
      font-weight: 500;
      font-size: 13px;
    }

    .chain-arrow {
      text-align: center;
      color: rgba(232, 232, 240, 0.2);
      font-size: 14px;
      padding: 2px 0;
    }

    /* ── Connections ── */
    .conn-card {
      background: #1a1a2e;
      border: 1px solid rgba(232, 232, 240, 0.06);
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }

    .conn-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .conn-endpoint {
      font-weight: 700;
      font-size: 13px;
    }

    .conn-arrow {
      color: #dd6e42;
      font-weight: 700;
    }

    .conn-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }

    .conn-cable {
      display: inline-block;
      background: rgba(221, 110, 66, 0.15);
      border: 1px solid rgba(221, 110, 66, 0.25);
      color: #f0a882;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      padding: 2px 8px;
      border-radius: 12px;
    }

    .conn-type {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: rgba(232, 232, 240, 0.4);
    }

    .conn-notes {
      font-size: 12px;
      color: rgba(232, 232, 240, 0.5);
      line-height: 1.5;
      margin-top: 4px;
    }

    /* ── Settings table ── */
    .settings-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 10px;
      overflow: hidden;
      background: #1a1a2e;
      border: 1px solid rgba(232, 232, 240, 0.06);
    }

    .settings-table th {
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: rgba(232, 232, 240, 0.5);
      padding: 10px 12px;
      background: rgba(221, 110, 66, 0.08);
      border-bottom: 1px solid rgba(232, 232, 240, 0.06);
      font-weight: 600;
    }

    .settings-table td {
      padding: 10px 12px;
      font-size: 12px;
      vertical-align: top;
      border-bottom: 1px solid rgba(232, 232, 240, 0.04);
    }

    .settings-table tr:last-child td {
      border-bottom: none;
    }

    .alt-row {
      background: rgba(232, 232, 240, 0.02);
    }

    .td-gear {
      font-weight: 700;
      color: #e8e8f0;
      white-space: nowrap;
    }

    .td-value {
      color: #f0a882;
      font-weight: 700;
      white-space: nowrap;
    }

    .td-why {
      color: rgba(232, 232, 240, 0.5);
      font-size: 11px;
      line-height: 1.5;
    }

    /* ── Tips ── */
    .tips-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .tip-item {
      display: flex;
      gap: 10px;
      font-size: 13px;
      color: rgba(232, 232, 240, 0.7);
      line-height: 1.5;
    }

    .tip-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* ── Footer ── */
    .footer {
      text-align: center;
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid rgba(232, 232, 240, 0.08);
      font-size: 10px;
      color: rgba(232, 232, 240, 0.3);
      letter-spacing: 0.1em;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="logo-mark">R</div>
    <span class="wordmark">REKKRD</span>
    <h1>Setup Guide</h1>
    <p class="subtitle">${esc(gearName)}</p>
    <p class="date">Generated ${esc(date)}</p>
  </div>

  ${warningsHtml}
  ${signalChainHtml}
  ${connectionsHtml}
  ${settingsHtml}
  ${tipsHtml}

  <div class="footer">Generated by Rekkrd · rekkrd.com</div>

</body>
</html>`;
}
