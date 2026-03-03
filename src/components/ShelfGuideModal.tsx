import React, { useRef, useCallback, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './ShelfGuideModal.css';

interface ShelfGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'quickstart' | 'shelfview' | 'tips';

const ShelfGuideModal: React.FC<ShelfGuideModalProps> = ({ isOpen, onClose }) => {
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
      aria-label="Shelf Organizer Guide"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-2 md:p-6 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div
        className="sog-modal relative w-full max-w-3xl max-h-[98vh] md:max-h-[95vh] rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500"
        style={{ background: '#1a2528' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-[#1a2528]/80 text-[#e8e2d6] flex items-center justify-center hover:bg-[#e8e2d6] hover:text-[#1a2528] transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">

          {/* Hero */}
          <div className="sog-hero">
            <div className="sog-hero-eyebrow">// Rekkrd Shelf Organizer</div>
            <h1>Organize Your<br /><em>Vinyl Shelves</em></h1>
            <p className="sog-hero-sub">Map your digital collection to your physical shelves. Smart sorting, drag-and-drop placement, and intelligent rebalancing.</p>
          </div>

          {/* Tab navigation */}
          <div className="sog-tab-wrapper">
            <div className="sog-tab-nav">
              <button className={`sog-tab-btn${activeTab === 'quickstart' ? ' active' : ''}`} onClick={() => setActiveTab('quickstart')}>
                Quick Start
              </button>
              <button className={`sog-tab-btn${activeTab === 'shelfview' ? ' active' : ''}`} onClick={() => setActiveTab('shelfview')}>
                Shelf View Guide
              </button>
              <button className={`sog-tab-btn${activeTab === 'tips' ? ' active' : ''}`} onClick={() => setActiveTab('tips')}>
                Tips &amp; FAQ
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="sog-content">

            {/* ══════════════════════════════════
                TAB 1: QUICK START
            ══════════════════════════════════ */}
            <div className={`sog-panel${activeTab === 'quickstart' ? ' active' : ''}`}>
              <div className="sog-eyebrow">// Getting Started</div>
              <h2>Shelf Organizer<br /><em>Quick Start</em></h2>
              <p>The Shelf Organizer lets you mirror your real-world vinyl storage inside Rekkrd. Define your physical shelves, choose how you want your records sorted, and let the app figure out exactly where each album belongs. Then fine-tune with drag-and-drop.</p>

              <h3>Setting Up Your First Shelf</h3>
              <p>Head to the <strong>Setup</strong> tab and follow these steps to get your first shelf configured in under a minute.</p>

              <div className="sog-step-list">
                <div className="sog-step-item">
                  <div className="sog-step-number">1</div>
                  <div className="sog-step-content">
                    <h4>Name Your Shelf</h4>
                    <p>Give it a name that matches your real furniture — e.g., "IKEA Kallax 4x4", "Living Room Shelf", or "Garage Crates".</p>
                  </div>
                </div>
                <div className="sog-step-item">
                  <div className="sog-step-number">2</div>
                  <div className="sog-step-content">
                    <h4>Set Your Sections</h4>
                    <p>How many separate compartments or cubes does your shelf have? A standard Kallax 4x4 has 16 cubes. A simple bookshelf might have 3-4 shelves.</p>
                  </div>
                </div>
                <div className="sog-step-item">
                  <div className="sog-step-number">3</div>
                  <div className="sog-step-content">
                    <h4>Set Capacity Per Section</h4>
                    <p>How many records fit in each section? A standard Kallax cube holds about <strong>50-60 records</strong>. Wider shelves may hold more.</p>
                  </div>
                </div>
                <div className="sog-step-item">
                  <div className="sog-step-number">4</div>
                  <div className="sog-step-content">
                    <h4>Click "Add Shelf"</h4>
                    <p>Your shelf is created. You'll see it appear with a capacity bar showing how much space you have.</p>
                  </div>
                </div>
                <div className="sog-step-item">
                  <div className="sog-step-number">5</div>
                  <div className="sog-step-content">
                    <h4>Choose a Sort Scheme</h4>
                    <p>Pick how you want records organized on your shelf. Options include A-Z by Artist, Genre then Artist, Oldest/Newest First, Date Added, or Custom (manual order).</p>
                  </div>
                </div>
              </div>

              <div className="sog-callout sog-callout-tip">
                <div className="sog-callout-icon">💡</div>
                <p><strong>Pro tip:</strong> Most IKEA Kallax cubes hold about 50-60 standard 12" vinyl records, depending on sleeve thickness. If you're using outer sleeves, aim for 45-50 per cube.</p>
              </div>

              <h3>Viewing Your Shelf</h3>
              <p>Once you've set up a shelf and chosen a sort scheme, switch to the <strong>Shelf View</strong> tab. Your entire collection will be automatically distributed across your shelf sections based on your chosen sort order. Each section shows exactly which albums belong there — so you can organize your physical shelves to match.</p>

              <div className="sog-cta">
                <h3>Ready to Organize?</h3>
                <p>Head to the Setup tab, add your first shelf, and watch your collection fall into place.</p>
                <button onClick={onClose} className="sog-btn-primary">Back to Shelves</button>
              </div>
            </div>

            {/* ══════════════════════════════════
                TAB 2: SHELF VIEW GUIDE
            ══════════════════════════════════ */}
            <div className={`sog-panel${activeTab === 'shelfview' ? ' active' : ''}`}>
              <div className="sog-eyebrow">// Shelf View Features</div>
              <h2>Understanding<br /><em>Shelf View</em></h2>
              <p>Shelf View is where the magic happens. It shows you a visual breakdown of every section in your shelf, with your albums distributed and ready for drag-and-drop fine-tuning.</p>

              <h3>How Records Are Distributed</h3>
              <p>When you open Shelf View, your albums are automatically sorted using your chosen sort scheme (e.g., A→Z by Artist) and distributed evenly across your shelf sections. The first batch of albums fills Section 1, the next fills Section 2, and so on — up to each section's capacity.</p>

              <div className="sog-callout sog-callout-warning">
                <div className="sog-callout-icon">⚠️</div>
                <p><strong>Capacity matters:</strong> If your total collection exceeds your shelf's total capacity, overflow albums will be placed in the last section. You'll see a red warning banner when any section is over capacity.</p>
              </div>

              <h3>Drag &amp; Drop</h3>
              <p>Want a specific album in a different section? Just grab the <strong>grip handle</strong> (the six-dot icon on the left of each album row) and drag it to a different section. Drop it where you want it, and the assignment is saved immediately.</p>
              <p>When you manually move an album, it gets <strong>pinned</strong> to that section — meaning it won't be moved if you rebalance later. A small pin icon appears next to pinned albums.</p>

              <h3>Pinning &amp; Unpinning</h3>
              <p>Pinned albums stay exactly where you put them, even during a rebalance. This is perfect for albums you always want in a specific spot — like your most-played records near the turntable.</p>
              <p>To <strong>unpin</strong> an album, click the pin icon next to it, or right-click the album row. You can also use the <strong>Clear All Pins</strong> button to unpin everything at once and start fresh.</p>

              <h3>Capacity Indicators</h3>
              <p>Each section header shows a color-coded capacity bar:</p>

              <div className="sog-info-grid">
                <div className="sog-info-card">
                  <div className="sog-info-card-icon">🟢</div>
                  <h4>Green (Under 80%)</h4>
                  <p>Section has plenty of room. No action needed.</p>
                </div>
                <div className="sog-info-card">
                  <div className="sog-info-card-icon">🟡</div>
                  <h4>Yellow (80-95%)</h4>
                  <p>Getting full. A yellow warning appears in the section header.</p>
                </div>
                <div className="sog-info-card">
                  <div className="sog-info-card-icon">🔴</div>
                  <h4>Red (Over 95%)</h4>
                  <p>Over capacity. A red banner warns you this section is too full.</p>
                </div>
              </div>

              <h3>Rebalancing</h3>
              <p>Over time, your shelf sections can become unbalanced — some too full, others half-empty. The <strong>Rebalance</strong> button appears when the system detects an uneven distribution.</p>
              <p>When you click Rebalance, the app generates a move plan that shows you:</p>
              <ul style={{ color: '#a8b8bc', paddingLeft: '1.5rem', marginBottom: '1.5rem', lineHeight: 1.8 }}>
                <li>A <strong>before and after</strong> distribution chart</li>
                <li>A list of every album that needs to move</li>
                <li>Which section each album is moving from and to</li>
              </ul>
              <p><strong>Pinned albums never move during a rebalance.</strong> The algorithm only redistributes unpinned albums, keeping your manual placements intact.</p>

              <div className="sog-cta">
                <h3>Start Organizing</h3>
                <p>Switch to Shelf View and drag your albums into the perfect arrangement.</p>
                <button onClick={onClose} className="sog-btn-primary">Back to Shelves</button>
              </div>
            </div>

            {/* ══════════════════════════════════
                TAB 3: TIPS & FAQ
            ══════════════════════════════════ */}
            <div className={`sog-panel${activeTab === 'tips' ? ' active' : ''}`}>
              <div className="sog-eyebrow">// Pro Tips</div>
              <h2>Tips &amp;<br /><em>FAQ</em></h2>
              <p>Common questions and pro tips to get the most out of the Shelf Organizer.</p>

              <h3>Frequently Asked Questions</h3>

              <div className="sog-faq-item">
                <div className="sog-faq-q">How many records fit in a Kallax cube?</div>
                <p className="sog-faq-a">A standard IKEA Kallax cube (13" x 13") holds about 50-60 standard 12" vinyl records. With thicker outer sleeves, plan for 45-50. Set your capacity per section accordingly.</p>
              </div>

              <div className="sog-faq-item">
                <div className="sog-faq-q">Can I have multiple shelves?</div>
                <p className="sog-faq-a">Yes! Add as many shelves as you have in your space. In Shelf View, use the shelf selector chips at the top to switch between them. Each shelf has its own sections and capacity.</p>
              </div>

              <div className="sog-faq-item">
                <div className="sog-faq-q">What does "Custom" sort mean?</div>
                <p className="sog-faq-a">Custom sort preserves whatever order you've arranged your albums in via drag-and-drop. The system won't re-sort them — your manual order is the sort order.</p>
              </div>

              <div className="sog-faq-item">
                <div className="sog-faq-q">Why can't I drag albums between sections?</div>
                <p className="sog-faq-a">Drag-and-drop requires at least two sections. If your shelf has only one section, there's nowhere to drag albums to. Edit your shelf in Setup to add more sections.</p>
              </div>

              <div className="sog-faq-item">
                <div className="sog-faq-q">How do I start over?</div>
                <p className="sog-faq-a">Delete the shelf in the Setup tab and create a new one. This clears all album assignments for that shelf. Your albums are not affected — they stay in your collection.</p>
              </div>

              <div className="sog-faq-item">
                <div className="sog-faq-q">Do shelf assignments affect my collection?</div>
                <p className="sog-faq-a">No. Shelf assignments are purely organizational metadata. Your albums, artwork, and details are never changed by the Shelf Organizer.</p>
              </div>

              <div className="sog-divider" style={{ margin: '2rem 0' }} />

              <h3>Pro Tips</h3>

              <div className="sog-callout sog-callout-tip">
                <div className="sog-callout-icon">💡</div>
                <p><strong>Label your physical shelves</strong> with section numbers (1, 2, 3...) to match the app. Use small stickers or tape on the shelf edge. This makes it easy to find albums in real life.</p>
              </div>

              <div className="sog-callout sog-callout-tip">
                <div className="sog-callout-icon">💡</div>
                <p><strong>Use "Genre, then Artist"</strong> sort if you like browsing by mood. All your jazz records end up together, all your rock in another section — and within each genre, artists are alphabetical.</p>
              </div>

              <div className="sog-callout sog-callout-tip">
                <div className="sog-callout-icon">💡</div>
                <p><strong>Pin your most-played records</strong> to sections near your turntable or at eye level. This keeps your favorites in easy reach, even after a rebalance.</p>
              </div>

              <div className="sog-callout sog-callout-tip">
                <div className="sog-callout-icon">💡</div>
                <p><strong>Leave 10-15% headroom</strong> in each section. This makes it easier to flip through records and leaves space for new additions without triggering capacity warnings.</p>
              </div>

              <div className="sog-cta">
                <h3>Happy Organizing!</h3>
                <p>Your shelves, your way. Organize once, enjoy forever.</p>
                <button onClick={onClose} className="sog-btn-primary">Back to Shelves</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ShelfGuideModal;
