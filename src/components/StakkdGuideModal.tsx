import React, { useRef, useCallback, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import '../styles/stakkd-theme.css';

interface StakkdGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'quickstart' | 'features' | 'tips';

const StakkdGuideModal: React.FC<StakkdGuideModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const [activeTab, setActiveTab] = useState<Tab>('quickstart');

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Stakkd Guide"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-2 md:p-6 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div
        className="stakkd-modal relative w-full max-w-3xl max-h-[98vh] md:max-h-[95vh] rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500"
        style={{ background: 'var(--sk-bg)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-sk-bg/80 text-sk-text flex items-center justify-center hover:bg-sk-text hover:text-sk-bg transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">

          {/* Hero */}
          <div className="stakkd-hero">
            <div className="stakkd-hero-eyebrow">// Rekkrd Stakkd</div>
            <h1>Catalog Your<br /><em>Audio Gear</em></h1>
            <p className="stakkd-hero-sub">AI-powered gear identification, signal chain visualization, and setup guides for your audio equipment.</p>
          </div>

          {/* Tab navigation */}
          <div className="stakkd-tab-wrapper">
            <div className="stakkd-tab-nav">
              <button className={`stakkd-tab-btn${activeTab === 'quickstart' ? ' active' : ''}`} onClick={() => setActiveTab('quickstart')}>
                Quick Start
              </button>
              <button className={`stakkd-tab-btn${activeTab === 'features' ? ' active' : ''}`} onClick={() => setActiveTab('features')}>
                Features
              </button>
              <button className={`stakkd-tab-btn${activeTab === 'tips' ? ' active' : ''}`} onClick={() => setActiveTab('tips')}>
                Tips &amp; FAQ
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="stakkd-content">

            {/* ══════════════════════════════════
                TAB 1: QUICK START
            ══════════════════════════════════ */}
            <div className={`stakkd-panel${activeTab === 'quickstart' ? ' active' : ''}`}>
              <div className="stakkd-eyebrow">// Getting Started</div>
              <h2>Stakkd<br /><em>Quick Start</em></h2>
              <p>Stakkd lets you build a complete catalog of your audio equipment. Add your turntable, amplifier, speakers, and everything in between — then get AI-powered setup guides and signal chain analysis for your specific gear combo.</p>

              <h3>Adding Your First Piece of Gear</h3>
              <p>Click the <strong>Add Gear</strong> button and follow these steps to catalog your first piece of equipment.</p>

              <div className="stakkd-step-list">
                <div className="stakkd-step-item">
                  <div className="stakkd-step-number">1</div>
                  <div className="stakkd-step-content">
                    <h4>Choose Your Method</h4>
                    <p>Pick <strong>Scan</strong> (camera), <strong>Upload</strong> (photo from library), or <strong>Manual Entry</strong> (type it in). Manual entry is recommended for the most precise results.</p>
                  </div>
                </div>
                <div className="stakkd-step-item">
                  <div className="stakkd-step-number">2</div>
                  <div className="stakkd-step-content">
                    <h4>Capture or Enter Details</h4>
                    <p>If scanning, photograph the front panel where the brand and model are visible. For manual entry, select a category and type the brand and model name.</p>
                  </div>
                </div>
                <div className="stakkd-step-item">
                  <div className="stakkd-step-number">3</div>
                  <div className="stakkd-step-content">
                    <h4>Review AI-Identified Details</h4>
                    <p>If you scanned or uploaded a photo, review the AI-identified brand, model, year, and specs. Edit anything that looks off before saving.</p>
                  </div>
                </div>
                <div className="stakkd-step-item">
                  <div className="stakkd-step-number">4</div>
                  <div className="stakkd-step-content">
                    <h4>Add Personal Info</h4>
                    <p>Optionally add your purchase price, purchase date, and any personal notes. This info is private to you.</p>
                  </div>
                </div>
                <div className="stakkd-step-item">
                  <div className="stakkd-step-number">5</div>
                  <div className="stakkd-step-content">
                    <h4>Save &amp; Repeat</h4>
                    <p>Hit Save and your gear appears in your Stakkd. Add the rest of your equipment to build out your full signal chain.</p>
                  </div>
                </div>
              </div>

              <div className="stakkd-callout stakkd-callout-tip">
                <div className="stakkd-callout-icon">💡</div>
                <p><strong>Pro tip:</strong> Manual entry works best for vintage gear or equipment without clear branding on the front panel. You can always add a photo later from the detail view.</p>
              </div>

              <div className="stakkd-cta">
                <h3>Ready to Build Your Stakkd?</h3>
                <p>Add your first piece of gear and start cataloging your audio setup.</p>
                <button onClick={onClose} className="stakkd-btn-primary">Back to Stakkd</button>
              </div>
            </div>

            {/* ══════════════════════════════════
                TAB 2: FEATURES
            ══════════════════════════════════ */}
            <div className={`stakkd-panel${activeTab === 'features' ? ' active' : ''}`}>
              <div className="stakkd-eyebrow">// Feature Guide</div>
              <h2>Understanding<br /><em>Stakkd Features</em></h2>
              <p>Stakkd goes beyond a simple gear list. Here&apos;s what each feature does and how to get the most out of it.</p>

              <h3>AI Identification</h3>
              <p>When you scan or upload a photo of your equipment, Gemini Vision analyzes the image to identify the <strong>brand</strong>, <strong>model</strong>, <strong>year</strong>, <strong>category</strong>, and <strong>technical specs</strong>. For best results, photograph the front panel where branding and controls are visible.</p>
              <p>If your gear is found in the <strong>Stakkd catalog</strong>, you&apos;ll see a &ldquo;Found in catalog&rdquo; badge — meaning the specs are verified against our curated database.</p>

              <h3>Signal Chain</h3>
              <p>Your gear is automatically organized in signal flow order: <strong>source</strong> (turntable) → <strong>processing</strong> (phono preamp, DAC) → <strong>amplification</strong> (amp, receiver) → <strong>output</strong> (speakers, headphones). This mirrors the physical path audio takes through your system.</p>
              <p>Drag and drop to reorder on desktop, or use the arrow buttons on mobile. For a deep dive into signal chains and how they work, check out the <strong>Signal Chain Guide</strong> button in the Stakkd header.</p>

              <h3>Setup Guides</h3>
              <div className="stakkd-callout stakkd-callout-warning">
                <div className="stakkd-callout-icon">⭐</div>
                <p><strong>Curator+ feature:</strong> Setup guides require a Curator or Enthusiast subscription.</p>
              </div>
              <p>With 2 or more pieces of gear, click <strong>How to Connect</strong> to generate an AI-powered setup guide. It provides:</p>
              <div className="stakkd-info-grid">
                <div className="stakkd-info-card">
                  <div className="stakkd-info-card-icon">🔌</div>
                  <h4>Wiring Instructions</h4>
                  <p>Step-by-step connections with cable types (RCA, speaker wire, optical, etc.).</p>
                </div>
                <div className="stakkd-info-card">
                  <div className="stakkd-info-card-icon">⚙️</div>
                  <h4>Recommended Settings</h4>
                  <p>Per-component settings like gain, input selector, and impedance matching.</p>
                </div>
                <div className="stakkd-info-card">
                  <div className="stakkd-info-card-icon">💡</div>
                  <h4>Tips &amp; Warnings</h4>
                  <p>Speaker placement, break-in advice, and compatibility warnings for your combo.</p>
                </div>
              </div>

              <h3>Manual Finder</h3>
              <div className="stakkd-callout stakkd-callout-warning">
                <div className="stakkd-callout-icon">⭐</div>
                <p><strong>Curator+ feature:</strong> Manual finder requires a Curator or Enthusiast subscription.</p>
              </div>
              <p>Lost your equipment manual? Open any gear detail view and click <strong>Find Manual</strong>. AI will search for the PDF and show you results with a confidence level. High-confidence matches are auto-saved. You can also upload your own PDF manuals (up to 25 MB).</p>

              <h3>Chain Insights</h3>
              <p>The chain insights panel analyzes your signal chain and rates its quality:</p>
              <div className="stakkd-info-grid">
                <div className="stakkd-info-card">
                  <div className="stakkd-info-card-icon">🟢</div>
                  <h4>Excellent</h4>
                  <p>Complete chain with no compatibility issues detected.</p>
                </div>
                <div className="stakkd-info-card">
                  <div className="stakkd-info-card-icon">🔵</div>
                  <h4>Good</h4>
                  <p>Working chain with minor recommendations for improvement.</p>
                </div>
                <div className="stakkd-info-card">
                  <div className="stakkd-info-card-icon">🟡</div>
                  <h4>Needs Attention</h4>
                  <p>Potential issues like impedance mismatches or missing components.</p>
                </div>
                <div className="stakkd-info-card">
                  <div className="stakkd-info-card-icon">🔴</div>
                  <h4>Incomplete</h4>
                  <p>Key components missing — e.g., no amp between preamp and speakers.</p>
                </div>
              </div>

              <div className="stakkd-cta">
                <h3>Explore Your Gear</h3>
                <p>Tap any piece of gear to view full details, edit specs, upload manuals, and more.</p>
                <button onClick={onClose} className="stakkd-btn-primary">Back to Stakkd</button>
              </div>
            </div>

            {/* ══════════════════════════════════
                TAB 3: TIPS & FAQ
            ══════════════════════════════════ */}
            <div className={`stakkd-panel${activeTab === 'tips' ? ' active' : ''}`}>
              <div className="stakkd-eyebrow">// Pro Tips</div>
              <h2>Tips &amp;<br /><em>FAQ</em></h2>
              <p>Common questions and pro tips to get the most out of Stakkd.</p>

              <h3>Frequently Asked Questions</h3>

              <div className="stakkd-faq-item">
                <div className="stakkd-faq-q">How many pieces of gear can I add?</div>
                <p className="stakkd-faq-a">Free accounts can add up to 5 pieces. Curator and Enthusiast plans have no limit — add your entire setup.</p>
              </div>

              <div className="stakkd-faq-item">
                <div className="stakkd-faq-q">Can I reorder my gear?</div>
                <p className="stakkd-faq-a">Yes! When sorted by Signal Chain, you can drag and drop on desktop or use the arrow buttons on mobile to arrange your gear in the exact order of your signal path.</p>
              </div>

              <div className="stakkd-faq-item">
                <div className="stakkd-faq-q">What if AI doesn&apos;t identify my gear?</div>
                <p className="stakkd-faq-a">Use Manual Entry instead. This works well for vintage equipment, DIY builds, or gear without visible branding. You can always add a photo later from the detail view.</p>
              </div>

              <div className="stakkd-faq-item">
                <div className="stakkd-faq-q">How accurate is AI identification?</div>
                <p className="stakkd-faq-a">It works best with clear, well-lit photos of the front panel where the brand name and model number are visible. Back-panel labels and model stickers also help. Always review and edit the results before saving.</p>
              </div>

              <div className="stakkd-faq-item">
                <div className="stakkd-faq-q">What are setup guides?</div>
                <p className="stakkd-faq-a">AI-generated wiring instructions, recommended settings, and tips customized for your exact combination of equipment. They require at least 2 pieces of gear and a Curator+ subscription.</p>
              </div>

              <div className="stakkd-faq-item">
                <div className="stakkd-faq-q">Can I upload equipment manuals?</div>
                <p className="stakkd-faq-a">Yes. Open any gear detail view and use the manual upload button. PDFs up to 25 MB are supported. You can also link to external manual URLs.</p>
              </div>

              <div className="stakkd-divider" style={{ margin: '2rem 0' }} />

              <h3>Pro Tips</h3>

              <div className="stakkd-callout stakkd-callout-tip">
                <div className="stakkd-callout-icon">💡</div>
                <p><strong>Add gear in signal chain order</strong> for the best chain analysis results. Start with your turntable, then preamp, amp, and speakers. The insights panel works better with a complete chain.</p>
              </div>

              <div className="stakkd-callout stakkd-callout-tip">
                <div className="stakkd-callout-icon">💡</div>
                <p><strong>Use manual entry for vintage gear</strong> without visible branding or model numbers. You can type in the exact brand and model, then add a photo later for your records.</p>
              </div>

              <div className="stakkd-callout stakkd-callout-tip">
                <div className="stakkd-callout-icon">💡</div>
                <p><strong>Check chain insights</strong> after adding new gear. The analysis detects missing components (like a phono preamp between your turntable and amp) and flags compatibility warnings.</p>
              </div>

              <div className="stakkd-callout stakkd-callout-tip">
                <div className="stakkd-callout-icon">💡</div>
                <p><strong>Download setup guides as PDF</strong> for reference when you&apos;re physically connecting your gear. Much easier than scrolling on your phone behind a rack of equipment.</p>
              </div>

              <div className="stakkd-cta">
                <h3>Your Gear, Documented</h3>
                <p>Build your complete audio equipment catalog and get the most out of every piece.</p>
                <button onClick={onClose} className="stakkd-btn-primary">Back to Stakkd</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StakkdGuideModal;
